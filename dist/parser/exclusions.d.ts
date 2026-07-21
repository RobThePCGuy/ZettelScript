/**
 * Exclusion zones for wikilink detection.
 * These areas should not be scanned for wikilinks or unlinked mentions.
 */
export interface ExclusionZone {
    start: number;
    end: number;
    type: 'code_block' | 'inline_code' | 'url' | 'existing_link' | 'frontmatter' | 'html_tag';
}
/**
 * Find all exclusion zones in a document
 */
export declare function findExclusionZones(content: string, frontmatterOffset?: number): ExclusionZone[];
/**
 * Check if a position is within an exclusion zone
 */
export declare function isInExclusionZone(position: number, zones: ExclusionZone[]): boolean;
/**
 * Check if a range overlaps with any exclusion zone
 */
export declare function overlapsExclusionZone(start: number, end: number, zones: ExclusionZone[]): boolean;
/**
 * Filter out matches that overlap with exclusion zones
 */
export declare function filterExcludedMatches<T extends {
    start: number;
    end: number;
}>(matches: T[], zones: ExclusionZone[]): T[];
/**
 * Get content with exclusion zones replaced by spaces
 * (useful for text analysis that needs position preservation)
 */
export declare function maskExclusionZones(content: string, zones: ExclusionZone[]): string;
//# sourceMappingURL=exclusions.d.ts.map