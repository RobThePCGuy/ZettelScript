import { Command } from 'commander';
export interface HybridSearchConfig {
    enabled: boolean;
    wVec: number;
    wKw: number;
}
export declare const DEFAULT_HYBRID_CONFIG: HybridSearchConfig;
export interface GroupingConfig {
    enabled: boolean;
    kStrong: number;
    kWeak: number;
}
export declare const DEFAULT_GROUPING_CONFIG: GroupingConfig;
/**
 * Apply statistical grouping to scored results.
 * Uses mean + k*sigma threshold to identify natural group boundaries.
 *
 * @param results - Array of items with a score property, sorted descending by score
 * @param config - Grouping configuration
 * @param mode - 'strong' returns first group only, 'weak' returns up to 2 groups
 * @returns Indices of boundaries (positions where groups should be cut)
 */
export declare function findGroupBoundaries<T extends {
    score: number;
}>(results: T[], config: GroupingConfig): number[];
/**
 * Apply grouping to results, returning only the top group(s).
 *
 * @param results - Array sorted descending by score
 * @param config - Grouping configuration
 * @param maxGroups - Maximum number of groups to return (1 for strong, 2 for weak)
 * @returns Filtered array containing only the top group(s)
 */
export declare function applyGrouping<T extends {
    score: number;
}>(results: T[], config: GroupingConfig, maxGroups?: number): T[];
export declare const focusCommand: Command;
//# sourceMappingURL=focus.d.ts.map