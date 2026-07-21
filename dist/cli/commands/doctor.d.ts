import { Command } from 'commander';
import type { CLIContext } from '../utils.js';
export declare function getVersionFromPath(packageJsonPath: string): string;
export declare function getVersion(): string;
export type HealthLevel = 'ok' | 'warn' | 'fail';
export interface EmbeddingHealth {
    level: HealthLevel;
    total: number;
    embedded: number;
    coverage: number;
    pending: number;
    errorCount: number;
    lastError?: string;
    model?: string;
}
export interface WormholeHealth {
    enabled: boolean;
    count: number;
    threshold: number;
    disabledReason?: string;
}
export interface IndexHealth {
    lastIndexTime?: Date;
    nodeCount: number;
    edgeCount: number;
    edgesByLayer: {
        A: number;
        B: number;
        C: number;
    };
    dbPath: string;
    dbSizeBytes: number;
}
export interface ExtractionHealth {
    badChunksPath?: string;
    parseFailCount: number;
}
export interface VisualizationHealth {
    mode: 'focus' | 'classic';
    filteredEdgeCount: number;
    totalEdgeCount: number;
}
export interface DoctorStats {
    version: string;
    vaultPath: string;
    overallLevel: HealthLevel;
    index: IndexHealth;
    embeddings: EmbeddingHealth;
    wormholes: WormholeHealth;
    extraction: ExtractionHealth;
    visualization: VisualizationHealth;
}
/**
 * Compute embedding health level based on coverage percentage.
 */
export declare function getEmbeddingHealthLevel(coverage: number): HealthLevel;
/**
 * Compute comprehensive health stats for a vault.
 * This is the canonical source of truth for health data.
 */
export declare function computeDoctorStats(ctx: CLIContext): Promise<DoctorStats>;
/**
 * Print a one-line embedding status summary (for use in other commands).
 */
export declare function printEmbeddingStatus(stats: DoctorStats): void;
/**
 * Print wormhole status if there's a problem.
 */
export declare function printWormholeStatus(stats: DoctorStats): void;
export declare const doctorCommand: Command;
//# sourceMappingURL=doctor.d.ts.map