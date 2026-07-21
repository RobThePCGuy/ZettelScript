import type { ContinuityIssue } from '../core/types/index.js';
import { NodeRepository, EdgeRepository } from '../storage/database/repositories/index.js';
export interface ContinuityCheckResult {
    issues: ContinuityIssue[];
    stats: {
        scenesChecked: number;
        povIssues: number;
        timelineIssues: number;
        setupPayoffIssues: number;
        knowledgeIssues: number;
    };
}
export interface ContinuityCheckerOptions {
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
    config: {
        validatePov: boolean;
        validateTimeline: boolean;
        validateSetupPayoff: boolean;
    };
}
/**
 * Checks manuscript continuity for POV, timeline, and setup/payoff consistency
 */
export declare class ContinuityChecker {
    private nodeRepo;
    private edgeRepo;
    private config;
    constructor(options: ContinuityCheckerOptions);
    /**
     * Run all continuity checks
     */
    check(): Promise<ContinuityCheckResult>;
    /**
     * Extract scene info from node metadata
     */
    private extractSceneInfo;
    /**
     * Check POV consistency - ensure POV character knows information they reveal
     */
    private checkPovConsistency;
    /**
     * Check timeline consistency - ensure scene_order is sequential and logical
     */
    private checkTimelineConsistency;
    /**
     * Check setup/payoff consistency using edges
     */
    private checkSetupPayoff;
    /**
     * Check if a character could know about something at a given scene
     */
    canCharacterKnow(characterName: string, informationNodeId: string, atSceneOrder: number): Promise<boolean>;
}
//# sourceMappingURL=continuity-checker.d.ts.map