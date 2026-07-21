/**
 * Reciprocal Rank Fusion (RRF) implementation
 *
 * Algorithm:
 * for each result in semantic_results:
 *     rrf_score += semantic_weight * (1 / (k + rank))
 * for each result in lexical_results:
 *     rrf_score += lexical_weight * (1 / (k + rank))
 * sort by rrf_score descending
 */
export interface RankedItem {
    id: string;
    score: number;
    source: string;
}
export interface FusionResult {
    id: string;
    score: number;
    sources: string[];
    ranks: Map<string, number>;
}
export interface RRFOptions {
    k?: number;
    weights?: Record<string, number>;
}
/**
 * Perform Reciprocal Rank Fusion on multiple result lists
 */
export declare function reciprocalRankFusion(resultLists: Map<string, RankedItem[]>, options?: RRFOptions): FusionResult[];
/**
 * Simple score combination (weighted average)
 */
export declare function weightedScoreFusion(resultLists: Map<string, RankedItem[]>, weights: Record<string, number>): FusionResult[];
/**
 * Interleave results from multiple sources
 */
export declare function interleave(resultLists: Map<string, RankedItem[]>, maxResults: number): FusionResult[];
/**
 * Combine fusion results with score boosting for items in multiple sources
 */
export declare function boostOverlap(results: FusionResult[], boostFactor?: number): FusionResult[];
//# sourceMappingURL=rrf.d.ts.map