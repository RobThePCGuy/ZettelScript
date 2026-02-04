/**
 * Suggestion Engine - Phase 2.1
 *
 * Computes candidate edges from various signals:
 * - Mentions (text co-occurrence)
 * - Semantic similarity (below wormhole threshold)
 * - Graph proximity
 *
 * Per Phase 2 Design Document Section 3.
 */

import {
  NodeRepository,
  EdgeRepository,
  CandidateEdgeRepository,
} from '../storage/database/repositories/index.js';
import { MentionRepository } from '../storage/database/repositories/mention-repository.js';
import { EmbeddingRepository } from '../storage/database/repositories/embedding-repository.js';
import type { CandidateEdge, EdgeType } from '../core/types/index.js';
import { generateSuggestionId, isUndirectedEdgeType, LAYER_A_EDGES } from '../core/types/index.js';

/**
 * Configuration for suggestion computation.
 * Per Phase 2 Design Section 3.1.
 */
export interface SuggestionConfig {
  mentions: {
    minOccurrences: number; // Default: 2 - Avoid single-mention noise
    maxResults: number; // Default: 20
  };
  semantic: {
    minSimilarity: number; // Default: 0.4 - Below this, too weak
    maxSimilarity: number; // Default: 0.74 - At 0.75+, it's a wormhole
    maxResults: number; // Default: 20
  };
}

export const DEFAULT_SUGGESTION_CONFIG: SuggestionConfig = {
  mentions: {
    minOccurrences: 2,
    maxResults: 20,
  },
  semantic: {
    minSimilarity: 0.4,
    maxSimilarity: 0.74,
    maxResults: 20,
  },
};

/**
 * Result of computing candidates for a scope.
 */
export interface CandidateComputationResult {
  created: CandidateEdge[];
  updated: CandidateEdge[];
  total: number;
}

/**
 * Mention aggregation intermediate result.
 */
interface MentionAggregation {
  fromId: string;
  toId: string;
  count: number;
  reasons: string[];
}

/**
 * Engine for computing candidate edge suggestions.
 */
export class SuggestionEngine {
  private config: SuggestionConfig;

  constructor(
    _nodeRepository: NodeRepository,
    private edgeRepository: EdgeRepository,
    private mentionRepository: MentionRepository,
    private embeddingRepository: EmbeddingRepository,
    private candidateEdgeRepository: CandidateEdgeRepository,
    config?: Partial<SuggestionConfig>
  ) {
    this.config = {
      mentions: { ...DEFAULT_SUGGESTION_CONFIG.mentions, ...config?.mentions },
      semantic: { ...DEFAULT_SUGGESTION_CONFIG.semantic, ...config?.semantic },
    };
  }

  /**
   * Compute candidate edges for mentions in a given scope.
   *
   * Per Phase 2 Design Section 3.3:
   * - Filter: mentionMinOccurrences >= 2
   * - Group by (fromId, toId) pair
   * - Create/upsert CandidateEdge records
   */
  async computeMentionCandidates(scopeNodeIds: string[]): Promise<CandidateComputationResult> {
    if (scopeNodeIds.length === 0) {
      return { created: [], updated: [], total: 0 };
    }

    // Get existing Layer A edges to filter out already-connected pairs
    const existingLayerA = await this.getLayerAConnections(scopeNodeIds);

    // Aggregate mentions by pair
    const aggregations = await this.aggregateMentionsForScope(scopeNodeIds);

    // Filter by min occurrences and existing connections
    const filtered = aggregations.filter((agg) => {
      if (agg.count < this.config.mentions.minOccurrences) return false;
      if (this.isAlreadyConnected(agg.fromId, agg.toId, existingLayerA)) return false;
      return true;
    });

    // Sort by count descending and limit
    filtered.sort((a, b) => b.count - a.count);
    const limited = filtered.slice(0, this.config.mentions.maxResults);

    // Create/upsert candidate edges
    const created: CandidateEdge[] = [];
    const updated: CandidateEdge[] = [];

    for (const agg of limited) {
      const edgeType: EdgeType = 'mention';
      const suggestionId = generateSuggestionId(
        agg.fromId,
        agg.toId,
        edgeType,
        isUndirectedEdgeType(edgeType)
      );

      const existing = await this.candidateEdgeRepository.findById(suggestionId);

      if (existing) {
        // Update with merged signals
        const updatedCandidate = await this.candidateEdgeRepository.update(suggestionId, {
          signals: {
            ...existing.signals,
            mentionCount: agg.count,
          },
          reasons: mergeReasons(existing.reasons || [], agg.reasons),
        });
        updated.push(updatedCandidate);
      } else {
        // Create new
        const candidate = await this.candidateEdgeRepository.create({
          suggestionId,
          fromId: agg.fromId,
          toId: agg.toId,
          suggestedEdgeType: edgeType,
          signals: { mentionCount: agg.count },
          reasons: agg.reasons.slice(0, 3),
        });
        created.push(candidate);
      }
    }

    return {
      created,
      updated,
      total: created.length + updated.length,
    };
  }

  /**
   * Compute candidate edges from semantic similarity.
   *
   * Per Phase 2 Design Section 3.1:
   * - semanticMinSimilarity: 0.4 (below this, too weak)
   * - semanticMaxSimilarity: 0.74 (at 0.75+, it's a wormhole)
   */
  async computeSemanticCandidates(scopeNodeIds: string[]): Promise<CandidateComputationResult> {
    if (scopeNodeIds.length === 0) {
      return { created: [], updated: [], total: 0 };
    }

    // Get existing Layer A edges
    const existingLayerA = await this.getLayerAConnections(scopeNodeIds);

    // Get embeddings for scope nodes
    const embeddings = await this.embeddingRepository.findByNodeIds(scopeNodeIds);
    if (embeddings.length < 2) {
      return { created: [], updated: [], total: 0 };
    }

    // Find semantic near-misses
    const candidates: Array<{
      fromId: string;
      toId: string;
      similarity: number;
    }> = [];

    // Compare all pairs within scope
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        const e1 = embeddings[i]!;
        const e2 = embeddings[j]!;

        // Skip if already connected by Layer A
        if (this.isAlreadyConnected(e1.nodeId, e2.nodeId, existingLayerA)) {
          continue;
        }

        const similarity = cosineSimilarity(e1.embedding, e2.embedding);

        // Check if in "near-miss" range
        if (
          similarity >= this.config.semantic.minSimilarity &&
          similarity < this.config.semantic.maxSimilarity
        ) {
          candidates.push({
            fromId: e1.nodeId,
            toId: e2.nodeId,
            similarity,
          });
        }
      }
    }

    // Sort by similarity descending and limit
    candidates.sort((a, b) => b.similarity - a.similarity);
    const limited = candidates.slice(0, this.config.semantic.maxResults);

    // Create/upsert candidate edges
    const created: CandidateEdge[] = [];
    const updated: CandidateEdge[] = [];

    for (const cand of limited) {
      const edgeType: EdgeType = 'semantic_suggestion';
      const suggestionId = generateSuggestionId(
        cand.fromId,
        cand.toId,
        edgeType,
        isUndirectedEdgeType(edgeType)
      );

      const existing = await this.candidateEdgeRepository.findById(suggestionId);

      if (existing) {
        // Update with new similarity
        const updatedCandidate = await this.candidateEdgeRepository.update(suggestionId, {
          signals: {
            ...existing.signals,
            semantic: cand.similarity,
          },
          reasons: mergeReasons(existing.reasons || [], [
            `Semantic similarity: ${(cand.similarity * 100).toFixed(0)}%`,
          ]),
        });
        updated.push(updatedCandidate);
      } else {
        // Create new
        const candidate = await this.candidateEdgeRepository.create({
          suggestionId,
          fromId: cand.fromId,
          toId: cand.toId,
          suggestedEdgeType: edgeType,
          signals: { semantic: cand.similarity },
          reasons: [`Semantic similarity: ${(cand.similarity * 100).toFixed(0)}%`],
        });
        created.push(candidate);
      }
    }

    return {
      created,
      updated,
      total: created.length + updated.length,
    };
  }

  /**
   * Compute all candidate types for a scope.
   */
  async computeAllCandidates(scopeNodeIds: string[]): Promise<{
    mentions: CandidateComputationResult;
    semantic: CandidateComputationResult;
    total: number;
  }> {
    const mentions = await this.computeMentionCandidates(scopeNodeIds);
    const semantic = await this.computeSemanticCandidates(scopeNodeIds);

    return {
      mentions,
      semantic,
      total: mentions.total + semantic.total,
    };
  }

  /**
   * Get all Layer A edge connections for nodes in scope.
   * Returns a Set of normalized pair keys for fast lookup.
   */
  private async getLayerAConnections(nodeIds: string[]): Promise<Set<string>> {
    const connections = new Set<string>();

    for (const nodeId of nodeIds) {
      const edges = await this.edgeRepository.findConnected(nodeId);

      for (const edge of edges) {
        // Only consider Layer A edges
        if (!LAYER_A_EDGES.includes(edge.edgeType as EdgeType)) {
          continue;
        }

        // Create normalized key (smaller ID first)
        const key = normalizeEdgePair(edge.sourceId, edge.targetId);
        connections.add(key);
      }
    }

    return connections;
  }

  /**
   * Check if two nodes are already connected by Layer A edge.
   */
  private isAlreadyConnected(
    nodeId1: string,
    nodeId2: string,
    layerAConnections: Set<string>
  ): boolean {
    const key = normalizeEdgePair(nodeId1, nodeId2);
    return layerAConnections.has(key);
  }

  /**
   * Aggregate mentions by (source, target) pair.
   * Counts occurrences and collects reasons.
   */
  private async aggregateMentionsForScope(nodeIds: string[]): Promise<MentionAggregation[]> {
    const aggregations = new Map<string, MentionAggregation>();

    for (const nodeId of nodeIds) {
      // Get mentions where this node is the source
      const mentions = await this.mentionRepository.findBySourceId(nodeId);

      for (const mention of mentions) {
        // Only count non-rejected mentions
        if (mention.status === 'rejected') continue;

        const key = normalizeEdgePair(mention.sourceId, mention.targetId);

        if (!aggregations.has(key)) {
          aggregations.set(key, {
            fromId: mention.sourceId,
            toId: mention.targetId,
            count: 0,
            reasons: [],
          });
        }

        const agg = aggregations.get(key)!;
        agg.count++;

        // Build reason from surface text
        if (mention.surfaceText && agg.reasons.length < 3) {
          const reason = `Mentioned as "${mention.surfaceText}"`;
          if (!agg.reasons.includes(reason)) {
            agg.reasons.push(reason);
          }
        }
      }
    }

    return Array.from(aggregations.values());
  }
}

/**
 * Compute cosine similarity between two embedding vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Create a normalized edge pair key (smaller ID first).
 */
function normalizeEdgePair(id1: string, id2: string): string {
  return id1 < id2 ? `${id1}|${id2}` : `${id2}|${id1}`;
}

/**
 * Merge two reason arrays, keeping unique values up to max 3.
 */
function mergeReasons(existing: string[], newReasons: string[]): string[] {
  const merged = [...existing];
  for (const reason of newReasons) {
    if (!merged.includes(reason) && merged.length < 3) {
      merged.push(reason);
    }
  }
  return merged;
}

// ============================================================================
// Orphan Score Computation (Phase 2.1 Item 6)
// ============================================================================

/**
 * Orphan score weights per DESIGN.md Section 12.2.
 */
export const ORPHAN_WEIGHTS = {
  semanticPull: 0.45,
  lowTruthDegree: 0.25,
  mentionPressure: 0.2,
  importance: 0.1,
};

/**
 * Orphan entry with computed score and reasons.
 * Per Phase 2 Design Section 2.3.
 */
export interface OrphanEntry {
  nodeId: string;
  title: string;
  path: string;
  orphanScore: number;
  severity: 'low' | 'med' | 'high';
  percentile: number;
  reasons: string[];
  relatedNodeIds: string[];
  components: {
    semanticPull: number;
    lowTruthDegree: number;
    mentionPressure: number;
    importance: number;
  };
}

/**
 * Configuration for orphan computation.
 */
export interface OrphanConfig {
  minScore: number; // Default: 0.3
  maxResults: number; // Default: 10
  topSemanticNeighbors: number; // Default: 5 - How many neighbors to consider for semantic pull
  recencyDays: number; // Default: 30 - Timeframe for recency normalization
}

export const DEFAULT_ORPHAN_CONFIG: OrphanConfig = {
  minScore: 0.3,
  maxResults: 10,
  topSemanticNeighbors: 5,
  recencyDays: 30,
};

/**
 * Orphan computation engine.
 * Computes orphan scores for nodes that are semantically connected
 * but lack explicit (Layer A) edges.
 */
export class OrphanEngine {
  private config: OrphanConfig;

  constructor(
    private nodeRepository: NodeRepository,
    private edgeRepository: EdgeRepository,
    private mentionRepository: MentionRepository,
    private embeddingRepository: EmbeddingRepository,
    config?: Partial<OrphanConfig>
  ) {
    this.config = { ...DEFAULT_ORPHAN_CONFIG, ...config };
  }

  /**
   * Compute orphan scores for nodes in scope.
   *
   * Per DESIGN.md Section 12.2:
   * orphanScore = 0.45 * semanticPull + 0.25 * (1/(1+truthDegree)) + 0.20 * mentionPressure + 0.10 * importance
   */
  async computeOrphanScores(scopeNodeIds: string[]): Promise<OrphanEntry[]> {
    if (scopeNodeIds.length === 0) {
      return [];
    }

    // Get nodes in scope
    const nodes = await this.nodeRepository.findByIds(scopeNodeIds);
    if (nodes.length === 0) {
      return [];
    }

    // Build indexes for efficient computation
    const layerADegrees = await this.computeLayerADegrees(scopeNodeIds);
    const unresolvedMentionCounts = await this.computeUnresolvedMentionCounts(scopeNodeIds);
    const maxMentionCount = Math.max(...Array.from(unresolvedMentionCounts.values()), 1);
    const semanticNeighbors = await this.computeSemanticNeighbors(scopeNodeIds);

    // Compute scores for each node
    const entries: OrphanEntry[] = [];
    const now = Date.now();

    for (const node of nodes) {
      // Skip ghosts
      if (node.isGhost) continue;

      const truthDegree = layerADegrees.get(node.nodeId) || 0;
      const mentionCount = unresolvedMentionCounts.get(node.nodeId) || 0;
      const neighbors = semanticNeighbors.get(node.nodeId) || [];

      // Component 1: Semantic pull (average similarity to top neighbors NOT connected by Layer A)
      // Filter out neighbors that are already connected by Layer A
      // Note: neighbors don't have Layer A edges by construction in computeSemanticNeighbors
      const unconnectedNeighbors = neighbors;
      const semanticPull =
        unconnectedNeighbors.length > 0
          ? unconnectedNeighbors.reduce((sum, n) => sum + n.similarity, 0) /
            unconnectedNeighbors.length
          : 0;

      // Component 2: Low truth degree (inverted - lower degree = higher score)
      const lowTruthDegree = 1 / (1 + truthDegree);

      // Component 3: Mention pressure (normalized by max across vault)
      const mentionPressure = mentionCount / maxMentionCount;

      // Component 4: Importance (recency score)
      const importance = this.computeRecencyScore(node.updatedAt, now);

      // Compute final score
      const orphanScore =
        ORPHAN_WEIGHTS.semanticPull * semanticPull +
        ORPHAN_WEIGHTS.lowTruthDegree * lowTruthDegree +
        ORPHAN_WEIGHTS.mentionPressure * mentionPressure +
        ORPHAN_WEIGHTS.importance * importance;

      // Build reasons
      const reasons: string[] = [];
      if (semanticPull > 0.3) {
        reasons.push(`Similar to ${unconnectedNeighbors.length} unlinked note(s)`);
      }
      if (truthDegree === 0) {
        reasons.push('No explicit links');
      } else if (truthDegree < 3) {
        reasons.push(`Only ${truthDegree} explicit link(s)`);
      }
      if (mentionCount > 0) {
        reasons.push(`Mentioned ${mentionCount} time(s) without link`);
      }

      entries.push({
        nodeId: node.nodeId,
        title: node.title,
        path: node.path,
        orphanScore,
        severity: 'low', // Will be set after percentile calculation
        percentile: 0, // Will be calculated
        reasons: reasons.slice(0, 3),
        relatedNodeIds: unconnectedNeighbors.slice(0, 3).map((n) => n.nodeId),
        components: {
          semanticPull,
          lowTruthDegree,
          mentionPressure,
          importance,
        },
      });
    }

    // Sort by score descending
    entries.sort((a, b) => b.orphanScore - a.orphanScore);

    // Calculate percentiles and severity
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const percentile = ((entries.length - i) / entries.length) * 100;
      entry.percentile = Math.round(percentile);
      entry.severity = percentile >= 75 ? 'high' : percentile >= 50 ? 'med' : 'low';
    }

    // Filter by min score and limit
    return entries
      .filter((e) => e.orphanScore >= this.config.minScore)
      .slice(0, this.config.maxResults);
  }

  /**
   * Compute Layer A degree for each node in scope.
   */
  private async computeLayerADegrees(nodeIds: string[]): Promise<Map<string, number>> {
    const degrees = new Map<string, number>();

    for (const nodeId of nodeIds) {
      const edges = await this.edgeRepository.findConnected(nodeId);
      const layerACount = edges.filter((e) =>
        LAYER_A_EDGES.includes(e.edgeType as EdgeType)
      ).length;
      degrees.set(nodeId, layerACount);
    }

    return degrees;
  }

  /**
   * Count unresolved mentions (new or pending) pointing to each node.
   */
  private async computeUnresolvedMentionCounts(nodeIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();

    for (const nodeId of nodeIds) {
      const mentions = await this.mentionRepository.findByTargetId(nodeId);
      // Count only unresolved (new/pending) mentions
      const unresolvedCount = mentions.filter(
        (m) => m.status === 'new' || m.status === 'deferred'
      ).length;
      counts.set(nodeId, unresolvedCount);
    }

    return counts;
  }

  /**
   * Compute semantic neighbors for each node.
   * Returns top-K neighbors NOT connected by Layer A edges.
   */
  private async computeSemanticNeighbors(
    nodeIds: string[]
  ): Promise<Map<string, Array<{ nodeId: string; similarity: number }>>> {
    const result = new Map<string, Array<{ nodeId: string; similarity: number }>>();

    // Get embeddings for all nodes
    const embeddings = await this.embeddingRepository.findByNodeIds(nodeIds);
    const embeddingMap = new Map(embeddings.map((e) => [e.nodeId, e.embedding]));

    // Get Layer A connections
    const layerAConnections = new Set<string>();
    for (const nodeId of nodeIds) {
      const edges = await this.edgeRepository.findConnected(nodeId);
      for (const edge of edges) {
        if (LAYER_A_EDGES.includes(edge.edgeType as EdgeType)) {
          layerAConnections.add(normalizeEdgePair(edge.sourceId, edge.targetId));
        }
      }
    }

    // Compute neighbors for each node
    for (const nodeId of nodeIds) {
      const embedding = embeddingMap.get(nodeId);
      if (!embedding) {
        result.set(nodeId, []);
        continue;
      }

      const neighbors: Array<{ nodeId: string; similarity: number }> = [];

      for (const [otherNodeId, otherEmbedding] of embeddingMap) {
        if (otherNodeId === nodeId) continue;

        // Skip if already connected by Layer A
        if (layerAConnections.has(normalizeEdgePair(nodeId, otherNodeId))) {
          continue;
        }

        const similarity = cosineSimilarity(embedding, otherEmbedding);
        if (similarity > 0.1) {
          // Only include meaningful similarities
          neighbors.push({ nodeId: otherNodeId, similarity });
        }
      }

      // Sort by similarity and take top K
      neighbors.sort((a, b) => b.similarity - a.similarity);
      result.set(nodeId, neighbors.slice(0, this.config.topSemanticNeighbors));
    }

    return result;
  }

  /**
   * Compute recency score (0-1) based on days since last update.
   * More recent = higher score.
   */
  private computeRecencyScore(updatedAt: string, nowMs: number): number {
    const updatedMs = new Date(updatedAt).getTime();
    const daysSinceUpdate = (nowMs - updatedMs) / (1000 * 60 * 60 * 24);

    // Exponential decay over recencyDays
    return Math.exp(-daysSinceUpdate / this.config.recencyDays);
  }
}
