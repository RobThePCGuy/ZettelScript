import type { Version, Node } from '../../core/types/index.js';
import { NodeRepository, VersionRepository } from '../../storage/database/repositories/index.js';
export interface VersionManagerOptions {
    nodeRepository: NodeRepository;
    versionRepository: VersionRepository;
    vaultPath?: string;
}
export interface VersionDiff {
    versionId: string;
    parentVersionId: string | null;
    additions: number;
    deletions: number;
    summary?: string;
}
/**
 * Manages version history for nodes
 */
export declare class VersionManager {
    private nodeRepo;
    private versionRepo;
    private vaultPath;
    constructor(options: VersionManagerOptions);
    /**
     * Create a new version for a node if content has changed
     */
    createVersionIfChanged(nodeId: string, content: string, summary?: string): Promise<Version | null>;
    /**
     * Get version history for a node
     */
    getHistory(nodeId: string): Promise<Version[]>;
    /**
     * Get the latest version for a node
     */
    getLatest(nodeId: string): Promise<Version | null>;
    /**
     * Get version chain (all ancestors from a version)
     */
    getVersionChain(versionId: string): Promise<Version[]>;
    /**
     * Check if content matches a specific version
     */
    matchesVersion(_nodeId: string, content: string, versionId: string): Promise<boolean>;
    /**
     * Check if node has uncommitted changes (content differs from latest version)
     */
    hasUncommittedChanges(nodeId: string): Promise<boolean>;
    /**
     * Get version count for a node
     */
    getVersionCount(nodeId: string): Promise<number>;
    /**
     * Get statistics about versioning
     */
    getStats(): Promise<{
        totalVersions: number;
        nodesWithVersions: number;
        avgVersionsPerNode: number;
        maxVersions: {
            nodeId: string;
            count: number;
        };
    }>;
    /**
     * Delete old versions, keeping the most recent N
     */
    pruneVersions(nodeId: string, keepCount: number): Promise<number>;
    /**
     * Find versions within a date range
     */
    findVersionsInRange(nodeId: string, startDate: Date, endDate: Date): Promise<Version[]>;
    /**
     * Restore a node to a specific version (reads from stored hash, doesn't actually restore content)
     * Returns the version info for manual restoration
     */
    getVersionInfo(versionId: string): Promise<{
        version: Version;
        node: Node | null;
    } | null>;
}
//# sourceMappingURL=version-manager.d.ts.map