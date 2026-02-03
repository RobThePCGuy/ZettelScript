import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { Frontmatter } from '../core/types/index.js';
import { ParseError } from '../core/errors.js';

// Frontmatter delimiter
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export interface ParsedDocument {
  frontmatter: Frontmatter | null;
  content: string;
  contentStartOffset: number;
}

/**
 * Parse frontmatter from a markdown document
 */
export function parseFrontmatter(source: string, filePath: string): ParsedDocument {
  const match = source.match(FRONTMATTER_REGEX);

  if (!match) {
    return {
      frontmatter: null,
      content: source,
      contentStartOffset: 0,
    };
  }

  const yamlContent = match[1];
  const fullMatch = match[0];

  if (!yamlContent) {
    return {
      frontmatter: null,
      content: source,
      contentStartOffset: 0,
    };
  }

  try {
    const parsed = parseYaml(yamlContent) as Frontmatter | null;

    return {
      frontmatter: parsed ?? null,
      content: source.slice(fullMatch.length),
      contentStartOffset: fullMatch.length,
    };
  } catch (error) {
    throw new ParseError(`Invalid YAML frontmatter: ${error}`, filePath, undefined, undefined, {
      yaml: yamlContent,
    });
  }
}

/**
 * Extract title from frontmatter or first heading
 */
export function extractTitle(
  frontmatter: Frontmatter | null,
  content: string,
  filePath: string
): string {
  // Priority 1: frontmatter title
  if (frontmatter?.title) {
    return frontmatter.title;
  }

  // Priority 2: first H1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match?.[1]) {
    return h1Match[1].trim();
  }

  // Priority 3: filename without extension
  const filename = filePath.split('/').pop() || filePath;
  return filename.replace(/\.md$/, '');
}

/**
 * Extract node type from frontmatter
 */
export function extractNodeType(frontmatter: Frontmatter | null): string {
  if (frontmatter?.type) {
    return frontmatter.type;
  }
  return 'note';
}

/**
 * Extract aliases from frontmatter
 */
export function extractAliases(frontmatter: Frontmatter | null): string[] {
  if (!frontmatter?.aliases) {
    return [];
  }

  if (Array.isArray(frontmatter.aliases)) {
    return frontmatter.aliases.filter((a) => typeof a === 'string');
  }

  return [];
}

/**
 * Serialize frontmatter back to YAML string
 */
export function serializeFrontmatter(frontmatter: Frontmatter): string {
  return `---\n${stringifyYaml(frontmatter)}---\n`;
}

/**
 * Update frontmatter in a document
 */
export function updateFrontmatter(
  source: string,
  updates: Partial<Frontmatter>,
  filePath: string
): string {
  const { frontmatter, content } = parseFrontmatter(source, filePath);

  const newFrontmatter: Frontmatter = {
    ...frontmatter,
    ...updates,
  };

  return serializeFrontmatter(newFrontmatter) + content;
}

/**
 * Validate frontmatter schema
 */
export function validateFrontmatter(frontmatter: Frontmatter): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check type is valid if present
  const validTypes = [
    'note',
    'scene',
    'character',
    'location',
    'object',
    'event',
    'concept',
    'moc',
    'timeline',
    'draft',
  ];

  if (frontmatter.type && !validTypes.includes(frontmatter.type)) {
    errors.push(`Invalid type "${frontmatter.type}". Valid types: ${validTypes.join(', ')}`);
  }

  // Check aliases is an array if present
  if (frontmatter.aliases !== undefined && !Array.isArray(frontmatter.aliases)) {
    errors.push('aliases must be an array');
  }

  // Check tags is an array if present
  if (frontmatter.tags !== undefined && !Array.isArray(frontmatter.tags)) {
    errors.push('tags must be an array');
  }

  // Check scene_order is a number if present
  if (frontmatter.scene_order !== undefined && typeof frontmatter.scene_order !== 'number') {
    errors.push('scene_order must be a number');
  }

  // Check characters is an array if present
  if (frontmatter.characters !== undefined && !Array.isArray(frontmatter.characters)) {
    errors.push('characters must be an array');
  }

  // Check locations is an array if present
  if (frontmatter.locations !== undefined && !Array.isArray(frontmatter.locations)) {
    errors.push('locations must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
