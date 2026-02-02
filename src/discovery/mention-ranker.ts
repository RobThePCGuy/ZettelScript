import type { DetectedMention } from './mention-detector.js';
import type { ZettelScriptConfig } from '../core/types/index.js';
import { DEFAULT_CONFIG } from '../core/types/index.js';
import { EdgeRepository } from '../storage/database/repositories/index.js';
import { GraphEngine } from '../core/graph/engine.js';

export interface RankedMention extends DetectedMention {
  confidence: number;
  reasons: string[];
}

export interface MentionRankerOptions {
  edgeRepository: EdgeRepository;
  graphEngine: GraphEngine;
  config?: ZettelScriptConfig;
}

/**
 * Ranks detected mentions by likelihood of being intentional
 * Following spec 8.1 ranking factors:
 * - Ambiguity penalty
 * - Graph locality (distance from source)
 * - Centrality (importance in graph)
 * - Frequency (how often this target is mentioned)
 */
export class MentionRanker {
  private edgeRepo: EdgeRepository;
  private graphEngine: GraphEngine;
  private config: ZettelScriptConfig;

  // Weighting factors from config
  private weights: {
    locality: number;
    centrality: number;
    frequency: number;
    matchQuality: number;
  };

  private ambiguityPenalty: number;
  private confidenceThreshold: number;
  private expansionMaxDepth: number;
  private expansionBudget: number;

  constructor(options: MentionRankerOptions) {
    this.edgeRepo = options.edgeRepository;
    this.graphEngine = options.graphEngine;
    this.config = options.config ?? DEFAULT_CONFIG;

    // Initialize from config
    this.weights = { ...this.config.discovery.weights };
    this.ambiguityPenalty = this.config.discovery.ambiguityPenalty;
    this.confidenceThreshold = this.config.discovery.confidenceThreshold;
    this.expansionMaxDepth = this.config.discovery.expansionMaxDepth;
    this.expansionBudget = this.config.discovery.expansionBudget;
  }

  /**
   * Rank a list of detected mentions
   */
  async rank(mentions: DetectedMention[], sourceNodeId?: string): Promise<RankedMention[]> {
    if (mentions.length === 0) return [];

    // Get unique target IDs
    const targetIds = [...new Set(mentions.map(m => m.targetId))];

    // Calculate centrality scores
    const centralityScores = await this.calculateCentrality(targetIds);

    // Calculate locality scores if source provided
    const localityScores = sourceNodeId
      ? await this.calculateLocality(sourceNodeId, targetIds)
      : new Map<string, number>();

    // Calculate frequency scores
    const frequencyScores = await this.calculateFrequency(targetIds);

    // Rank each mention
    const ranked: RankedMention[] = [];

    for (const mention of mentions) {
      const reasons: string[] = [];
      let score = 0;

      // Match quality score
      const matchQualityScore = this.calculateMatchQuality(mention);
      score += matchQualityScore * this.weights.matchQuality;
      if (matchQualityScore > 0.7) {
        reasons.push('exact_match');
      }

      // Locality score
      const localityScore = localityScores.get(mention.targetId) ?? 0.5;
      score += localityScore * this.weights.locality;
      if (localityScore > 0.7) {
        reasons.push('nearby_in_graph');
      }

      // Centrality score
      const centralityScore = centralityScores.get(mention.targetId) ?? 0.5;
      score += centralityScore * this.weights.centrality;
      if (centralityScore > 0.7) {
        reasons.push('important_node');
      }

      // Frequency score
      const frequencyScore = frequencyScores.get(mention.targetId) ?? 0.5;
      score += frequencyScore * this.weights.frequency;
      if (frequencyScore > 0.7) {
        reasons.push('frequently_linked');
      }

      // Ambiguity penalty
      const ambiguousTargets = mentions.filter(
        m => m.surfaceText.toLowerCase() === mention.surfaceText.toLowerCase() &&
             m.targetId !== mention.targetId
      );
      if (ambiguousTargets.length > 0) {
        score *= this.ambiguityPenalty; // Reduce confidence for ambiguous matches
        reasons.push('ambiguous');
      }

      ranked.push({
        ...mention,
        confidence: Math.min(1, Math.max(0, score)),
        reasons,
      });
    }

    // Sort by confidence (descending)
    return ranked.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate match quality based on how well the surface text matches
   */
  private calculateMatchQuality(mention: DetectedMention): number {
    const surface = mention.surfaceText.toLowerCase();
    const target = mention.targetTitle.toLowerCase();

    // Exact match with original casing preserved
    if (mention.surfaceText === mention.targetTitle) {
      return 1.0;
    }

    // Case-insensitive exact match
    if (surface === target) {
      return 0.95;
    }

    // Alias match
    if (mention.matchType === 'alias') {
      return 0.85;
    }

    // Partial match (shouldn't happen with current detection, but handle it)
    return 0.7;
  }

  /**
   * Calculate centrality scores (based on incoming link count)
   */
  private async calculateCentrality(nodeIds: string[]): Promise<Map<string, number>> {
    const scores = new Map<string, number>();

    // Get max in-degree for normalization
    let maxInDegree = 1;
    const inDegrees = new Map<string, number>();

    for (const nodeId of nodeIds) {
      const incoming = await this.edgeRepo.findIncoming(nodeId);
      const inDegree = incoming.length;
      inDegrees.set(nodeId, inDegree);
      maxInDegree = Math.max(maxInDegree, inDegree);
    }

    // Normalize scores
    for (const nodeId of nodeIds) {
      const inDegree = inDegrees.get(nodeId) ?? 0;
      // Use log scale to prevent very popular nodes from dominating
      scores.set(nodeId, Math.log(inDegree + 1) / Math.log(maxInDegree + 1));
    }

    return scores;
  }

  /**
   * Calculate locality scores (graph distance from source)
   */
  private async calculateLocality(
    sourceNodeId: string,
    targetNodeIds: string[]
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>();

    // Expand from source to find distances
    const expansion = await this.graphEngine.expandGraph({
      seedNodes: [{ nodeId: sourceNodeId, score: 1 }],
      maxDepth: this.expansionMaxDepth,
      budget: this.expansionBudget,
      includeIncoming: true,
    });

    const distanceMap = new Map(expansion.map(e => [e.nodeId, e.depth]));

    for (const targetId of targetNodeIds) {
      const distance = distanceMap.get(targetId);

      if (distance === undefined) {
        // Not connected - low locality score
        scores.set(targetId, 0.1);
      } else if (distance === 0) {
        // Same node - shouldn't happen
        scores.set(targetId, 0);
      } else {
        // Score decreases with distance
        scores.set(targetId, 1 / distance);
      }
    }

    return scores;
  }

  /**
   * Calculate frequency scores (how often target is linked to)
   */
  private async calculateFrequency(nodeIds: string[]): Promise<Map<string, number>> {
    const scores = new Map<string, number>();

    // Count total incoming explicit links
    let maxLinks = 1;
    const linkCounts = new Map<string, number>();

    for (const nodeId of nodeIds) {
      const backlinks = await this.edgeRepo.findBacklinks(nodeId);
      const count = backlinks.length;
      linkCounts.set(nodeId, count);
      maxLinks = Math.max(maxLinks, count);
    }

    // Normalize
    for (const nodeId of nodeIds) {
      const count = linkCounts.get(nodeId) ?? 0;
      scores.set(nodeId, count / maxLinks);
    }

    return scores;
  }

  /**
   * Filter mentions below a confidence threshold
   */
  filterByThreshold(mentions: RankedMention[], threshold?: number): RankedMention[] {
    const thresh = threshold ?? this.confidenceThreshold;
    return mentions.filter(m => m.confidence >= thresh);
  }

  /**
   * Group mentions by target
   */
  groupByTarget(mentions: RankedMention[]): Map<string, RankedMention[]> {
    const groups = new Map<string, RankedMention[]>();

    for (const mention of mentions) {
      const existing = groups.get(mention.targetId) || [];
      existing.push(mention);
      groups.set(mention.targetId, existing);
    }

    return groups;
  }
}
