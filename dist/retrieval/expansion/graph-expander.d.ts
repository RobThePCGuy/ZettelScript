import type { EdgeType, ZettelScriptConfig } from '../../core/types/index.js';
import { EdgeRepository } from '../../storage/database/repositories/index.js';
export interface ExpansionOptions {
    maxDepth: number;
    budget: number;
    edgeTypes: EdgeType[];
    decayFactor: number;
    includeIncoming: boolean;
    scoreThreshold?: number;
}
export interface ExpandedNode {
    nodeId: string;
    depth: number;
    score: number;
    path: string[];
    edgeType: EdgeType | null;
}
export interface GraphExpanderOptions {
    edgeRepository: EdgeRepository;
    config?: ZettelScriptConfig;
}
/**
 * Bounded graph expansion for GraphRAG retrieval
 *
 * Algorithm (from spec 7.3):
 * frontier = seed_nodes
 * for depth in 1..max_depth:
 *     if visited_count >= budget: break
 *     for node in frontier:
 *         for edge in outgoing_edges(node, allowed_types):
 *             score = current_score * edge_weight * decay^depth
 *             accumulated_scores[edge.target] = max(existing, score)
 *     frontier = newly_discovered_nodes
 */
export declare class GraphExpander {
    private edgeRepo;
    private config;
    constructor(options: GraphExpanderOptions | EdgeRepository);
    /**
     * Expand from seed nodes with bounded traversal
     */
    expand(seeds: Array<{
        nodeId: string;
        score: number;
    }>, options: ExpansionOptions): Promise<ExpandedNode[]>;
    /**
     * Get edges for a node
     */
    private getEdges;
    /**
     * Expand with prioritized edge types
     * Some edge types are more valuable for retrieval
     */
    expandPrioritized(seeds: Array<{
        nodeId: string;
        score: number;
    }>, options: ExpansionOptions, edgeWeights: Partial<Record<EdgeType, number>>): Promise<ExpandedNode[]>;
    /**
     * Get expansion statistics
     */
    getExpansionStats(results: ExpandedNode[]): {
        totalNodes: number;
        maxDepth: number;
        avgScore: number;
        edgeTypeCounts: Record<string, number>;
    };
}
//# sourceMappingURL=graph-expander.d.ts.map