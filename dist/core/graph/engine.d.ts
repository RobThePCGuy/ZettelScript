import type { Node, Edge, EdgeType, BacklinkResult, NeighborResult, TraversalResult, ZettelScriptConfig } from '../types/index.js';
import { NodeRepository, EdgeRepository } from '../../storage/database/repositories/index.js';
import { type PathResult, type KShortestPathsOptions } from './pathfinder.js';
export interface GraphEngineOptions {
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
    config?: ZettelScriptConfig;
}
/**
 * Graph engine for traversal, queries, and analytics
 */
export declare class GraphEngine {
    private nodeRepo;
    private edgeRepo;
    private config;
    constructor(options: GraphEngineOptions);
    getNode(nodeId: string): Promise<Node | null>;
    getNodeByPath(path: string): Promise<Node | null>;
    getNodeByTitle(title: string): Promise<Node[]>;
    getAllNodes(): Promise<Node[]>;
    getEdge(edgeId: string): Promise<Edge | null>;
    getOutgoingEdges(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]>;
    getIncomingEdges(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]>;
    /**
     * Get backlinks for a node
     * backlinks(node) = { edge.source_id | edge.edge_type == 'explicit_link' AND edge.target_id == node }
     */
    getBacklinks(nodeId: string): Promise<BacklinkResult[]>;
    /**
     * Count backlinks for a node
     */
    countBacklinks(nodeId: string): Promise<number>;
    /**
     * Get all neighbors of a node (both directions)
     */
    getNeighbors(nodeId: string, edgeTypes?: EdgeType[]): Promise<NeighborResult[]>;
    /**
     * Get outgoing neighbors
     */
    getOutgoingNeighbors(nodeId: string, edgeTypes?: EdgeType[]): Promise<Node[]>;
    /**
     * Get incoming neighbors
     */
    getIncomingNeighbors(nodeId: string, edgeTypes?: EdgeType[]): Promise<Node[]>;
    /**
     * Bounded graph expansion from seed nodes
     *
     * Algorithm:
     * frontier = seed_nodes
     * for depth in 1..max_depth:
     *     if visited_count >= budget: break
     *     for node in frontier:
     *         for edge in outgoing_edges(node, allowed_types):
     *             score = current_score * edge_weight * decay^depth
     *             accumulated_scores[edge.target] = max(existing, score)
     *     frontier = newly_discovered_nodes
     */
    expandGraph(options: {
        seedNodes: Array<{
            nodeId: string;
            score: number;
        }>;
        maxDepth?: number;
        budget?: number;
        edgeTypes?: EdgeType[];
        decayFactor?: number;
        includeIncoming?: boolean;
    }): Promise<TraversalResult[]>;
    /**
     * Find shortest path between two nodes using optimized BFS
     */
    findShortestPath(startId: string, endId: string, edgeTypes?: EdgeType[]): Promise<string[] | null>;
    /**
     * Find K shortest diverse paths between two nodes
     *
     * Uses Yen's algorithm with Jaccard diversity filtering.
     *
     * @param startId - Starting node ID
     * @param endId - Ending node ID
     * @param options - Search options
     * @returns Array of path results and reason for stopping
     */
    findKShortestPaths(startId: string, endId: string, options?: KShortestPathsOptions): Promise<{
        paths: PathResult[];
        reason: string;
    }>;
    /**
     * Check if two nodes are connected
     */
    areConnected(nodeId1: string, nodeId2: string, edgeTypes?: EdgeType[], maxDepth?: number): Promise<boolean>;
    /**
     * Extract a subgraph around a node
     */
    extractSubgraph(centerNodeId: string, radius?: number, edgeTypes?: EdgeType[]): Promise<{
        nodes: Node[];
        edges: Edge[];
    }>;
    /**
     * Calculate degree for a node
     */
    getDegree(nodeId: string): Promise<{
        in: number;
        out: number;
        total: number;
    }>;
    /**
     * Find isolated nodes (no edges)
     */
    findIsolatedNodes(): Promise<Node[]>;
    /**
     * Find nodes with high in-degree (potential hubs)
     */
    findHighInDegreeNodes(threshold?: number): Promise<Array<{
        node: Node;
        inDegree: number;
    }>>;
    /**
     * Find connected components in the graph
     */
    findConnectedComponents(): Promise<string[][]>;
    /**
     * Get the component containing a specific node
     */
    getComponentContaining(nodeId: string): Promise<string[]>;
}
//# sourceMappingURL=engine.d.ts.map