import { DrizzleDB } from '../connection.js';
import type { MentionCandidate, MentionStatus } from '../../../core/types/index.js';
/**
 * Repository for MentionCandidate CRUD operations
 */
export declare class MentionRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Create a new mention candidate
     */
    create(data: Omit<MentionCandidate, 'candidateId'>): Promise<MentionCandidate>;
    /**
     * Create multiple mention candidates
     */
    createMany(dataArray: Array<Omit<MentionCandidate, 'candidateId'>>): Promise<MentionCandidate[]>;
    /**
     * Find a mention by ID
     */
    findById(candidateId: string): Promise<MentionCandidate | null>;
    /**
     * Find mentions by source node
     */
    findBySourceId(sourceId: string): Promise<MentionCandidate[]>;
    /**
     * Find mentions by target node
     */
    findByTargetId(targetId: string): Promise<MentionCandidate[]>;
    /**
     * Find mentions by status
     */
    findByStatus(status: MentionStatus): Promise<MentionCandidate[]>;
    /**
     * Find new (pending review) mentions for a source
     */
    findNewForSource(sourceId: string): Promise<MentionCandidate[]>;
    /**
     * Check if a mention already exists
     */
    exists(sourceId: string, targetId: string, spanStart: number, spanEnd: number): Promise<boolean>;
    /**
     * Update mention status
     */
    updateStatus(candidateId: string, status: MentionStatus): Promise<MentionCandidate>;
    /**
     * Approve a mention (converts to edge)
     */
    approve(candidateId: string): Promise<MentionCandidate>;
    /**
     * Reject a mention
     */
    reject(candidateId: string): Promise<MentionCandidate>;
    /**
     * Defer a mention for later review
     */
    defer(candidateId: string): Promise<MentionCandidate>;
    /**
     * Update confidence score
     */
    updateConfidence(candidateId: string, confidence: number): Promise<MentionCandidate>;
    /**
     * Delete a mention
     */
    delete(candidateId: string): Promise<void>;
    /**
     * Delete all mentions for a source
     */
    deleteForSource(sourceId: string): Promise<number>;
    /**
     * Delete rejected mentions
     */
    deleteRejected(): Promise<number>;
    /**
     * Count mentions
     */
    count(): Promise<number>;
    /**
     * Count mentions by status
     */
    countByStatus(): Promise<Record<string, number>>;
    /**
     * Get top mentions by confidence
     */
    getTopByConfidence(limit?: number): Promise<MentionCandidate[]>;
    /**
     * Convert database row to MentionCandidate type
     */
    private rowToMention;
}
//# sourceMappingURL=mention-repository.d.ts.map