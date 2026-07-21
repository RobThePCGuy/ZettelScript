import type { Proposal } from '../core/types/index.js';
import { NodeRepository } from '../storage/database/repositories/index.js';
export interface ProposalBuilderOptions {
    nodeRepository: NodeRepository;
    vaultPath?: string;
}
export interface LinkAdditionProposal {
    nodeId: string;
    targetText: string;
    linkTarget: string;
    position?: {
        start: number;
        end: number;
    };
    useIdPrefix?: boolean;
}
export interface ContentEditProposal {
    nodeId: string;
    oldContent: string;
    newContent: string;
    description: string;
}
export interface NodeCreationProposal {
    title: string;
    type: string;
    path: string;
    content: string;
    metadata?: Record<string, unknown>;
}
export interface MetadataUpdateProposal {
    nodeId: string;
    updates: Record<string, unknown>;
}
/**
 * Builds proposals for various types of changes
 */
export declare class ProposalBuilder {
    private nodeRepo;
    private vaultPath;
    constructor(options: ProposalBuilderOptions);
    /**
     * Build a link addition proposal
     */
    buildLinkAddition(data: LinkAdditionProposal): Promise<Proposal>;
    /**
     * Build a content edit proposal
     */
    buildContentEdit(data: ContentEditProposal): Promise<Proposal>;
    /**
     * Build a node creation proposal
     */
    buildNodeCreation(data: NodeCreationProposal): Proposal;
    /**
     * Build a node deletion proposal
     */
    buildNodeDeletion(nodeId: string, reason: string): Promise<Proposal>;
    /**
     * Build a metadata update proposal
     */
    buildMetadataUpdate(data: MetadataUpdateProposal): Promise<Proposal>;
    /**
     * Build multiple link addition proposals from mention candidates
     * Returns both successful proposals and any errors encountered
     */
    buildFromMentions(mentions: Array<{
        sourceId: string;
        targetId: string;
        surfaceText: string;
        spanStart: number;
        spanEnd: number;
    }>): Promise<{
        proposals: Proposal[];
        errors: Array<{
            mention: (typeof mentions)[0];
            error: string;
        }>;
    }>;
    /**
     * Create a proposal object
     */
    private createProposal;
}
//# sourceMappingURL=proposal-builder.d.ts.map