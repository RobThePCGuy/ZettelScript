/**
 * Entity extraction from prose using LLM
 */

import type { LLMProvider } from '../llm/provider.js';
import type { NodeType } from '../core/types/index.js';

export interface ExtractedEntity {
  name: string;
  type: NodeType;
  aliases: string[];
  description: string;
  mentions: number;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  scenes: Array<{
    title: string;
    summary: string;
    startOffset: number;
    endOffset: number;
    entities: string[]; // Entity names referenced in this scene
  }>;
}

export interface EntityExtractorOptions {
  llmProvider: LLMProvider;
  chunkSize?: number; // Max characters per chunk
  overlapSize?: number; // Overlap between chunks
}

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

// Reserved for future LLM-based scene detection (see extractScenes TODO)
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

export class EntityExtractor {
  private llm: LLMProvider;
  private chunkSize: number;
  private overlapSize: number;

  constructor(options: EntityExtractorOptions) {
    this.llm = options.llmProvider;
    this.chunkSize = options.chunkSize ?? 8000; // ~2000 tokens
    this.overlapSize = options.overlapSize ?? 500;
  }

  /**
   * Extract entities from a full manuscript
   */
  async extractFromText(text: string, onProgress?: (current: number, total: number) => void): Promise<ExtractionResult> {
    const chunks = this.chunkText(text);
    const allEntities = new Map<string, ExtractedEntity>();

    // Extract entities from each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;
      if (onProgress) onProgress(i + 1, chunks.length);

      const chunkEntities = await this.extractEntitiesFromChunk(chunk.text);

      // Merge entities
      for (const entity of chunkEntities) {
        const key = this.normalizeEntityKey(entity.name);
        const existing = allEntities.get(key);

        if (existing) {
          // Merge: combine aliases, increment mentions
          existing.aliases = [...new Set([...existing.aliases, ...entity.aliases])];
          existing.mentions += 1;
          // Keep longer description
          if (entity.description.length > existing.description.length) {
            existing.description = entity.description;
          }
        } else {
          allEntities.set(key, { ...entity, mentions: 1 });
        }
      }
    }

    // Extract scene structure
    const scenes = await this.extractScenes(text, chunks);

    return {
      entities: Array.from(allEntities.values()).sort((a, b) => b.mentions - a.mentions),
      scenes,
    };
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

  private async extractEntitiesFromChunk(text: string): Promise<ExtractedEntity[]> {
    const prompt = EXTRACTION_PROMPT + text;

    try {
      const response = await this.llm.complete(prompt, { temperature: 0.1 });
      const parsed = this.parseJSON(response);

      const entities: ExtractedEntity[] = [];

      // Process characters
      if (Array.isArray(parsed.characters)) {
        for (const c of parsed.characters) {
          if (c.name) {
            entities.push({
              name: c.name,
              type: 'character',
              aliases: Array.isArray(c.aliases) ? c.aliases : [],
              description: c.description || '',
              mentions: 1,
            });
          }
        }
      }

      // Process locations
      if (Array.isArray(parsed.locations)) {
        for (const l of parsed.locations) {
          if (l.name) {
            entities.push({
              name: l.name,
              type: 'location',
              aliases: Array.isArray(l.aliases) ? l.aliases : [],
              description: l.description || '',
              mentions: 1,
            });
          }
        }
      }

      // Process objects
      if (Array.isArray(parsed.objects)) {
        for (const o of parsed.objects) {
          if (o.name) {
            entities.push({
              name: o.name,
              type: 'object',
              aliases: Array.isArray(o.aliases) ? o.aliases : [],
              description: o.description || '',
              mentions: 1,
            });
          }
        }
      }

      // Process events
      if (Array.isArray(parsed.events)) {
        for (const e of parsed.events) {
          if (e.name) {
            entities.push({
              name: e.name,
              type: 'event',
              aliases: Array.isArray(e.aliases) ? e.aliases : [],
              description: e.description || '',
              mentions: 1,
            });
          }
        }
      }

      return entities;
    } catch (error) {
      console.error('Entity extraction failed for chunk:', error);
      return [];
    }
  }

  private async extractScenes(
    _fullText: string,
    chunks: Array<{ text: string; start: number; end: number }>
  ): Promise<ExtractionResult['scenes']> {
    // For now, use chapter markers or chunk boundaries
    // A more sophisticated approach would use the LLM to identify scene breaks
    const scenes: ExtractionResult['scenes'] = [];

    // Try to find chapter markers
    const chapterRegex = /^#+\s*(Chapter|Scene|Part)\s*\d*[:\s]*.*/gmi;

    for (const chunk of chunks) {
      const matches = chunk.text.matchAll(chapterRegex);
      for (const match of matches) {
        if (match.index !== undefined) {
          scenes.push({
            title: match[0].replace(/^#+\s*/, '').trim(),
            summary: '',
            startOffset: chunk.start + match.index,
            endOffset: chunk.start + match.index + 1000, // Approximate
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

  private parseJSON(text: string): Record<string, unknown> {
    // Try to extract JSON from response
    let jsonText = text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    // Find JSON object boundaries
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');

    if (start !== -1 && end !== -1 && end > start) {
      jsonText = jsonText.slice(start, end + 1);
    }

    try {
      return JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse JSON:', jsonText.slice(0, 200));
      console.error('Full response length:', jsonText.length);
      console.error('Last 100 chars:', jsonText.slice(-100));
      console.error('Parse error:', e instanceof Error ? e.message : e);
      return {};
    }
  }
}
