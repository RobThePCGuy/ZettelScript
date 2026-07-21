import type { Node } from '../core/types/index.js';
import { NodeRepository, EdgeRepository } from '../storage/database/repositories/index.js';
export interface BrokenLink {
    sourceId: string;
    sourcePath: string;
    targetText: string;
    spanStart?: number;
    spanEnd?: number;
}
export interface AmbiguousLink {
    sourceId: string;
    sourcePath: string;
    targetText: string;
    candidates: string[];
    candidateTitles: string[];
}
export interface LinkValidationResult {
    broken: BrokenLink[];
    ambiguous: AmbiguousLink[];
    valid: number;
    total: number;
}
export interface LinkValidatorOptions {
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
}
/**
 * Validates links in the graph
 */
export declare class LinkValidator {
    private nodeRepo;
    private edgeRepo;
    constructor(options: LinkValidatorOptions);
    /**
     * Validate all links in the graph
     */
    validate(): Promise<LinkValidationResult>;
    /**
     * Validate links for a specific node
     */
    validateNode(nodeId: string): Promise<{
        broken: BrokenLink[];
        valid: number;
    }>;
    /**
     * Find all nodes that link to a given node
     */
    findLinkers(targetNodeId: string): Promise<Node[]>;
    /**
     * Check if a link would create a cycle
     */
    wouldCreateCycle(sourceId: string, targetId: string, maxDepth?: number): Promise<boolean>;
    /**
     * Get link statistics
     */
    getStats(): Promise<{
        totalNodes: number;
        totalLinks: number;
        avgLinksPerNode: number;
        nodesWithNoLinks: number;
        nodesWithNoIncoming: number;
        nodesWithNoOutgoing: number;
    }>;
}
//# sourceMappingURL=link-validator.d.ts.map