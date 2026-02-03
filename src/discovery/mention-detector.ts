import { NodeRepository } from '../storage/database/repositories/index.js';
import { findExclusionZones, type ExclusionZone } from '../parser/exclusions.js';
import { parseFrontmatter } from '../parser/frontmatter.js';
import { FileSystemError, ParseError } from '../core/errors.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DetectedMention {
  targetId: string;
  targetTitle: string;
  surfaceText: string;
  spanStart: number;
  spanEnd: number;
  matchType: 'title' | 'alias';
}

export interface MentionDetectorOptions {
  nodeRepository: NodeRepository;
  vaultPath?: string;
}

/**
 * Detects unlinked mentions of nodes in content
 * Following spec 8.1:
 * 1. Strip excluded zones (code, links, URLs, frontmatter)
 * 2. Match titles/aliases with boundary-aware rules
 * 3. Deduplicate overlapping (prefer longer matches)
 */
export class MentionDetector {
  private nodeRepo: NodeRepository;
  private vaultPath: string;
  private titleIndex: Map<string, { nodeId: string; title: string }[]> = new Map();
  private aliasIndex: Map<string, { nodeId: string; title: string; alias: string }[]> = new Map();

  constructor(options: MentionDetectorOptions) {
    this.nodeRepo = options.nodeRepository;
    this.vaultPath = options.vaultPath || process.cwd();
  }

  /**
   * Build the title/alias index for fast matching
   */
  async buildIndex(): Promise<void> {
    this.titleIndex.clear();
    this.aliasIndex.clear();

    const nodes = await this.nodeRepo.findAll();

    for (const node of nodes) {
      // Index by title (case-insensitive)
      const titleLower = node.title.toLowerCase();
      if (!this.titleIndex.has(titleLower)) {
        this.titleIndex.set(titleLower, []);
      }
      this.titleIndex.get(titleLower)?.push({ nodeId: node.nodeId, title: node.title });

      // Index by aliases
      const aliases = await this.nodeRepo.getAliases(node.nodeId);
      for (const alias of aliases) {
        const aliasLower = alias.toLowerCase();
        if (!this.aliasIndex.has(aliasLower)) {
          this.aliasIndex.set(aliasLower, []);
        }
        this.aliasIndex.get(aliasLower)?.push({
          nodeId: node.nodeId,
          title: node.title,
          alias,
        });
      }
    }
  }

  /**
   * Detect mentions in a specific node
   */
  async detectInNode(nodeId: string): Promise<DetectedMention[]> {
    // Ensure index is built
    if (this.titleIndex.size === 0) {
      await this.buildIndex();
    }

    const node = await this.nodeRepo.findById(nodeId);
    if (!node) return [];

    // Read file content
    const filePath = path.join(this.vaultPath, node.path);

    try {
      if (!fs.existsSync(filePath)) {
        throw new FileSystemError(`File not found: ${filePath}`, filePath);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return this.detectInContent(content, nodeId, node.path);
    } catch (error) {
      if (error instanceof FileSystemError) {
        throw error;
      }
      throw new FileSystemError(
        `Failed to read file for mention detection: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );
    }
  }

  /**
   * Detect mentions in content
   */
  detectInContent(content: string, sourceNodeId: string, sourcePath: string): DetectedMention[] {
    // Parse frontmatter to get content offset
    let contentStartOffset: number;
    try {
      const parsed = parseFrontmatter(content, sourcePath);
      contentStartOffset = parsed.contentStartOffset;
    } catch (error) {
      throw new ParseError(
        `Failed to parse frontmatter: ${error instanceof Error ? error.message : String(error)}`,
        sourcePath
      );
    }

    // Get exclusion zones
    const exclusionZones = findExclusionZones(content, 0);

    // Collect all potential matches
    const allMatches: Array<DetectedMention & { start: number; end: number }> = [];

    // Match titles
    for (const [titleLower, nodes] of this.titleIndex) {
      // Skip single character matches
      if (titleLower.length < 2) continue;

      // Skip if this is the source node
      const isSourceNode = nodes.some((n) => n.nodeId === sourceNodeId);
      if (isSourceNode) continue;

      // Build boundary-aware regex
      const pattern = this.buildBoundaryPattern(titleLower);
      if (!pattern) continue;

      const regex = new RegExp(pattern, 'gi');
      let match;

      while ((match = regex.exec(content)) !== null) {
        if (match.index === undefined) continue;

        const start = match.index;
        const end = start + match[0].length;

        // Skip if in exclusion zone
        if (this.isInExclusionZone(start, end, exclusionZones)) continue;

        // Skip if in frontmatter
        if (start < contentStartOffset) continue;

        for (const nodeInfo of nodes) {
          allMatches.push({
            targetId: nodeInfo.nodeId,
            targetTitle: nodeInfo.title,
            surfaceText: match[0],
            spanStart: start,
            spanEnd: end,
            matchType: 'title',
            start,
            end,
          });
        }
      }
    }

    // Match aliases
    for (const [aliasLower, nodes] of this.aliasIndex) {
      // Skip single character matches
      if (aliasLower.length < 2) continue;

      // Skip if this is the source node
      const isSourceNode = nodes.some((n) => n.nodeId === sourceNodeId);
      if (isSourceNode) continue;

      // Build boundary-aware regex
      const pattern = this.buildBoundaryPattern(aliasLower);
      if (!pattern) continue;

      const regex = new RegExp(pattern, 'gi');
      let match;

      while ((match = regex.exec(content)) !== null) {
        if (match.index === undefined) continue;

        const start = match.index;
        const end = start + match[0].length;

        // Skip if in exclusion zone
        if (this.isInExclusionZone(start, end, exclusionZones)) continue;

        // Skip if in frontmatter
        if (start < contentStartOffset) continue;

        for (const nodeInfo of nodes) {
          allMatches.push({
            targetId: nodeInfo.nodeId,
            targetTitle: nodeInfo.title,
            surfaceText: match[0],
            spanStart: start,
            spanEnd: end,
            matchType: 'alias',
            start,
            end,
          });
        }
      }
    }

    // Deduplicate overlapping matches (prefer longer)
    return this.deduplicateMatches(allMatches);
  }

  /**
   * Build a boundary-aware regex pattern
   */
  private buildBoundaryPattern(text: string): string | null {
    // Escape regex special characters
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Word boundary pattern that handles various contexts
    // Matches when surrounded by non-word characters or at string boundaries
    return `(?<![\\w])${escaped}(?![\\w])`;
  }

  /**
   * Check if a range is in an exclusion zone
   */
  private isInExclusionZone(start: number, end: number, zones: ExclusionZone[]): boolean {
    return zones.some((zone) => start < zone.end && end > zone.start);
  }

  /**
   * Deduplicate overlapping matches, preferring longer matches
   */
  private deduplicateMatches(
    matches: Array<DetectedMention & { start: number; end: number }>
  ): DetectedMention[] {
    if (matches.length === 0) return [];

    // Sort by start position, then by length (descending)
    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.end - b.start - (a.end - a.start);
    });

    const result: DetectedMention[] = [];
    let lastEnd = -1;

    for (const match of matches) {
      // Skip if this match overlaps with previous
      if (match.start < lastEnd) continue;

      result.push({
        targetId: match.targetId,
        targetTitle: match.targetTitle,
        surfaceText: match.surfaceText,
        spanStart: match.spanStart,
        spanEnd: match.spanEnd,
        matchType: match.matchType,
      });

      lastEnd = match.end;
    }

    return result;
  }

  /**
   * Clear the index (call when nodes change)
   */
  clearIndex(): void {
    this.titleIndex.clear();
    this.aliasIndex.clear();
  }
}
