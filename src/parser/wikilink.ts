import type { WikiLink } from '../core/types/index.js';
import { findExclusionZones, filterExcludedMatches, type ExclusionZone } from './exclusions.js';

// Wikilink pattern: [[target]] or [[target|display]]
// Also supports [[id:node-id]] for direct ID references
const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// ID prefix for direct node references
const ID_PREFIX = 'id:';

export interface WikiLinkParseResult {
  links: WikiLink[];
  exclusionZones: ExclusionZone[];
}

/**
 * Extract all wikilinks from content
 */
export function extractWikilinks(
  content: string,
  contentStartOffset: number = 0
): WikiLinkParseResult {
  const exclusionZones = findExclusionZones(content, contentStartOffset);
  const rawLinks: WikiLink[] = [];

  // Find all wikilinks
  for (const match of content.matchAll(WIKILINK_REGEX)) {
    if (match.index === undefined) continue;

    const raw = match[0];
    const targetPart = match[1]?.trim() ?? '';
    const displayPart = match[2]?.trim();

    // Check for id: prefix
    const isIdLink = targetPart.startsWith(ID_PREFIX);
    const target = isIdLink ? targetPart.slice(ID_PREFIX.length) : targetPart;

    // Display text: explicit > target without id: prefix
    const display = displayPart ?? target;

    const start = match.index + contentStartOffset;
    const end = start + raw.length;

    rawLinks.push({
      raw,
      target,
      display,
      isIdLink,
      start,
      end,
    });
  }

  // Filter out links that are inside exclusion zones
  // (but keep the wikilinks themselves as valid - they create new exclusion zones)
  const links = filterExcludedMatches(rawLinks, exclusionZones.filter(z => z.type !== 'existing_link'));

  return { links, exclusionZones };
}

/**
 * Extract link targets only (simplified version)
 */
export function extractLinkTargets(content: string): string[] {
  const { links } = extractWikilinks(content);
  return links.map(link => link.target);
}

/**
 * Check if a string contains wikilinks
 */
export function hasWikilinks(content: string): boolean {
  WIKILINK_REGEX.lastIndex = 0;
  return WIKILINK_REGEX.test(content);
}

/**
 * Create a wikilink string
 */
export function createWikilink(
  target: string,
  display?: string,
  useIdPrefix: boolean = false
): string {
  const targetPart = useIdPrefix ? `id:${target}` : target;

  if (display && display !== target) {
    return `[[${targetPart}|${display}]]`;
  }

  return `[[${targetPart}]]`;
}

/**
 * Replace text with a wikilink at a specific position
 */
export function insertWikilink(
  content: string,
  start: number,
  end: number,
  target: string,
  display?: string
): string {
  const before = content.slice(0, start);
  const after = content.slice(end);
  const link = createWikilink(target, display);
  return before + link + after;
}

/**
 * Get all unique link targets from content
 */
export function getUniqueTargets(content: string): Set<string> {
  const { links } = extractWikilinks(content);
  return new Set(links.map(link => link.target));
}

/**
 * Normalize a link target for comparison
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Case-insensitive comparison done separately
 */
export function normalizeTarget(target: string): string {
  return target
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Check if two link targets match (case-insensitive)
 */
export function targetsMatch(target1: string, target2: string): boolean {
  return normalizeTarget(target1).toLowerCase() === normalizeTarget(target2).toLowerCase();
}

/**
 * Parse a wikilink string into components
 */
export function parseWikilinkString(wikilink: string): WikiLink | null {
  const match = wikilink.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);

  if (!match) return null;

  const targetPart = match[1]?.trim() ?? '';
  const displayPart = match[2]?.trim();

  const isIdLink = targetPart.startsWith(ID_PREFIX);
  const target = isIdLink ? targetPart.slice(ID_PREFIX.length) : targetPart;
  const display = displayPart ?? target;

  return {
    raw: wikilink,
    target,
    display,
    isIdLink,
    start: 0,
    end: wikilink.length,
  };
}

// Default context window size (can be overridden via config)
const DEFAULT_CONTEXT_CHARS = 50;

/**
 * Get context around a wikilink (surrounding text)
 */
export function getWikilinkContext(
  content: string,
  link: WikiLink,
  contextChars: number = DEFAULT_CONTEXT_CHARS
): string {
  const start = Math.max(0, link.start - contextChars);
  const end = Math.min(content.length, link.end + contextChars);

  let context = content.slice(start, end);

  // Add ellipsis if truncated
  if (start > 0) context = '...' + context;
  if (end < content.length) context = context + '...';

  return context;
}
