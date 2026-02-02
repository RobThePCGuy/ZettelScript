import type { Edge, EdgeType, ZettelScriptConfig } from '../../core/types/index.js';
import { DEFAULT_CONFIG } from '../../core/types/index.js';
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
export class GraphExpander {
  private edgeRepo: EdgeRepository;
  private config: ZettelScriptConfig;

  constructor(options: GraphExpanderOptions | EdgeRepository) {
    // Support both old and new constructor signature for backwards compatibility
    if ('edgeRepository' in options) {
      this.edgeRepo = options.edgeRepository;
      this.config = options.config ?? DEFAULT_CONFIG;
    } else {
      this.edgeRepo = options;
      this.config = DEFAULT_CONFIG;
    }
  }

  /**
   * Expand from seed nodes with bounded traversal
   */
  async expand(
    seeds: Array<{ nodeId: string; score: number }>,
    options: ExpansionOptions
  ): Promise<ExpandedNode[]> {
    const {
      maxDepth,
      budget,
      edgeTypes,
      decayFactor,
      includeIncoming,
      scoreThreshold = this.config.graph.scoreThreshold,
    } = options;

    if (seeds.length === 0) return [];

    // Track accumulated scores and paths
    const accumulated = new Map<string, ExpandedNode>();

    // Initialize with seeds
    let frontier = new Set<string>();
    for (const seed of seeds) {
      accumulated.set(seed.nodeId, {
        nodeId: seed.nodeId,
        depth: 0,
        score: seed.score,
        path: [seed.nodeId],
        edgeType: null,
      });
      frontier.add(seed.nodeId);
    }

    // BFS with decay
    for (let depth = 1; depth <= maxDepth; depth++) {
      if (accumulated.size >= budget) break;
      if (frontier.size === 0) break;

      const newFrontier = new Set<string>();

      for (const nodeId of frontier) {
        if (accumulated.size >= budget) break;

        const current = accumulated.get(nodeId);
        if (!current) continue;

        // Get edges
        const edges = await this.getEdges(nodeId, edgeTypes, includeIncoming);

        for (const edge of edges) {
          if (accumulated.size >= budget) break;

          const targetId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;

          // Calculate score with decay
          const edgeWeight = edge.strength ?? 1.0;
          const newScore = current.score * edgeWeight * Math.pow(decayFactor, depth);

          // Skip if below threshold
          if (newScore < scoreThreshold) continue;

          const existing = accumulated.get(targetId);

          if (!existing || newScore > existing.score) {
            accumulated.set(targetId, {
              nodeId: targetId,
              depth,
              score: newScore,
              path: [...current.path, targetId],
              edgeType: edge.edgeType as EdgeType,
            });

            if (!existing) {
              newFrontier.add(targetId);
            }
          }
        }
      }

      frontier = newFrontier;
    }

    // Convert to array and sort by score
    return Array.from(accumulated.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Get edges for a node
   */
  private async getEdges(
    nodeId: string,
    edgeTypes: EdgeType[],
    includeIncoming: boolean
  ): Promise<Edge[]> {
    const outgoing = await this.edgeRepo.findOutgoing(nodeId, edgeTypes);

    if (!includeIncoming) {
      return outgoing;
    }

    const incoming = await this.edgeRepo.findIncoming(nodeId, edgeTypes);
    return [...outgoing, ...incoming];
  }

  /**
   * Expand with prioritized edge types
   * Some edge types are more valuable for retrieval
   */
  async expandPrioritized(
    seeds: Array<{ nodeId: string; score: number }>,
    options: ExpansionOptions,
    edgeWeights: Partial<Record<EdgeType, number>>
  ): Promise<ExpandedNode[]> {
    const {
      maxDepth,
      budget,
      edgeTypes,
      decayFactor,
      includeIncoming,
      scoreThreshold = this.config.graph.scoreThreshold,
    } = options;

    if (seeds.length === 0) return [];

    const accumulated = new Map<string, ExpandedNode>();

    let frontier = new Set<string>();
    for (const seed of seeds) {
      accumulated.set(seed.nodeId, {
        nodeId: seed.nodeId,
        depth: 0,
        score: seed.score,
        path: [seed.nodeId],
        edgeType: null,
      });
      frontier.add(seed.nodeId);
    }

    for (let depth = 1; depth <= maxDepth; depth++) {
      if (accumulated.size >= budget) break;
      if (frontier.size === 0) break;

      const newFrontier = new Set<string>();

      for (const nodeId of frontier) {
        if (accumulated.size >= budget) break;

        const current = accumulated.get(nodeId);
        if (!current) continue;

        const edges = await this.getEdges(nodeId, edgeTypes, includeIncoming);

        for (const edge of edges) {
          if (accumulated.size >= budget) break;

          const targetId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;

          // Apply edge type weight
          const typeWeight = edgeWeights[edge.edgeType as EdgeType] ?? 1.0;
          const edgeWeight = (edge.strength ?? 1.0) * typeWeight;
          const newScore = current.score * edgeWeight * Math.pow(decayFactor, depth);

          if (newScore < scoreThreshold) continue;

          const existing = accumulated.get(targetId);

          if (!existing || newScore > existing.score) {
            accumulated.set(targetId, {
              nodeId: targetId,
              depth,
              score: newScore,
              path: [...current.path, targetId],
              edgeType: edge.edgeType as EdgeType,
            });

            if (!existing) {
              newFrontier.add(targetId);
            }
          }
        }
      }

      frontier = newFrontier;
    }

    return Array.from(accumulated.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Get expansion statistics
   */
  getExpansionStats(results: ExpandedNode[]): {
    totalNodes: number;
    maxDepth: number;
    avgScore: number;
    edgeTypeCounts: Record<string, number>;
  } {
    if (results.length === 0) {
      return {
        totalNodes: 0,
        maxDepth: 0,
        avgScore: 0,
        edgeTypeCounts: {},
      };
    }

    const edgeTypeCounts: Record<string, number> = {};
    let totalScore = 0;
    let maxDepth = 0;

    for (const result of results) {
      totalScore += result.score;
      maxDepth = Math.max(maxDepth, result.depth);

      if (result.edgeType) {
        edgeTypeCounts[result.edgeType] = (edgeTypeCounts[result.edgeType] || 0) + 1;
      }
    }

    return {
      totalNodes: results.length,
      maxDepth,
      avgScore: totalScore / results.length,
      edgeTypeCounts,
    };
  }
}
