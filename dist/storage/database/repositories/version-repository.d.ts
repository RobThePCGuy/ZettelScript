import { DrizzleDB } from '../connection.js';
import type { Version } from '../../../core/types/index.js';
/**
 * Repository for Version CRUD operations
 */
export declare class VersionRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Create a new version
     */
    create(data: Omit<Version, 'versionId' | 'createdAt'>): Promise<Version>;
    /**
     * Find a version by ID
     */
    findById(versionId: string): Promise<Version | null>;
    /**
     * Find all versions for a node
     */
    findByNodeId(nodeId: string): Promise<Version[]>;
    /**
     * Find the latest version for a node
     */
    findLatest(nodeId: string): Promise<Version | null>;
    /**
     * Find version by content hash
     */
    findByContentHash(nodeId: string, contentHash: string): Promise<Version | null>;
    /**
     * Get version chain (all ancestors)
     */
    getVersionChain(versionId: string): Promise<Version[]>;
    /**
     * Get child versions
     */
    findChildren(versionId: string): Promise<Version[]>;
    /**
     * Update a version (mainly for summary)
     */
    update(versionId: string, data: Pick<Version, 'summary'>): Promise<Version>;
    /**
     * Delete a version
     */
    delete(versionId: string): Promise<void>;
    /**
     * Delete all versions for a node
     */
    deleteForNode(nodeId: string): Promise<number>;
    /**
     * Count versions
     */
    count(): Promise<number>;
    /**
     * Count versions per node
     */
    countPerNode(): Promise<Map<string, number>>;
    /**
     * Convert database row to Version type
     */
    private rowToVersion;
}
//# sourceMappingURL=version-repository.d.ts.map