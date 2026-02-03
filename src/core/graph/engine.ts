import type {
  Node,
  Edge,
  EdgeType,
  BacklinkResult,
  NeighborResult,
  TraversalResult,
  ZettelScriptConfig,
} from '../types/index.js';
import { DEFAULT_CONFIG } from '../types/index.js';
import { NodeRepository, EdgeRepository } from '../../storage/database/repositories/index.js';
import {
  type PathResult,
  type KShortestPathsOptions,
  findKShortestPaths as findKShortestPathsImpl,
  buildAdjacencyLists,
  simpleBFS,
} from './pathfinder.js';

export interface GraphEngineOptions {
  nodeRepository: NodeRepository;
  edgeRepository: EdgeRepository;
  config?: ZettelScriptConfig;
}

/**
 * Graph engine for traversal, queries, and analytics
 */
export class GraphEngine {
  private nodeRepo: NodeRepository;
  private edgeRepo: EdgeRepository;
  private config: ZettelScriptConfig;

  constructor(options: GraphEngineOptions) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
    this.config = options.config ?? DEFAULT_CONFIG;
  }

  // ============================================================================
  // Node Operations
  // ============================================================================

  async getNode(nodeId: string): Promise<Node | null> {
    return this.nodeRepo.findById(nodeId);
  }

  async getNodeByPath(path: string): Promise<Node | null> {
    return this.nodeRepo.findByPath(path);
  }

  async getNodeByTitle(title: string): Promise<Node[]> {
    return this.nodeRepo.findByTitle(title);
  }

  async getAllNodes(): Promise<Node[]> {
    return this.nodeRepo.findAll();
  }

  // ============================================================================
  // Edge Operations
  // ============================================================================

  async getEdge(edgeId: string): Promise<Edge | null> {
    return this.edgeRepo.findById(edgeId);
  }

  async getOutgoingEdges(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]> {
    return this.edgeRepo.findOutgoing(nodeId, edgeTypes);
  }

  async getIncomingEdges(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]> {
    return this.edgeRepo.findIncoming(nodeId, edgeTypes);
  }

  // ============================================================================
  // Backlinks (Spec 6.2)
  // ============================================================================

  /**
   * Get backlinks for a node
   * backlinks(node) = { edge.source_id | edge.edge_type == 'explicit_link' AND edge.target_id == node }
   */
  async getBacklinks(nodeId: string): Promise<BacklinkResult[]> {
    const edges = await this.edgeRepo.findBacklinks(nodeId);

    if (edges.length === 0) return [];

    const sourceIds = edges.map((e) => e.sourceId);
    const sourceNodes = await this.nodeRepo.findByIds(sourceIds);
    const nodeMap = new Map(sourceNodes.map((n) => [n.nodeId, n]));

    const results: BacklinkResult[] = [];
    for (const edge of edges) {
      const sourceNode = nodeMap.get(edge.sourceId);
      if (sourceNode) {
        results.push({
          sourceNode,
          edge,
        });
      }
    }

    return results;
  }

  /**
   * Count backlinks for a node
   */
  async countBacklinks(nodeId: string): Promise<number> {
    const edges = await this.edgeRepo.findBacklinks(nodeId);
    return edges.length;
  }

  // ============================================================================
  // Neighbors
  // ============================================================================

  /**
   * Get all neighbors of a node (both directions)
   */
  async getNeighbors(nodeId: string, edgeTypes?: EdgeType[]): Promise<NeighborResult[]> {
    const neighborsWithNodes = await this.edgeRepo.findNeighborsWithNodes(nodeId, edgeTypes);

    return neighborsWithNodes.map(({ edge, node, direction }) => ({
      node: {
        nodeId: node.nodeId,
        title: node.title,
        type: node.type as Node['type'],
        path: node.path,
        createdAt: '',
        updatedAt: '',
      },
      edge,
      direction,
    }));
  }

  /**
   * Get outgoing neighbors
   */
  async getOutgoingNeighbors(nodeId: string, edgeTypes?: EdgeType[]): Promise<Node[]> {
    const edges = await this.edgeRepo.findOutgoing(nodeId, edgeTypes);

    if (edges.length === 0) return [];

    const targetIds = edges.map((e) => e.targetId);
    return this.nodeRepo.findByIds(targetIds);
  }

  /**
   * Get incoming neighbors
   */
  async getIncomingNeighbors(nodeId: string, edgeTypes?: EdgeType[]): Promise<Node[]> {
    const edges = await this.edgeRepo.findIncoming(nodeId, edgeTypes);

    if (edges.length === 0) return [];

    const sourceIds = edges.map((e) => e.sourceId);
    return this.nodeRepo.findByIds(sourceIds);
  }

  // ============================================================================
  // Bounded Graph Traversal (Spec 7.3)
  // ============================================================================

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
  async expandGraph(options: {
    seedNodes: Array<{ nodeId: string; score: number }>;
    maxDepth?: number;
    budget?: number;
    edgeTypes?: EdgeType[];
    decayFactor?: number;
    includeIncoming?: boolean;
  }): Promise<TraversalResult[]> {
    const {
      seedNodes,
      maxDepth = this.config.graph.defaultMaxDepth,
      budget = this.config.graph.defaultBudget,
      edgeTypes = ['explicit_link', 'sequence', 'hierarchy'],
      decayFactor = this.config.graph.decayFactor,
      includeIncoming = false,
    } = options;

    if (seedNodes.length === 0) return [];

    // Track scores and paths
    const scores = new Map<string, number>();
    const paths = new Map<string, string[]>();
    const depths = new Map<string, number>();

    // Initialize with seed nodes
    let frontier = new Set<string>();
    for (const seed of seedNodes) {
      scores.set(seed.nodeId, seed.score);
      paths.set(seed.nodeId, [seed.nodeId]);
      depths.set(seed.nodeId, 0);
      frontier.add(seed.nodeId);
    }

    const visited = new Set<string>(frontier);

    // BFS with decay
    for (let depth = 1; depth <= maxDepth; depth++) {
      if (visited.size >= budget) break;

      const newFrontier = new Set<string>();

      for (const nodeId of frontier) {
        if (visited.size >= budget) break;

        const currentScore = scores.get(nodeId) ?? 0;
        const currentPath = paths.get(nodeId) ?? [];

        // Get outgoing edges
        const outgoing = await this.edgeRepo.findOutgoing(nodeId, edgeTypes);

        // Optionally include incoming edges
        const incoming = includeIncoming ? await this.edgeRepo.findIncoming(nodeId, edgeTypes) : [];

        const allEdges = [...outgoing, ...incoming];

        for (const edge of allEdges) {
          if (visited.size >= budget) break;

          const targetId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;

          // Calculate new score with decay
          const edgeWeight = edge.strength ?? 1.0;
          const newScore = currentScore * edgeWeight * Math.pow(decayFactor, depth);

          // Update if new score is better
          const existingScore = scores.get(targetId) ?? 0;
          if (newScore > existingScore) {
            scores.set(targetId, newScore);
            paths.set(targetId, [...currentPath, targetId]);
            depths.set(targetId, depth);
          }

          if (!visited.has(targetId)) {
            visited.add(targetId);
            newFrontier.add(targetId);
          }
        }
      }

      frontier = newFrontier;

      if (frontier.size === 0) break;
    }

    // Build results sorted by score
    const results: TraversalResult[] = [];
    for (const [nodeId, score] of scores) {
      results.push({
        nodeId,
        depth: depths.get(nodeId) ?? 0,
        score,
        path: paths.get(nodeId) ?? [],
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  // ============================================================================
  // Path Finding
  // ============================================================================

  /**
   * Find shortest path between two nodes using optimized BFS
   */
  async findShortestPath(
    startId: string,
    endId: string,
    edgeTypes?: EdgeType[]
  ): Promise<string[] | null> {
    if (startId === endId) return [startId];

    // Fetch all relevant edges and build adjacency list in memory
    const edges = await this.edgeRepo.findAll(edgeTypes);
    const { forward } = buildAdjacencyLists(edges, edgeTypes);

    return simpleBFS(startId, endId, forward, this.config.graph.defaultMaxDepth * 5);
  }

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
  async findKShortestPaths(
    startId: string,
    endId: string,
    options?: KShortestPathsOptions
  ): Promise<{ paths: PathResult[]; reason: string }> {
    const edgeTypes =
      options?.edgeTypes ?? (['explicit_link', 'sequence', 'causes', 'semantic'] as EdgeType[]);

    // Fetch all relevant edges
    const edges = await this.edgeRepo.findAll(edgeTypes);

    return findKShortestPathsImpl(startId, endId, edges, options);
  }

  /**
   * Check if two nodes are connected
   */
  async areConnected(
    nodeId1: string,
    nodeId2: string,
    edgeTypes?: EdgeType[],
    maxDepth?: number
  ): Promise<boolean> {
    const depth = maxDepth ?? this.config.graph.defaultMaxDepth;
    const result = await this.expandGraph({
      seedNodes: [{ nodeId: nodeId1, score: 1 }],
      maxDepth: depth,
      budget: 1000,
      ...(edgeTypes && { edgeTypes }),
    });

    return result.some((r) => r.nodeId === nodeId2);
  }

  // ============================================================================
  // Subgraph Extraction
  // ============================================================================

  /**
   * Extract a subgraph around a node
   */
  async extractSubgraph(
    centerNodeId: string,
    radius: number = 2,
    edgeTypes?: EdgeType[]
  ): Promise<{ nodes: Node[]; edges: Edge[] }> {
    const traversal = await this.expandGraph({
      seedNodes: [{ nodeId: centerNodeId, score: 1 }],
      maxDepth: radius,
      budget: 100,
      ...(edgeTypes && { edgeTypes }),
      includeIncoming: true,
    });

    const nodeIds = traversal.map((t) => t.nodeId);
    const nodes = await this.nodeRepo.findByIds(nodeIds);

    // Get all edges between these nodes
    const nodeIdSet = new Set(nodeIds);
    const edges: Edge[] = [];

    for (const nodeId of nodeIds) {
      const outgoing = await this.edgeRepo.findOutgoing(nodeId, edgeTypes);
      for (const edge of outgoing) {
        if (nodeIdSet.has(edge.targetId)) {
          edges.push(edge);
        }
      }
    }

    return { nodes, edges };
  }

  // ============================================================================
  // Graph Statistics
  // ============================================================================

  /**
   * Calculate degree for a node
   */
  async getDegree(nodeId: string): Promise<{
    in: number;
    out: number;
    total: number;
  }> {
    const incoming = await this.edgeRepo.findIncoming(nodeId);
    const outgoing = await this.edgeRepo.findOutgoing(nodeId);

    return {
      in: incoming.length,
      out: outgoing.length,
      total: incoming.length + outgoing.length,
    };
  }

  /**
   * Find isolated nodes (no edges)
   */
  async findIsolatedNodes(): Promise<Node[]> {
    const allNodes = await this.nodeRepo.findAll();
    const isolated: Node[] = [];

    for (const node of allNodes) {
      const edges = await this.edgeRepo.findConnected(node.nodeId);
      if (edges.length === 0) {
        isolated.push(node);
      }
    }

    return isolated;
  }

  /**
   * Find nodes with high in-degree (potential hubs)
   */
  async findHighInDegreeNodes(threshold?: number): Promise<
    Array<{
      node: Node;
      inDegree: number;
    }>
  > {
    const minThreshold = threshold ?? this.config.moc?.defaultHubThreshold ?? 5;
    const allNodes = await this.nodeRepo.findAll();
    const results: Array<{ node: Node; inDegree: number }> = [];

    for (const node of allNodes) {
      const incoming = await this.edgeRepo.findIncoming(node.nodeId);
      if (incoming.length >= minThreshold) {
        results.push({ node, inDegree: incoming.length });
      }
    }

    return results.sort((a, b) => b.inDegree - a.inDegree);
  }

  // ============================================================================
  // Connected Components
  // ============================================================================

  /**
   * Find connected components in the graph
   */
  async findConnectedComponents(): Promise<string[][]> {
    const allNodes = await this.nodeRepo.findAll();
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const node of allNodes) {
      if (visited.has(node.nodeId)) continue;

      // BFS to find all connected nodes
      const component: string[] = [];
      const queue = [node.nodeId];

      while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId)) continue;

        visited.add(currentId);
        component.push(currentId);

        // Get all connected nodes (both directions)
        const edges = await this.edgeRepo.findConnected(currentId);
        for (const edge of edges) {
          const neighborId = edge.sourceId === currentId ? edge.targetId : edge.sourceId;
          if (!visited.has(neighborId)) {
            queue.push(neighborId);
          }
        }
      }

      if (component.length > 0) {
        components.push(component);
      }
    }

    // Sort by size (largest first)
    return components.sort((a, b) => b.length - a.length);
  }

  /**
   * Get the component containing a specific node
   */
  async getComponentContaining(nodeId: string): Promise<string[]> {
    const visited = new Set<string>();
    const component: string[] = [];
    const queue = [nodeId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || visited.has(currentId)) continue;

      visited.add(currentId);
      component.push(currentId);

      const edges = await this.edgeRepo.findConnected(currentId);
      for (const edge of edges) {
        const neighborId = edge.sourceId === currentId ? edge.targetId : edge.sourceId;
        if (!visited.has(neighborId)) {
          queue.push(neighborId);
        }
      }
    }

    return component;
  }
}
