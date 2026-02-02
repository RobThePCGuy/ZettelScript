/**
 * Link Injection
 * Post-processor that adds wikilinks to notes based on entity names
 * Carefully avoids frontmatter, code blocks, existing links, and headers
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { InjectLinksOptions, InjectLinksResult, KBData } from './types.js';
import { parseKBJson } from './utils.js';

// ============================================================================
// Simple Glob Implementation
// ============================================================================

interface GlobOptions {
  ignore?: string[];
}

/**
 * Simple glob pattern matching for file discovery
 */
async function glob(basePath: string, pattern: string, options: GlobOptions = {}): Promise<string[]> {
  const results: string[] = [];
  const ignore = options.ignore || [];

  // Convert glob pattern to regex
  // Handle **/*.md to match both root files and nested files
  let regexPattern = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')
    .replace(/{{GLOBSTAR}}\//g, '(?:.*\\/)?')  // **/ matches zero or more dirs
    .replace(/{{GLOBSTAR}}/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`);

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');

      // Check ignore patterns
      let shouldIgnore = false;
      for (const ignorePattern of ignore) {
        const ignoreRegex = ignorePattern
          .replace(/\*\*/g, '{{GLOBSTAR}}')
          .replace(/\*/g, '[^/]*')
          .replace(/{{GLOBSTAR}}/g, '.*');
        if (new RegExp(`^${ignoreRegex}$`).test(relativePath)) {
          shouldIgnore = true;
          break;
        }
      }

      if (shouldIgnore) continue;

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (regex.test(relativePath)) {
          results.push(fullPath);
        }
      }
    }
  }

  await walk(basePath);
  return results;
}

// ============================================================================
// Protected Regions
// ============================================================================

// Regions to avoid when injecting links
interface ProtectedRegion {
  start: number;
  end: number;
  type: 'frontmatter' | 'code_block' | 'inline_code' | 'existing_link' | 'header';
}

/**
 * Find all protected regions in a document where we shouldn't inject links
 */
function findProtectedRegions(content: string): ProtectedRegion[] {
  const regions: ProtectedRegion[] = [];

  // Frontmatter (must be at start of document)
  const frontmatterMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (frontmatterMatch) {
    regions.push({
      start: 0,
      end: frontmatterMatch[0].length,
      type: 'frontmatter',
    });
  }

  // Code blocks (fenced with ``` or ~~~)
  const codeBlockRegex = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'code_block',
    });
  }

  // Inline code
  const inlineCodeRegex = /`[^`\n]+`/g;
  while ((match = inlineCodeRegex.exec(content)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'inline_code',
    });
  }

  // Existing wikilinks
  const wikilinkRegex = /\[\[[^\]]+\]\]/g;
  while ((match = wikilinkRegex.exec(content)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'existing_link',
    });
  }

  // Markdown links
  const markdownLinkRegex = /\[([^\]]+)\]\([^)]+\)/g;
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'existing_link',
    });
  }

  // Headers (don't link inside headers)
  const headerRegex = /^#{1,6}\s+.+$/gm;
  while ((match = headerRegex.exec(content)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'header',
    });
  }

  return regions.sort((a, b) => a.start - b.start);
}

/**
 * Check if a position is within any protected region
 */
function isProtected(position: number, length: number, regions: ProtectedRegion[]): boolean {
  const end = position + length;
  for (const region of regions) {
    // Check if our range overlaps with the protected region
    if (position < region.end && end > region.start) {
      return true;
    }
    // Early exit if we've passed all relevant regions
    if (region.start > end) {
      break;
    }
  }
  return false;
}

/**
 * Create a case-insensitive regex for an entity name
 * Handles word boundaries properly
 */
function createEntityRegex(name: string): RegExp {
  // Escape special regex characters
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match whole words only, case insensitive
  return new RegExp(`\\b(${escaped})\\b`, 'gi');
}

interface Replacement {
  start: number;
  end: number;
  original: string;
  replacement: string;
}

/**
 * Find all positions where an entity should be linked
 */
function findEntityMatches(
  content: string,
  entityName: string,
  protectedRegions: ProtectedRegion[]
): Replacement[] {
  const replacements: Replacement[] = [];
  const regex = createEntityRegex(entityName);
  let match;

  while ((match = regex.exec(content)) !== null) {
    const start = match.index;
    const original = match[0];
    const length = original.length;

    // Skip if in protected region
    if (isProtected(start, length, protectedRegions)) {
      continue;
    }

    replacements.push({
      start,
      end: start + length,
      original,
      replacement: `[[${entityName}|${original}]]`,
    });
  }

  return replacements;
}

/**
 * Apply replacements to content, working from end to start to maintain positions
 */
function applyReplacements(content: string, replacements: Replacement[]): string {
  // Sort by position descending so we can replace from end to start
  const sorted = [...replacements].sort((a, b) => b.start - a.start);

  let result = content;
  for (const rep of sorted) {
    result = result.slice(0, rep.start) + rep.replacement + result.slice(rep.end);
  }

  return result;
}

/**
 * Inject wikilinks into a single file
 */
function injectLinksInFile(
  content: string,
  entities: Map<string, string[]> // canonical name -> aliases
): { content: string; linksInjected: number } {
  const protectedRegions = findProtectedRegions(content);
  const allReplacements: Replacement[] = [];
  const linkedPositions = new Set<string>(); // Track positions we've already linked

  // Process each entity and its aliases
  for (const [canonical, aliases] of entities) {
    // Process canonical name first
    const canonicalMatches = findEntityMatches(content, canonical, protectedRegions);
    for (const match of canonicalMatches) {
      const posKey = `${match.start}-${match.end}`;
      if (!linkedPositions.has(posKey)) {
        // For canonical name, use simple link
        match.replacement = `[[${canonical}]]`;
        allReplacements.push(match);
        linkedPositions.add(posKey);
      }
    }

    // Process aliases
    for (const alias of aliases) {
      if (alias.toLowerCase() === canonical.toLowerCase()) continue;

      const aliasMatches = findEntityMatches(content, alias, protectedRegions);
      for (const match of aliasMatches) {
        const posKey = `${match.start}-${match.end}`;
        if (!linkedPositions.has(posKey)) {
          // Check if this position overlaps with any existing replacement
          const overlaps = allReplacements.some(
            r => (match.start < r.end && match.end > r.start)
          );
          if (!overlaps) {
            // For alias, link to canonical with display text
            match.replacement = `[[${canonical}|${match.original}]]`;
            allReplacements.push(match);
            linkedPositions.add(posKey);
          }
        }
      }
    }
  }

  // Remove overlapping replacements (keep first occurrence)
  const nonOverlapping = removeOverlaps(allReplacements);

  const newContent = applyReplacements(content, nonOverlapping);
  return {
    content: newContent,
    linksInjected: nonOverlapping.length,
  };
}

/**
 * Remove overlapping replacements, keeping the first one found
 */
function removeOverlaps(replacements: Replacement[]): Replacement[] {
  if (replacements.length <= 1) return replacements;

  // Sort by start position
  const sorted = [...replacements].sort((a, b) => a.start - b.start);
  const first = sorted[0];
  if (!first) return [];

  const result: Replacement[] = [first];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = result[result.length - 1];

    // If current doesn't overlap with last kept replacement, keep it
    if (current && last && current.start >= last.end) {
      result.push(current);
    }
  }

  return result;
}

/**
 * Build entity map from KB data
 */
function buildEntityMap(kb: KBData): Map<string, string[]> {
  const entities = new Map<string, string[]>();

  // Add characters
  for (const char of kb.characters) {
    entities.set(char.canonical_name, char.aliases || []);
  }

  // Add locations
  for (const loc of kb.locations) {
    entities.set(loc.name, []);
  }

  // Add objects
  for (const obj of kb.objects) {
    entities.set(obj.name, []);
  }

  // Add name normalization if available
  if (kb.name_normalization) {
    for (const norm of kb.name_normalization) {
      if (entities.has(norm.canonical)) {
        const existing = entities.get(norm.canonical)!;
        const combined = [...new Set([...existing, ...norm.variants])];
        entities.set(norm.canonical, combined);
      } else {
        entities.set(norm.canonical, norm.variants);
      }
    }
  }

  return entities;
}

/**
 * Inject wikilinks into all matching files in a vault
 */
export async function injectLinks(
  options: InjectLinksOptions
): Promise<InjectLinksResult> {
  const result: InjectLinksResult = {
    modified: [],
    linksInjected: 0,
    skipped: [],
    errors: [],
  };

  // Build entity map
  let entities: Map<string, string[]>;

  if (options.entities) {
    // Use provided entity list
    entities = new Map();
    for (const entity of options.entities) {
      entities.set(entity, []);
    }
  } else {
    // Try to find KB file
    const kbPaths = [
      path.join(options.vaultPath, '.narrative-project', 'kb', 'kb.json'),
      path.join(options.vaultPath, 'kb', 'kb.json'),
      path.join(options.vaultPath, 'kb.json'),
    ];

    let kbPath: string | null = null;
    for (const p of kbPaths) {
      if (fs.existsSync(p)) {
        kbPath = p;
        break;
      }
    }

    if (kbPath) {
      try {
        const kb = parseKBJson(kbPath);
        entities = buildEntityMap(kb);
      } catch (error) {
        result.errors.push({
          file: kbPath,
          error: `Failed to load KB: ${error}`,
        });
        return result;
      }
    } else {
      result.errors.push({
        file: options.vaultPath,
        error: 'No entity list provided and no KB file found',
      });
      return result;
    }
  }

  if (entities.size === 0) {
    return result;
  }

  // Find files to process
  const pattern = options.pattern || '**/*.md';
  const files = await glob(options.vaultPath, pattern, {
    ignore: ['**/node_modules/**', '**/.git/**', '**/.zettelscript/**'],
  });

  // Process each file
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { content: newContent, linksInjected } = injectLinksInFile(content, entities);

      if (linksInjected > 0) {
        if (options.dryRun) {
          console.log(`[DRY RUN] Would modify: ${file} (+${linksInjected} links)`);
          result.modified.push(file);
          result.linksInjected += linksInjected;
        } else {
          await fs.promises.writeFile(file, newContent, 'utf-8');
          result.modified.push(file);
          result.linksInjected += linksInjected;
          if (options.verbose) {
            console.log(`Modified: ${file} (+${linksInjected} links)`);
          }
        }
      } else {
        result.skipped.push(file);
      }
    } catch (error) {
      result.errors.push({
        file,
        error: `${error}`,
      });
    }
  }

  return result;
}

/**
 * Preview link injection without modifying files
 */
export async function previewLinkInjection(
  options: InjectLinksOptions
): Promise<Map<string, Array<{ original: string; linked: string; position: number }>>> {
  const previews = new Map<string, Array<{ original: string; linked: string; position: number }>>();

  // Build entity map (same logic as injectLinks)
  let entities: Map<string, string[]>;

  if (options.entities) {
    entities = new Map();
    for (const entity of options.entities) {
      entities.set(entity, []);
    }
  } else {
    const kbPaths = [
      path.join(options.vaultPath, '.narrative-project', 'kb', 'kb.json'),
      path.join(options.vaultPath, 'kb', 'kb.json'),
      path.join(options.vaultPath, 'kb.json'),
    ];

    let kbPath: string | null = null;
    for (const p of kbPaths) {
      if (fs.existsSync(p)) {
        kbPath = p;
        break;
      }
    }

    if (kbPath) {
      const kb = parseKBJson(kbPath);
      entities = buildEntityMap(kb);
    } else {
      return previews;
    }
  }

  // Find files
  const pattern = options.pattern || '**/*.md';
  const files = await glob(options.vaultPath, pattern, {
    ignore: ['**/node_modules/**', '**/.git/**', '**/.zettelscript/**'],
  });

  // Collect preview info for each file
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const protectedRegions = findProtectedRegions(content);
    const filePreview: Array<{ original: string; linked: string; position: number }> = [];

    for (const [canonical, aliases] of entities) {
      const allNames = [canonical, ...aliases];
      for (const name of allNames) {
        const matches = findEntityMatches(content, name, protectedRegions);
        for (const match of matches) {
          const linked = name.toLowerCase() === canonical.toLowerCase()
            ? `[[${canonical}]]`
            : `[[${canonical}|${match.original}]]`;
          filePreview.push({
            original: match.original,
            linked,
            position: match.start,
          });
        }
      }
    }

    if (filePreview.length > 0) {
      previews.set(file, filePreview.sort((a, b) => a.position - b.position));
    }
  }

  return previews;
}
