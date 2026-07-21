import { DrizzleDB } from '../connection.js';
/**
 * Interface for a wormhole rejection
 */
export interface WormholeRejection {
    rejectionId: string;
    sourceId: string;
    targetId: string;
    sourceContentHash: string;
    targetContentHash: string;
    rejectedAt: string;
}
export interface CreateRejectionInput {
    sourceId: string;
    targetId: string;
    sourceContentHash: string;
    targetContentHash: string;
}
/**
 * Repository for Wormhole Rejection CRUD operations
 */
export declare class WormholeRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Create a new rejection
     */
    createRejection(data: CreateRejectionInput): Promise<WormholeRejection>;
    /**
     * Check if a pair is rejected (considering content hashes)
     * Returns true if the pair was rejected AND the content hasn't changed
     */
    isRejected(sourceId: string, targetId: string, sourceContentHash: string, targetContentHash: string): Promise<boolean>;
    /**
     * Check if any rejection exists for a pair (regardless of content hash)
     */
    hasAnyRejection(sourceId: string, targetId: string): Promise<boolean>;
    /**
     * Find all rejections
     */
    findAll(): Promise<WormholeRejection[]>;
    /**
     * Find rejections for a specific node
     */
    findByNodeId(nodeId: string): Promise<WormholeRejection[]>;
    /**
     * Delete a rejection by ID
     */
    delete(rejectionId: string): Promise<void>;
    /**
     * Delete rejections for a node pair
     */
    deleteForPair(sourceId: string, targetId: string): Promise<void>;
    /**
     * Delete all rejections for a node
     */
    deleteForNode(nodeId: string): Promise<number>;
    /**
     * Clear all rejections
     */
    clearAll(): Promise<number>;
    /**
     * Count rejections
     */
    count(): Promise<number>;
    /**
     * Convert database row to WormholeRejection type
     */
    private rowToRejection;
}
//# sourceMappingURL=wormhole-repository.d.ts.map