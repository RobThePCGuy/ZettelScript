/**
 * Prompt templates for LLM-assisted features
 */
export interface RewriteContext {
    sceneTitle: string;
    sceneContent: string;
    goal: string;
    characterContext: Array<{
        name: string;
        details: string;
    }>;
    timelineContext: Array<{
        title: string;
        position: string;
    }>;
    relatedContent: Array<{
        title: string;
        excerpt: string;
    }>;
    povCharacter?: string;
}
/**
 * Build a prompt for scene rewrite suggestions
 */
export declare function buildRewritePrompt(context: RewriteContext): string;
/**
 * Build a prompt for mention disambiguation
 */
export declare function buildDisambiguationPrompt(surfaceText: string, context: string, candidates: Array<{
    title: string;
    type: string;
    description?: string;
}>): string;
/**
 * Build a prompt for continuity checking
 */
export declare function buildContinuityCheckPrompt(scene1: {
    title: string;
    content: string;
    pov?: string;
}, scene2: {
    title: string;
    content: string;
    pov?: string;
}): string;
//# sourceMappingURL=prompts.d.ts.map