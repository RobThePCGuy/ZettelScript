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
import { NodeRepository, EdgeRepository, CandidateEdgeRepository } from '../storage/database/repositories/index.js';
import { MentionRepository } from '../storage/database/repositories/mention-repository.js';
import { EmbeddingRepository } from '../storage/database/repositories/embedding-repository.js';
import type { CandidateEdge } from '../core/types/index.js';
/**
 * Configuration for suggestion computation.
 * Per Phase 2 Design Section 3.1.
 */
export interface SuggestionConfig {
    mentions: {
        minOccurrences: number;
        maxResults: number;
    };
    semantic: {
        minSimilarity: number;
        maxSimilarity: number;
        maxResults: number;
    };
}
export declare const DEFAULT_SUGGESTION_CONFIG: SuggestionConfig;
/**
 * Result of computing candidates for a scope.
 */
export interface CandidateComputationResult {
    created: CandidateEdge[];
    updated: CandidateEdge[];
    total: number;
}
/**
 * Engine for computing candidate edge suggestions.
 */
export declare class SuggestionEngine {
    private edgeRepository;
    private mentionRepository;
    private embeddingRepository;
    private candidateEdgeRepository;
    private config;
    constructor(_nodeRepository: NodeRepository, edgeRepository: EdgeRepository, mentionRepository: MentionRepository, embeddingRepository: EmbeddingRepository, candidateEdgeRepository: CandidateEdgeRepository, config?: Partial<SuggestionConfig>);
    /**
     * Compute candidate edges for mentions in a given scope.
     *
     * Per Phase 2 Design Section 3.3:
     * - Filter: mentionMinOccurrences >= 2
     * - Group by (fromId, toId) pair
     * - Create/upsert CandidateEdge records
     */
    computeMentionCandidates(scopeNodeIds: string[]): Promise<CandidateComputationResult>;
    /**
     * Compute candidate edges from semantic similarity.
     *
     * Per Phase 2 Design Section 3.1:
     * - semanticMinSimilarity: 0.4 (below this, too weak)
     * - semanticMaxSimilarity: 0.74 (at 0.75+, it's a wormhole)
     */
    computeSemanticCandidates(scopeNodeIds: string[]): Promise<CandidateComputationResult>;
    /**
     * Compute all candidate types for a scope.
     */
    computeAllCandidates(scopeNodeIds: string[]): Promise<{
        mentions: CandidateComputationResult;
        semantic: CandidateComputationResult;
        total: number;
    }>;
    /**
     * Get all Layer A edge connections for nodes in scope.
     * Returns a Set of normalized pair keys for fast lookup.
     */
    private getLayerAConnections;
    /**
     * Check if two nodes are already connected by Layer A edge.
     */
    private isAlreadyConnected;
    /**
     * Aggregate mentions by (source, target) pair.
     * Counts occurrences and collects reasons.
     */
    private aggregateMentionsForScope;
}
/**
 * Orphan score weights per DESIGN.md Section 12.2.
 */
export declare const ORPHAN_WEIGHTS: {
    semanticPull: number;
    lowTruthDegree: number;
    mentionPressure: number;
    importance: number;
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
    minScore: number;
    maxResults: number;
    topSemanticNeighbors: number;
    recencyDays: number;
}
export declare const DEFAULT_ORPHAN_CONFIG: OrphanConfig;
/**
 * Orphan computation engine.
 * Computes orphan scores for nodes that are semantically connected
 * but lack explicit (Layer A) edges.
 */
export declare class OrphanEngine {
    private nodeRepository;
    private edgeRepository;
    private mentionRepository;
    private embeddingRepository;
    private config;
    constructor(nodeRepository: NodeRepository, edgeRepository: EdgeRepository, mentionRepository: MentionRepository, embeddingRepository: EmbeddingRepository, config?: Partial<OrphanConfig>);
    /**
     * Compute orphan scores for nodes in scope.
     *
     * Per DESIGN.md Section 12.2:
     * orphanScore = 0.45 * semanticPull + 0.25 * (1/(1+truthDegree)) + 0.20 * mentionPressure + 0.10 * importance
     */
    computeOrphanScores(scopeNodeIds: string[]): Promise<OrphanEntry[]>;
    /**
     * Compute Layer A degree for each node in scope.
     */
    private computeLayerADegrees;
    /**
     * Count unresolved mentions (new or pending) pointing to each node.
     */
    private computeUnresolvedMentionCounts;
    /**
     * Compute semantic neighbors for each node.
     * Returns top-K neighbors NOT connected by Layer A edges.
     */
    private computeSemanticNeighbors;
    /**
     * Compute recency score (0-1) based on days since last update.
     * More recent = higher score.
     */
    private computeRecencyScore;
}
//# sourceMappingURL=suggestion-engine.d.ts.map