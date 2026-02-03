/**
 * Entity extraction from prose using LLM
 *
 * Features:
 * - Multi-stage JSON parsing with repair and salvage
 * - Provenance tracking for each entity
 * - bad-chunks.jsonl for failed chunk diagnostics
 * - Summary output with parse statistics
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { LLMProvider } from '../llm/provider.js';
import type { NodeType } from '../core/types/index.js';
import { parseJSONWithFallbacks, type ParseMode } from './json-parser.js';

// ============================================================================
// Types
// ============================================================================

export interface ExtractedEntity {
  name: string;
  type: NodeType;
  aliases: string[];
  description: string;
  mentions: number;
  // Provenance fields
  parseMode: ParseMode;
  chunkIndex: number;
  islandIndex?: number | undefined;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  scenes: Array<{
    title: string;
    summary: string;
    startOffset: number;
    endOffset: number;
    entities: string[];
  }>;
  stats: ChunkStats;
  badChunksPath?: string | undefined;
}

export interface EntityExtractorOptions {
  llmProvider: LLMProvider;
  chunkSize?: number;
  overlapSize?: number;
  maxTokens?: number;
  outputDir?: string; // For bad-chunks.jsonl
  verbose?: boolean;
  quiet?: boolean;
}

interface ChunkStats {
  total: number;
  strict: number;
  repaired: number;
  salvaged: number;
  parsedEmpty: number;
  failed: number;
  entitiesByType: Record<string, number>;
  entitiesByMode: Record<ParseMode, number>;
}

interface BadChunkRecord {
  chunkIndex: number;
  phase: ParseMode;
  error: string;
  errors?: Partial<Record<ParseMode, string>> | undefined;
  rawSnippet: string;
  repairedSnippet?: string | undefined;
  attemptedRepair: boolean;
  islandsFound: number;
  model: string;
  extractorVersion: string;
  timestamp: string;
}

interface RawExtractionResponse {
  characters?: unknown[];
  locations?: unknown[];
  objects?: unknown[];
  events?: unknown[];
}

// ============================================================================
// Constants
// ============================================================================

const VERSION = '0.4.2';

const EXTRACTION_PROMPT = `You are an entity extractor for fiction manuscripts. Analyze the following text and extract all named entities.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "characters": [
    {"name": "Full Name", "aliases": ["nickname", "title"], "description": "brief description"}
  ],
  "locations": [
    {"name": "Location Name", "aliases": [], "description": "brief description"}
  ],
  "objects": [
    {"name": "Object Name", "aliases": [], "description": "why it's significant"}
  ],
  "events": [
    {"name": "Event Name", "aliases": [], "description": "what happened"}
  ]
}

Rules:
- Characters include people, animals, personified objects (like stuffed animals with names)
- Locations include rooms, buildings, cities, any named place
- Objects include significant items mentioned multiple times or plot-relevant
- For aliases, include nicknames, titles, pronouns-as-names ("Mom" vs "mother")
- Keep descriptions to one sentence
- Only include entities that are NAMED or clearly identifiable
- Do NOT include generic references ("the door" unless it's "the basement door" as a specific thing)

TEXT TO ANALYZE:
`;

// Reserved for future LLM-based scene detection
export const SCENE_EXTRACTION_PROMPT = `Analyze this text and identify distinct scenes or chapters. A scene is a continuous unit of action in one location/time.

Return ONLY valid JSON (no markdown):
{
  "scenes": [
    {
      "title": "Brief scene title",
      "summary": "One sentence summary",
      "characters": ["Character names present"],
      "locations": ["Location names"],
      "startMarker": "First few words of scene",
      "endMarker": "Last few words of scene"
    }
  ]
}

TEXT:
`;

// ============================================================================
// Schema Validation
// ============================================================================

function isValidExtractionResponse(candidate: unknown): candidate is RawExtractionResponse {
  if (typeof candidate !== 'object' || candidate === null) return false;
  const obj = candidate as Record<string, unknown>;

  const allowedKeys = ['characters', 'locations', 'objects', 'events'];
  for (const key of allowedKeys) {
    if (key in obj && !Array.isArray(obj[key])) return false;
  }

  // Must have at least one non-empty array
  return allowedKeys.some((key) => Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0);
}

function isValidEntity(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const candidate = obj as Record<string, unknown>;
  return typeof candidate.name === 'string' && candidate.name.trim().length > 0;
}

// ============================================================================
// Normalization
// ============================================================================

function normalizeAliases(raw: unknown): string[] {
  let aliases: string[];

  if (typeof raw === 'string') {
    aliases = [raw.trim()];
  } else if (Array.isArray(raw)) {
    aliases = raw.filter((s) => typeof s === 'string').map((s) => (s as string).trim());
  } else {
    aliases = [];
  }

  // Filter empties and dedupe (case-insensitive)
  const seen = new Set<string>();
  return aliases.filter((a) => {
    if (!a) return false;
    const lower = a.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

function normalizeDescription(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

// ============================================================================
// Entity Extractor
// ============================================================================

export class EntityExtractor {
  private llm: LLMProvider;
  private chunkSize: number;
  private overlapSize: number;
  private maxTokens: number;
  private outputDir: string;
  private verbose: boolean;
  private quiet: boolean;

  constructor(options: EntityExtractorOptions) {
    this.llm = options.llmProvider;
    this.chunkSize = options.chunkSize ?? 8000;
    this.overlapSize = options.overlapSize ?? 500;
    this.maxTokens = options.maxTokens ?? 4096;
    this.outputDir = options.outputDir ?? process.cwd();
    this.verbose = options.verbose ?? false;
    this.quiet = options.quiet ?? false;
  }

  /**
   * Extract entities from a full manuscript
   */
  async extractFromText(
    text: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<ExtractionResult> {
    const chunks = this.chunkText(text);
    const allEntities = new Map<string, ExtractedEntity>();
    const badChunks: BadChunkRecord[] = [];

    const stats: ChunkStats = {
      total: chunks.length,
      strict: 0,
      repaired: 0,
      salvaged: 0,
      parsedEmpty: 0,
      failed: 0,
      entitiesByType: {},
      entitiesByMode: { strict: 0, repaired: 0, salvaged: 0 },
    };

    // Extract entities from each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      if (!chunk) continue;
      if (onProgress) onProgress(chunkIndex + 1, chunks.length);

      try {
        const response = await this.llm.complete(EXTRACTION_PROMPT + chunk.text, {
          temperature: 0.1,
          maxTokens: this.maxTokens,
        });

        const result = parseJSONWithFallbacks(response);

        if (result.ok) {
          let entitiesFromChunk = 0;

          for (let islandIndex = 0; islandIndex < result.values.length; islandIndex++) {
            const candidate = result.values[islandIndex];
            if (!isValidExtractionResponse(candidate)) continue;

            const entities = this.extractEntitiesFromCandidate(candidate, {
              parseMode: result.mode,
              chunkIndex,
              islandIndex: result.mode === 'salvaged' ? islandIndex : undefined,
            });

            entitiesFromChunk += entities.length;
            this.mergeEntities(allEntities, entities, stats);
          }

          if (entitiesFromChunk > 0) {
            stats[result.mode]++;
            if (this.verbose && !this.quiet) {
              const extra =
                result.mode === 'salvaged' && result.warnings
                  ? ` (${result.warnings[0]})`
                  : result.mode !== 'strict'
                    ? ` (${result.mode})`
                    : '';
              console.log(
                `Chunk ${chunkIndex + 1}/${chunks.length}: ${entitiesFromChunk} entities${extra}`
              );
            }
          } else {
            stats.parsedEmpty++;
            if (this.verbose && !this.quiet) {
              console.log(
                `Chunk ${chunkIndex + 1}/${chunks.length}: 0 entities (parsed but empty)`
              );
            }
          }
        } else {
          stats.failed++;
          badChunks.push({
            chunkIndex,
            phase: result.mode,
            error: result.error,
            errors: result.errors,
            rawSnippet: result.rawSnippet,
            repairedSnippet: result.repairedSnippet,
            attemptedRepair: result.attemptedRepair,
            islandsFound: result.islandsFound,
            model: this.llm.modelName,
            extractorVersion: VERSION,
            timestamp: new Date().toISOString(),
          });

          if (this.verbose && !this.quiet) {
            console.log(
              `Chunk ${chunkIndex + 1}/${chunks.length}: parse failed -> bad-chunks.jsonl`
            );
          }
        }
      } catch (error) {
        stats.failed++;
        if (!this.quiet) {
          console.error(`Chunk ${chunkIndex + 1}/${chunks.length}: LLM error:`, error);
        }
      }
    }

    // Write bad chunks if any
    let badChunksPath: string | undefined;
    if (badChunks.length > 0) {
      badChunksPath = await this.writeBadChunks(badChunks);
    }

    // Extract scene structure
    const scenes = await this.extractScenes(text, chunks);

    return {
      entities: Array.from(allEntities.values()).sort((a, b) => b.mentions - a.mentions),
      scenes,
      stats,
      badChunksPath,
    };
  }

  /**
   * Print extraction summary to console
   */
  printSummary(result: ExtractionResult): void {
    if (this.quiet) return;

    const { stats, badChunksPath, entities } = result;

    console.log('\nEntity extraction complete:');
    console.log(`  Chunks processed: ${stats.total}`);
    console.log('  Parse results:');
    console.log(`    - strict:      ${stats.strict} chunks`);
    console.log(`    - repaired:    ${stats.repaired} chunks`);
    console.log(`    - salvaged:    ${stats.salvaged} chunks`);
    console.log(`    - parsedEmpty: ${stats.parsedEmpty} chunks`);
    console.log(`    - failed:      ${stats.failed} chunks`);

    console.log(`  Entities extracted: ${entities.length}`);
    for (const [type, count] of Object.entries(stats.entitiesByType)) {
      console.log(`    - ${type}s: ${count}`);
    }

    if (badChunksPath) {
      console.log(`\n  Failed chunks logged to: ${badChunksPath}`);
    }
  }

  private chunkText(text: string): Array<{ text: string; start: number; end: number }> {
    const chunks: Array<{ text: string; start: number; end: number }> = [];
    let start = 0;

    while (start < text.length) {
      let end = start + this.chunkSize;

      // Try to break at paragraph boundary
      if (end < text.length) {
        const breakPoint = text.lastIndexOf('\n\n', end);
        if (breakPoint > start + this.chunkSize / 2) {
          end = breakPoint;
        }
      } else {
        end = text.length;
      }

      chunks.push({
        text: text.slice(start, end),
        start,
        end,
      });

      start = end - this.overlapSize;
      if (start < 0) start = 0;
      if (end >= text.length) break;
    }

    return chunks;
  }

  private extractEntitiesFromCandidate(
    response: RawExtractionResponse,
    provenance: { parseMode: ParseMode; chunkIndex: number; islandIndex?: number | undefined }
  ): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    const typeMap: Array<{ key: keyof RawExtractionResponse; type: NodeType }> = [
      { key: 'characters', type: 'character' },
      { key: 'locations', type: 'location' },
      { key: 'objects', type: 'object' },
      { key: 'events', type: 'event' },
    ];

    for (const { key, type } of typeMap) {
      const items = response[key];
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        if (!isValidEntity(item)) continue;

        const raw = item as Record<string, unknown>;
        entities.push({
          name: (raw.name as string).trim(),
          type,
          aliases: normalizeAliases(raw.aliases),
          description: normalizeDescription(raw.description),
          mentions: 1,
          parseMode: provenance.parseMode,
          chunkIndex: provenance.chunkIndex,
          islandIndex: provenance.islandIndex,
        });
      }
    }

    return entities;
  }

  private mergeEntities(
    allEntities: Map<string, ExtractedEntity>,
    newEntities: ExtractedEntity[],
    stats: ChunkStats
  ): void {
    for (const entity of newEntities) {
      const key = this.normalizeEntityKey(entity.name);
      const existing = allEntities.get(key);

      if (existing) {
        // Merge: combine aliases, increment mentions
        const combinedAliases = [...existing.aliases, ...entity.aliases];
        const seen = new Set<string>();
        existing.aliases = combinedAliases.filter((a) => {
          const lower = a.toLowerCase();
          if (seen.has(lower)) return false;
          seen.add(lower);
          return true;
        });
        existing.mentions += 1;
        // Keep longer description
        if (entity.description.length > existing.description.length) {
          existing.description = entity.description;
        }
      } else {
        allEntities.set(key, { ...entity });

        // Update stats for new entity
        stats.entitiesByType[entity.type] = (stats.entitiesByType[entity.type] || 0) + 1;
        stats.entitiesByMode[entity.parseMode]++;
      }
    }
  }

  private async extractScenes(
    _fullText: string,
    chunks: Array<{ text: string; start: number; end: number }>
  ): Promise<ExtractionResult['scenes']> {
    const scenes: ExtractionResult['scenes'] = [];
    const chapterRegex = /^#+\s*(Chapter|Scene|Part)\s*\d*[:\s]*.*/gim;

    for (const chunk of chunks) {
      const matches = chunk.text.matchAll(chapterRegex);
      for (const match of matches) {
        if (match.index !== undefined) {
          scenes.push({
            title: match[0].replace(/^#+\s*/, '').trim(),
            summary: '',
            startOffset: chunk.start + match.index,
            endOffset: chunk.start + match.index + 1000,
            entities: [],
          });
        }
      }
    }

    return scenes;
  }

  private normalizeEntityKey(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private async writeBadChunks(badChunks: BadChunkRecord[]): Promise<string> {
    const filePath = path.join(this.outputDir, 'extract-bad-chunks.jsonl');

    const lines = badChunks.map((record) => JSON.stringify(record)).join('\n');

    await fs.promises.writeFile(filePath, lines + '\n', 'utf-8');

    return filePath;
  }
}
