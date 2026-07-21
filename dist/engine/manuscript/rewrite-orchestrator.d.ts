import type { ImpactAnalysis, Frontmatter, ZettelScriptConfig } from '../../core/types/index.js';
import { NodeRepository } from '../../storage/database/repositories/index.js';
export interface RewriteContext {
    sceneContent: string;
    sceneMetadata: Frontmatter | null;
    goal: string;
    characterContext: Array<{
        name: string;
        description: string;
        role: string;
    }>;
    timelineContext: Array<{
        title: string;
        order: number;
        summary: string;
    }>;
    relatedContent: Array<{
        title: string;
        type: string;
        excerpt: string;
    }>;
    constraints: string[];
}
export interface RewriteOrchestratorOptions {
    nodeRepository: NodeRepository;
    impact: ImpactAnalysis;
    vaultPath?: string;
    config?: ZettelScriptConfig;
}
/**
 * Orchestrates scene rewrites by gathering context and managing constraints
 */
export declare class RewriteOrchestrator {
    private nodeRepo;
    private impact;
    private vaultPath;
    private config;
    constructor(options: RewriteOrchestratorOptions);
    /**
     * Gather all context needed for a rewrite
     */
    gatherContext(sceneNodeId: string, goal: string): Promise<RewriteContext>;
    /**
     * Read content from a node's file
     */
    private readNodeContent;
    /**
     * Gather context about characters in the scene
     */
    private gatherCharacterContext;
    /**
     * Gather context about adjacent scenes in timeline
     */
    private gatherTimelineContext;
    /**
     * Gather related content from direct links
     */
    private gatherRelatedContent;
    /**
     * Build constraints based on metadata and impact
     */
    private buildConstraints;
    /**
     * Format context for LLM prompt
     */
    formatContextForPrompt(context: RewriteContext): string;
    /**
     * Get a summary of the rewrite context
     */
    getContextSummary(context: RewriteContext): {
        characterCount: number;
        timelineSceneCount: number;
        relatedContentCount: number;
        constraintCount: number;
        totalContextLength: number;
    };
}
//# sourceMappingURL=rewrite-orchestrator.d.ts.map