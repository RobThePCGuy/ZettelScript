import { DrizzleDB } from '../connection.js';
/**
 * Data structure for ghost nodes in the visualization
 */
export interface GhostNodeData {
    /** The unresolved link text (e.g., "Missing Note") */
    targetText: string;
    /** All node IDs that reference this ghost */
    sourceIds: string[];
    /** Number of times this ghost is referenced */
    referenceCount: number;
    /** Timestamp of the earliest reference */
    firstSeen: string;
    /** Most recent reference timestamp (from unresolved_link or referencer's updatedAt) */
    mostRecentRef?: string | undefined;
}
/**
 * Repository for unresolved link operations, primarily for ghost node visualization
 */
export declare class UnresolvedLinkRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Get all unresolved links grouped by target text for ghost node visualization.
     * Returns ghost node data sorted by reference count (most referenced first).
     */
    getGhostNodes(): Promise<GhostNodeData[]>;
    /**
     * Get ghost nodes with a minimum reference count threshold.
     * Useful for filtering out rarely-referenced unresolved links.
     */
    getGhostNodesWithThreshold(minReferenceCount: number): Promise<GhostNodeData[]>;
    /**
     * Count total number of unique unresolved link targets (ghost nodes)
     */
    countGhostNodes(): Promise<number>;
    /**
     * Count total number of unresolved link references
     */
    countReferences(): Promise<number>;
    /**
     * Get ghost nodes with most recent reference time included.
     * The most recent reference time is the latest of:
     * - The unresolved_link createdAt timestamp
     * - The referencing node's updatedAt timestamp
     *
     * Returns ghost node data sorted by reference count (most referenced first).
     */
    getGhostNodesWithRecency(): Promise<GhostNodeData[]>;
    /**
     * Delete unresolved links by target text
     */
    deleteByTargetText(targetText: string): Promise<number>;
}
//# sourceMappingURL=unresolved-link-repository.d.ts.map