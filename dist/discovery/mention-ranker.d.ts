import type { DetectedMention } from './mention-detector.js';
import type { ZettelScriptConfig } from '../core/types/index.js';
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
export declare class MentionRanker {
    private edgeRepo;
    private graphEngine;
    private config;
    private weights;
    private ambiguityPenalty;
    private confidenceThreshold;
    private expansionMaxDepth;
    private expansionBudget;
    constructor(options: MentionRankerOptions);
    /**
     * Rank a list of detected mentions
     */
    rank(mentions: DetectedMention[], sourceNodeId?: string): Promise<RankedMention[]>;
    /**
     * Calculate match quality based on how well the surface text matches
     */
    private calculateMatchQuality;
    /**
     * Calculate centrality scores (based on incoming link count)
     */
    private calculateCentrality;
    /**
     * Calculate locality scores (graph distance from source)
     */
    private calculateLocality;
    /**
     * Calculate frequency scores (how often target is linked to)
     */
    private calculateFrequency;
    /**
     * Filter mentions below a confidence threshold
     */
    filterByThreshold(mentions: RankedMention[], threshold?: number): RankedMention[];
    /**
     * Group mentions by target
     */
    groupByTarget(mentions: RankedMention[]): Map<string, RankedMention[]>;
}
//# sourceMappingURL=mention-ranker.d.ts.map