import { ConnectionManager } from '../storage/database/connection.js';
import { NodeRepository, EdgeRepository, VersionRepository, ChunkRepository, MentionRepository, UnresolvedLinkRepository, ConstellationRepository, EmbeddingRepository, WormholeRepository, CandidateEdgeRepository } from '../storage/database/repositories/index.js';
import { IndexingPipeline } from '../indexer/pipeline.js';
import { GraphEngine } from '../core/graph/engine.js';
import type { ZettelScriptConfig } from '../core/types/index.js';
/**
 * Find the vault root by looking for .zettelscript directory
 */
export declare function findVaultRoot(startPath?: string): string | null;
/**
 * Get the .zettelscript directory path
 */
export declare function getZettelScriptDir(vaultPath: string): string;
/**
 * Get the database path
 */
export declare function getDbPath(vaultPath: string): string;
/**
 * Get the config file path
 */
export declare function getConfigPath(vaultPath: string): string;
/**
 * Load configuration
 */
export declare function loadConfig(vaultPath: string): ZettelScriptConfig;
/**
 * Save configuration
 */
export declare function saveConfig(vaultPath: string, config: ZettelScriptConfig): void;
/**
 * Context object containing all initialized components
 */
export interface CLIContext {
    vaultPath: string;
    config: ZettelScriptConfig;
    connectionManager: ConnectionManager;
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
    versionRepository: VersionRepository;
    chunkRepository: ChunkRepository;
    mentionRepository: MentionRepository;
    unresolvedLinkRepository: UnresolvedLinkRepository;
    constellationRepository: ConstellationRepository;
    embeddingRepository: EmbeddingRepository;
    wormholeRepository: WormholeRepository;
    candidateEdgeRepository: CandidateEdgeRepository;
    pipeline: IndexingPipeline;
    graphEngine: GraphEngine;
}
/**
 * Initialize CLI context
 */
export declare function initContext(vaultPath?: string): Promise<CLIContext>;
/**
 * Format a duration in milliseconds
 */
export declare function formatDuration(ms: number): string;
/**
 * Format a file size
 */
export declare function formatSize(bytes: number): string;
/**
 * Simple spinner for CLI feedback
 */
export declare class Spinner {
    private frames;
    private frameIndex;
    private interval;
    private message;
    constructor(message: string);
    start(): void;
    update(message: string): void;
    stop(finalMessage?: string): void;
}
/**
 * Print a table
 */
export declare function printTable(headers: string[], rows: string[][], options?: {
    padding?: number;
}): void;
//# sourceMappingURL=utils.d.ts.map