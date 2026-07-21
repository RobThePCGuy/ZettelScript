import { NodeRepository, VersionRepository } from '../../storage/database/repositories/index.js';
export interface DriftIssue {
    nodeId: string;
    nodeTitle: string;
    type: 'content_drift' | 'metadata_drift' | 'structure_drift' | 'frequency_anomaly';
    severity: 'info' | 'warning' | 'error';
    description: string;
    details?: Record<string, unknown>;
}
export interface DriftDetectorOptions {
    nodeRepository: NodeRepository;
    versionRepository: VersionRepository;
    vaultPath?: string;
}
/**
 * Detects semantic drift and anomalies in node content over time
 */
export declare class DriftDetector {
    private nodeRepo;
    private versionRepo;
    private vaultPath;
    constructor(options: DriftDetectorOptions);
    /**
     * Detect drift issues across all nodes
     */
    detectAll(): Promise<DriftIssue[]>;
    /**
     * Detect drift issues for a specific node
     */
    detectForNode(nodeId: string): Promise<DriftIssue[]>;
    /**
     * Check for unusual version frequency
     */
    private checkFrequencyAnomaly;
    /**
     * Check for metadata drift (type changes, missing required fields)
     */
    private checkMetadataDrift;
    /**
     * Check for structural drift (heading changes, major reorganization)
     */
    private checkStructureDrift;
    /**
     * Get summary of drift across the vault
     */
    getSummary(): Promise<{
        totalNodes: number;
        nodesWithIssues: number;
        issuesByType: Record<string, number>;
        issuesBySeverity: Record<string, number>;
    }>;
}
//# sourceMappingURL=drift-detector.d.ts.map