/**
 * Exclusion zones for wikilink detection.
 * These areas should not be scanned for wikilinks or unlinked mentions.
 */

export interface ExclusionZone {
  start: number;
  end: number;
  type: 'code_block' | 'inline_code' | 'url' | 'existing_link' | 'frontmatter' | 'html_tag';
}

// Regex patterns for exclusion zones
const PATTERNS = {
  // Fenced code blocks (``` or ~~~)
  codeBlock: /```[\s\S]*?```|~~~[\s\S]*?~~~/g,

  // Inline code
  inlineCode: /`[^`\n]+`/g,

  // URLs (http, https, ftp)
  url: /(?:https?|ftp):\/\/[^\s<>[\]()]+/g,

  // Markdown links [text](url) and ![alt](url)
  markdownLink: /!?\[[^\]]*\]\([^)]+\)/g,

  // Existing wikilinks [[...]]
  wikilink: /\[\[[^\]]+\]\]/g,

  // HTML tags
  htmlTag: /<[^>]+>/g,

  // HTML comments
  htmlComment: /<!--[\s\S]*?-->/g,

  // LaTeX math blocks
  mathBlock: /\$\$[\s\S]*?\$\$/g,

  // Inline math
  inlineMath: /\$[^$\n]+\$/g,
};

/**
 * Find all exclusion zones in a document
 */
export function findExclusionZones(
  content: string,
  frontmatterOffset: number = 0
): ExclusionZone[] {
  const zones: ExclusionZone[] = [];

  // Add frontmatter zone if present
  if (frontmatterOffset > 0) {
    zones.push({
      start: 0,
      end: frontmatterOffset,
      type: 'frontmatter',
    });
  }

  // Find code blocks first (they have priority)
  for (const match of content.matchAll(PATTERNS.codeBlock)) {
    if (match.index !== undefined) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: 'code_block',
      });
    }
  }

  // Find inline code
  for (const match of content.matchAll(PATTERNS.inlineCode)) {
    if (match.index !== undefined) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: 'inline_code',
      });
    }
  }

  // Find URLs
  for (const match of content.matchAll(PATTERNS.url)) {
    if (match.index !== undefined) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: 'url',
      });
    }
  }

  // Find existing wikilinks
  for (const match of content.matchAll(PATTERNS.wikilink)) {
    if (match.index !== undefined) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: 'existing_link',
      });
    }
  }

  // Find markdown links
  for (const match of content.matchAll(PATTERNS.markdownLink)) {
    if (match.index !== undefined) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: 'existing_link',
      });
    }
  }

  // Find HTML tags
  for (const match of content.matchAll(PATTERNS.htmlTag)) {
    if (match.index !== undefined) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: 'html_tag',
      });
    }
  }

  // Find HTML comments
  for (const match of content.matchAll(PATTERNS.htmlComment)) {
    if (match.index !== undefined) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: 'html_tag',
      });
    }
  }

  // Find math blocks (treat as code)
  for (const match of content.matchAll(PATTERNS.mathBlock)) {
    if (match.index !== undefined) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: 'code_block',
      });
    }
  }

  // Find inline math
  for (const match of content.matchAll(PATTERNS.inlineMath)) {
    if (match.index !== undefined) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: 'inline_code',
      });
    }
  }

  // Sort by start position and merge overlapping zones
  return mergeZones(zones);
}

/**
 * Merge overlapping exclusion zones
 */
function mergeZones(zones: ExclusionZone[]): ExclusionZone[] {
  if (zones.length === 0) return [];

  // Sort by start position
  zones.sort((a, b) => a.start - b.start);

  const merged: ExclusionZone[] = [];
  let current = zones[0];

  if (!current) return [];

  for (let i = 1; i < zones.length; i++) {
    const next = zones[i];
    if (!next) continue;

    if (next.start <= current.end) {
      // Overlapping or adjacent - extend current zone
      current = {
        start: current.start,
        end: Math.max(current.end, next.end),
        type: current.type, // Keep the type of the first zone
      };
    } else {
      // Non-overlapping - save current and start new
      merged.push(current);
      current = next;
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Check if a position is within an exclusion zone
 */
export function isInExclusionZone(
  position: number,
  zones: ExclusionZone[]
): boolean {
  return zones.some(zone => position >= zone.start && position < zone.end);
}

/**
 * Check if a range overlaps with any exclusion zone
 */
export function overlapsExclusionZone(
  start: number,
  end: number,
  zones: ExclusionZone[]
): boolean {
  return zones.some(zone => start < zone.end && end > zone.start);
}

/**
 * Filter out matches that overlap with exclusion zones
 */
export function filterExcludedMatches<T extends { start: number; end: number }>(
  matches: T[],
  zones: ExclusionZone[]
): T[] {
  return matches.filter(match => !overlapsExclusionZone(match.start, match.end, zones));
}

/**
 * Get content with exclusion zones replaced by spaces
 * (useful for text analysis that needs position preservation)
 */
export function maskExclusionZones(content: string, zones: ExclusionZone[]): string {
  let masked = content;

  // Process zones in reverse order to preserve positions
  const sortedZones = [...zones].sort((a, b) => b.start - a.start);

  for (const zone of sortedZones) {
    const before = masked.slice(0, zone.start);
    const after = masked.slice(zone.end);
    const replacement = ' '.repeat(zone.end - zone.start);
    masked = before + replacement + after;
  }

  return masked;
}
