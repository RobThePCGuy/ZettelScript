import type { Node, Edge } from '../../core/types/index.js';
export interface ChangeEntry {
    changeId: string;
    timestamp: string;
    type: 'node_created' | 'node_updated' | 'node_deleted' | 'edge_created' | 'edge_deleted';
    nodeId?: string;
    edgeId?: string;
    details: Record<string, unknown>;
    versionId?: string;
}
export interface ButterflyLogOptions {
    maxEntries?: number;
    defaultRecentCount?: number;
}
/**
 * Butterfly log for tracking changes and their cascading effects
 * Named after the butterfly effect - small changes can have large impacts
 */
export declare class ButterflyLog {
    private entries;
    private maxEntries;
    private defaultRecentCount;
    constructor(options?: ButterflyLogOptions);
    /**
     * Log a node creation
     */
    logNodeCreated(node: Node, versionId?: string): ChangeEntry;
    /**
     * Log a node update
     */
    logNodeUpdated(node: Node, changes: Record<string, {
        old: unknown;
        new: unknown;
    }>, versionId?: string): ChangeEntry;
    /**
     * Log a node deletion
     */
    logNodeDeleted(nodeId: string, nodeTitle: string): ChangeEntry;
    /**
     * Log an edge creation
     */
    logEdgeCreated(edge: Edge): ChangeEntry;
    /**
     * Log an edge deletion
     */
    logEdgeDeleted(edge: Edge): ChangeEntry;
    /**
     * Add an entry to the log
     */
    private addEntry;
    /**
     * Get all entries
     */
    getEntries(): ChangeEntry[];
    /**
     * Get entries for a specific node
     */
    getEntriesForNode(nodeId: string): ChangeEntry[];
    /**
     * Get entries within a time range
     */
    getEntriesInRange(startTime: Date, endTime: Date): ChangeEntry[];
    /**
     * Get recent entries
     */
    getRecentEntries(count?: number): ChangeEntry[];
    /**
     * Get entry by ID
     */
    getEntry(changeId: string): ChangeEntry | null;
    /**
     * Clear all entries
     */
    clear(): void;
    /**
     * Get change statistics
     */
    getStats(): {
        totalEntries: number;
        entriesByType: Record<string, number>;
        uniqueNodesChanged: number;
        recentActivity: {
            date: string;
            count: number;
        }[];
    };
    /**
     * Export log to JSON
     */
    export(): string;
    /**
     * Import log from JSON
     */
    import(json: string): number;
}
//# sourceMappingURL=butterfly-log.d.ts.map