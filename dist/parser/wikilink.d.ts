import type { WikiLink } from '../core/types/index.js';
import { type ExclusionZone } from './exclusions.js';
export interface WikiLinkParseResult {
    links: WikiLink[];
    exclusionZones: ExclusionZone[];
}
/**
 * Extract all wikilinks from content
 */
export declare function extractWikilinks(content: string, contentStartOffset?: number): WikiLinkParseResult;
/**
 * Extract link targets only (simplified version)
 */
export declare function extractLinkTargets(content: string): string[];
/**
 * Check if a string contains wikilinks
 */
export declare function hasWikilinks(content: string): boolean;
/**
 * Create a wikilink string
 */
export declare function createWikilink(target: string, display?: string, useIdPrefix?: boolean): string;
/**
 * Replace text with a wikilink at a specific position
 */
export declare function insertWikilink(content: string, start: number, end: number, target: string, display?: string): string;
/**
 * Get all unique link targets from content
 */
export declare function getUniqueTargets(content: string): Set<string>;
/**
 * Normalize a link target for comparison
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Case-insensitive comparison done separately
 */
export declare function normalizeTarget(target: string): string;
/**
 * Check if two link targets match (case-insensitive)
 */
export declare function targetsMatch(target1: string, target2: string): boolean;
/**
 * Parse a wikilink string into components
 */
export declare function parseWikilinkString(wikilink: string): WikiLink | null;
/**
 * Get context around a wikilink (surrounding text)
 */
export declare function getWikilinkContext(content: string, link: WikiLink, contextChars?: number): string;
//# sourceMappingURL=wikilink.d.ts.map