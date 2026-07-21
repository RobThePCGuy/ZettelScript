import { NodeRepository } from '../storage/database/repositories/index.js';
export interface DetectedMention {
    targetId: string;
    targetTitle: string;
    surfaceText: string;
    spanStart: number;
    spanEnd: number;
    matchType: 'title' | 'alias';
}
export interface MentionDetectorOptions {
    nodeRepository: NodeRepository;
    vaultPath?: string;
}
/**
 * Detects unlinked mentions of nodes in content
 * Following spec 8.1:
 * 1. Strip excluded zones (code, links, URLs, frontmatter)
 * 2. Match titles/aliases with boundary-aware rules
 * 3. Deduplicate overlapping (prefer longer matches)
 */
export declare class MentionDetector {
    private nodeRepo;
    private vaultPath;
    private titleIndex;
    private aliasIndex;
    constructor(options: MentionDetectorOptions);
    /**
     * Build the title/alias index for fast matching
     */
    buildIndex(): Promise<void>;
    /**
     * Detect mentions in a specific node
     */
    detectInNode(nodeId: string): Promise<DetectedMention[]>;
    /**
     * Detect mentions in content
     */
    detectInContent(content: string, sourceNodeId: string, sourcePath: string): DetectedMention[];
    /**
     * Build a boundary-aware regex pattern
     */
    private buildBoundaryPattern;
    /**
     * Check if a range is in an exclusion zone
     */
    private isInExclusionZone;
    /**
     * Deduplicate overlapping matches, preferring longer matches
     */
    private deduplicateMatches;
    /**
     * Clear the index (call when nodes change)
     */
    clearIndex(): void;
}
//# sourceMappingURL=mention-detector.d.ts.map