import { DrizzleDB } from '../connection.js';
import type { CandidateEdge, CandidateEdgeStatus, CandidateEdgeSignals, CandidateEdgeProvenance, EdgeType } from '../../../core/types/index.js';
/**
 * Input for creating a new candidate edge
 */
export interface CreateCandidateEdgeInput {
    suggestionId: string;
    fromId: string;
    toId: string;
    suggestedEdgeType: EdgeType;
    signals?: CandidateEdgeSignals;
    reasons?: string[];
    provenance?: CandidateEdgeProvenance[];
}
/**
 * Input for updating a candidate edge
 */
export interface UpdateCandidateEdgeInput {
    status?: CandidateEdgeStatus;
    signals?: CandidateEdgeSignals;
    reasons?: string[];
    provenance?: CandidateEdgeProvenance[];
    writebackStatus?: string;
    writebackReason?: string;
    approvedEdgeId?: string;
}
/**
 * Repository for candidate edge CRUD operations.
 * Candidate edges are suggestions that may be approved or rejected.
 */
export declare class CandidateEdgeRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Create a new candidate edge
     */
    create(data: CreateCandidateEdgeInput): Promise<CandidateEdge>;
    /**
     * Create or update a candidate edge (upsert by suggestionId)
     */
    upsert(data: CreateCandidateEdgeInput): Promise<CandidateEdge>;
    /**
     * Find a candidate edge by ID
     */
    findById(suggestionId: string): Promise<CandidateEdge | null>;
    /**
     * Find candidate edges by status
     */
    findByStatus(status: CandidateEdgeStatus): Promise<CandidateEdge[]>;
    /**
     * Find candidate edges involving a specific node (as source or target)
     */
    findByNodeId(nodeId: string): Promise<CandidateEdge[]>;
    /**
     * Find suggested candidate edges for nodes in a given set
     */
    findSuggestedForNodes(nodeIds: string[]): Promise<CandidateEdge[]>;
    /**
     * Find by normalized pair (for checking duplicates)
     */
    findByNormalizedPair(nodeId1: string, nodeId2: string, edgeType: EdgeType): Promise<CandidateEdge | null>;
    /**
     * Update a candidate edge
     */
    update(suggestionId: string, data: UpdateCandidateEdgeInput): Promise<CandidateEdge>;
    /**
     * Update status of a candidate edge
     */
    updateStatus(suggestionId: string, status: CandidateEdgeStatus, approvedEdgeId?: string): Promise<CandidateEdge>;
    /**
     * Mark last seen time for candidate edges (for pruning stale suggestions)
     */
    markSeen(suggestionIds: string[]): Promise<void>;
    /**
     * Delete a candidate edge
     */
    delete(suggestionId: string): Promise<void>;
    /**
     * Delete all candidate edges for a node
     */
    deleteForNode(nodeId: string): Promise<number>;
    /**
     * Count candidate edges by status
     */
    countByStatus(): Promise<Record<CandidateEdgeStatus, number>>;
    /**
     * Count total candidate edges
     */
    count(): Promise<number>;
    /**
     * Convert database row to CandidateEdge type
     */
    private rowToCandidateEdge;
}
//# sourceMappingURL=candidate-edge-repository.d.ts.map