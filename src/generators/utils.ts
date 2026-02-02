/**
 * Shared utilities for vault generators
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import type { KBData, ArcLedger, WorldRulesData } from './types.js';

// ============================================================================
// Filename Sanitization
// ============================================================================

/**
 * Sanitize a string for use as a filename
 * Removes or replaces characters that are unsafe in filenames
 */
export function sanitizeFilename(name: string): string {
  return name
    // Replace Windows/Unix unsafe characters
    .replace(/[<>:"/\\|?*]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim()
    // Replace spaces with hyphens for cleaner URLs
    .replace(/\s/g, '-')
    // Remove any remaining problematic characters
    .replace(/[^\w\-().]/g, '')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a safe path for a note file
 */
export function generateNotePath(
  outputDir: string,
  subdir: string,
  name: string,
  extension: string = '.md'
): string {
  const safeFilename = sanitizeFilename(name);
  return path.join(outputDir, subdir, `${safeFilename}${extension}`);
}

// ============================================================================
// Frontmatter Building
// ============================================================================

/**
 * Build frontmatter YAML string from data
 */
export function buildFrontmatter(data: Record<string, unknown>): string {
  // Filter out undefined/null values
  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined && v !== null)
  );

  if (Object.keys(cleaned).length === 0) {
    return '';
  }

  return `---\n${stringifyYaml(cleaned)}---\n\n`;
}

/**
 * Build a complete note with frontmatter and content
 */
export function buildNote(
  frontmatter: Record<string, unknown>,
  content: string
): string {
  const fm = buildFrontmatter(frontmatter);
  return `${fm}${content}`;
}

// ============================================================================
// KB Data Loading
// ============================================================================

/**
 * Load and parse a JSON file
 */
export function loadJson<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Load KB data from JSON file
 */
export function parseKBJson(kbPath: string): KBData {
  return loadJson<KBData>(kbPath);
}

/**
 * Load arc ledger from JSON file
 */
export function parseArcLedger(arcLedgerPath: string): ArcLedger {
  return loadJson<ArcLedger>(arcLedgerPath);
}

/**
 * Load world rules from JSON file
 */
export function parseWorldRules(worldRulesPath: string): WorldRulesData {
  return loadJson<WorldRulesData>(worldRulesPath);
}

/**
 * Find KB files in a project directory
 */
export function findKBFiles(projectDir: string): {
  kb?: string;
  arcLedger?: string;
  worldRules?: string;
} {
  const result: { kb?: string; arcLedger?: string; worldRules?: string } = {};

  // Common paths for KB files
  const kbPaths = [
    path.join(projectDir, '.narrative-project', 'kb', 'kb.json'),
    path.join(projectDir, 'kb', 'kb.json'),
    path.join(projectDir, 'kb.json'),
  ];

  const arcLedgerPaths = [
    path.join(projectDir, '.narrative-project', 'kb', 'arc-ledger.json'),
    path.join(projectDir, 'kb', 'arc-ledger.json'),
    path.join(projectDir, 'arc-ledger.json'),
  ];

  const worldRulesPaths = [
    path.join(projectDir, '.narrative-project', 'kb', 'world-rules.json'),
    path.join(projectDir, 'kb', 'world-rules.json'),
    path.join(projectDir, 'world-rules.json'),
  ];

  for (const p of kbPaths) {
    if (fs.existsSync(p)) {
      result.kb = p;
      break;
    }
  }

  for (const p of arcLedgerPaths) {
    if (fs.existsSync(p)) {
      result.arcLedger = p;
      break;
    }
  }

  for (const p of worldRulesPaths) {
    if (fs.existsSync(p)) {
      result.worldRules = p;
      break;
    }
  }

  return result;
}

// ============================================================================
// Entity Deduplication
// ============================================================================

/**
 * Case-insensitive entity tracker for deduplication
 */
export class EntityTracker {
  private seen = new Map<string, string>(); // lowercase -> canonical

  /**
   * Check if an entity has been seen
   */
  has(name: string): boolean {
    return this.seen.has(name.toLowerCase());
  }

  /**
   * Add an entity to the tracker
   * Returns false if already present
   */
  add(name: string): boolean {
    const lower = name.toLowerCase();
    if (this.seen.has(lower)) {
      return false;
    }
    this.seen.set(lower, name);
    return true;
  }

  /**
   * Get the canonical name for an entity
   */
  getCanonical(name: string): string | undefined {
    return this.seen.get(name.toLowerCase());
  }

  /**
   * Get all tracked entities
   */
  getAll(): string[] {
    return Array.from(this.seen.values());
  }
}

// ============================================================================
// File Writing Helpers
// ============================================================================

/**
 * Write a file, creating directories as needed
 * Returns true if file was written, false if skipped
 */
export async function writeNoteFile(
  filePath: string,
  content: string,
  options: { force?: boolean; dryRun?: boolean } = {}
): Promise<boolean> {
  if (options.dryRun) {
    console.log(`[DRY RUN] Would create: ${filePath}`);
    return true;
  }

  // Check if file exists
  if (!options.force && fs.existsSync(filePath)) {
    return false;
  }

  // Create directory
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });

  // Write file
  await fs.promises.writeFile(filePath, content, 'utf-8');
  return true;
}

// ============================================================================
// Markdown Helpers
// ============================================================================

/**
 * Create a wikilink
 */
export function wikilink(target: string, display?: string): string {
  if (display && display !== target) {
    return `[[${target}|${display}]]`;
  }
  return `[[${target}]]`;
}

/**
 * Create a list of wikilinks
 */
export function wikilinkList(items: string[]): string {
  return items.map(item => `- ${wikilink(item)}`).join('\n');
}

/**
 * Format an array as a YAML-compatible list in frontmatter
 */
export function formatList(items: string[] | undefined): string[] | undefined {
  if (!items || items.length === 0) {
    return undefined;
  }
  return items;
}

/**
 * Format chapters as a readable string
 */
export function formatChapters(chapters: number[] | undefined): string {
  if (!chapters || chapters.length === 0) {
    return 'Unknown';
  }
  return chapters.join(', ');
}

/**
 * Create a section header
 */
export function section(title: string, level: number = 2): string {
  const hashes = '#'.repeat(level);
  return `${hashes} ${title}\n\n`;
}

/**
 * Create a blockquote
 */
export function blockquote(text: string): string {
  return text.split('\n').map(line => `> ${line}`).join('\n');
}

/**
 * Format a key-value pair for display
 */
export function kvPair(key: string, value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (Array.isArray(value)) {
    return `**${key}:** ${value.join(', ')}`;
  }
  return `**${key}:** ${value}`;
}
