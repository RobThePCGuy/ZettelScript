import type { Edge, EdgeType } from '../types/index.js';
/**
 * Result of a path search
 */
export interface PathResult {
    path: string[];
    edges: EdgeType[];
    hopCount: number;
    score: number;
}
/**
 * Options for K-shortest paths search
 */
export interface KShortestPathsOptions {
    k?: number;
    edgeTypes?: EdgeType[];
    maxDepth?: number;
    overlapThreshold?: number;
    maxCandidates?: number;
    maxExtraHops?: number;
}
/**
 * Adjacency list entry
 */
interface AdjEntry {
    nodeId: string;
    edgeType: EdgeType;
}
/**
 * Build adjacency lists from edges
 */
export declare function buildAdjacencyLists(edges: Edge[], edgeTypes?: EdgeType[]): {
    forward: Map<string, AdjEntry[]>;
    backward: Map<string, AdjEntry[]>;
};
/**
 * Bidirectional BFS to find shortest path
 *
 * Key insight: Don't stop at first meeting. Track bestDistance and continue
 * until both frontiers exceed it.
 */
export declare function bidirectionalBFS(startId: string, endId: string, forward: Map<string, AdjEntry[]>, backward: Map<string, AdjEntry[]>, maxDepth: number, disabledEdges?: Set<string>, // Set of "sourceId->targetId" strings
disabledNodes?: Set<string>): {
    path: string[];
    edges: EdgeType[];
} | null;
/**
 * Calculate Jaccard overlap between two paths
 * Optionally excludes endpoints for short paths
 */
export declare function calculateJaccardOverlap(pathA: string[], pathB: string[], excludeEndpoints?: boolean): number;
/**
 * Calculate cosmetic score for a path
 * score = hopCount + sum of edge penalties
 */
export declare function calculatePathScore(edges: EdgeType[]): number;
/**
 * Check if a path is simple (no repeated nodes)
 */
export declare function isSimplePath(path: string[]): boolean;
/**
 * Yen's K-Shortest Paths algorithm with diversity filtering
 *
 * Algorithm:
 * 1. Find shortest path first
 * 2. For each spur node, temporarily remove edges to force deviation
 * 3. Find shortest path through spur node
 * 4. Add to candidate heap
 * 5. Filter by diversity (Jaccard overlap)
 */
export declare function findKShortestPaths(startId: string, endId: string, edges: Edge[], options?: KShortestPathsOptions): {
    paths: PathResult[];
    reason: string;
};
/**
 * Simple BFS for shortest path (for use in GraphEngine)
 * Uses in-memory adjacency for efficiency
 */
export declare function simpleBFS(startId: string, endId: string, forward: Map<string, AdjEntry[]>, maxDepth?: number): string[] | null;
export {};
//# sourceMappingURL=pathfinder.d.ts.map