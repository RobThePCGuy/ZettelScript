import type { Proposal } from '../core/types/index.js';
import { NodeRepository, EdgeRepository } from '../storage/database/repositories/index.js';
export interface ApprovalWorkflowOptions {
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
    vaultPath: string;
    createBackups?: boolean;
}
export interface ApplyResult {
    success: boolean;
    proposal: Proposal;
    backupPath?: string;
    error?: string;
}
/**
 * Manages the proposal approval and application workflow
 */
export declare class ApprovalWorkflow {
    private nodeRepo;
    private edgeRepo;
    private validator;
    private vaultPath;
    private createBackups;
    private pendingProposals;
    constructor(options: ApprovalWorkflowOptions);
    /**
     * Submit a proposal for review
     */
    submit(proposal: Proposal): Proposal;
    /**
     * Get all pending proposals
     */
    getPending(): Proposal[];
    /**
     * Get a specific proposal
     */
    getProposal(proposalId: string): Proposal | null;
    /**
     * Approve a proposal
     */
    approve(proposalId: string): Promise<ApplyResult>;
    /**
     * Reject a proposal
     */
    reject(proposalId: string, reason?: string): Proposal | null;
    /**
     * Apply an approved proposal
     */
    private apply;
    /**
     * Apply a content change (edit or link addition)
     */
    private applyContentChange;
    /**
     * Apply a node creation
     */
    private applyNodeCreation;
    /**
     * Apply a node deletion
     */
    private applyNodeDeletion;
    /**
     * Apply a metadata update
     */
    private applyMetadataUpdate;
    /**
     * Batch approve multiple proposals
     */
    batchApprove(proposalIds: string[]): Promise<ApplyResult[]>;
    /**
     * Clear all pending proposals
     */
    clearPending(): number;
    /**
     * Get workflow statistics
     */
    getStats(): {
        pending: number;
        approved: number;
        rejected: number;
        applied: number;
    };
}
//# sourceMappingURL=approval-workflow.d.ts.map