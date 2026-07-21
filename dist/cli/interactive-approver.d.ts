import type { RankedMention } from '../discovery/mention-ranker.js';
import { EdgeRepository } from '../storage/database/repositories/index.js';
export type ApprovalAction = 'approve' | 'reject' | 'defer' | 'skip' | 'quit' | 'approveAll';
export interface ApprovalResult {
    mention: RankedMention;
    action: ApprovalAction;
}
export interface InteractiveApproverOptions {
    edgeRepository: EdgeRepository;
    sourceNodeId: string;
}
/**
 * Interactive mention approver using readline
 * Supports commands: (y)es, (n)o, (d)efer, (a)ll, (s)kip, (q)uit
 */
export declare class InteractiveApprover {
    private edgeRepo;
    private sourceNodeId;
    private rl;
    constructor(options: InteractiveApproverOptions);
    /**
     * Check if running in a TTY environment
     */
    isTTY(): boolean;
    /**
     * Approve a single mention interactively
     */
    approveMention(mention: RankedMention): Promise<ApprovalAction>;
    /**
     * Approve multiple mentions interactively
     */
    approveAll(mentions: RankedMention[]): Promise<ApprovalResult[]>;
    /**
     * Prompt user for action with retry limit
     */
    private promptAction;
    /**
     * Parse user answer into an action
     */
    private parseAnswer;
    /**
     * Promisified readline question
     */
    private question;
    /**
     * Create a mention edge in the database
     */
    private createMentionEdge;
    /**
     * Close the readline interface
     */
    close(): void;
}
/**
 * Batch approve mentions without interaction
 */
export declare function batchApproveMentions(mentions: RankedMention[], sourceNodeId: string, edgeRepo: EdgeRepository, action: 'approve' | 'reject' | 'defer'): Promise<ApprovalResult[]>;
//# sourceMappingURL=interactive-approver.d.ts.map