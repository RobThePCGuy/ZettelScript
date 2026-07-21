import type { Node, Edge, WikiLink } from '../core/types/index.js';
import type { FileInfo } from '../storage/filesystem/reader.js';
import { NodeRepository, EdgeRepository, VersionRepository } from '../storage/database/repositories/index.js';
export interface IndexingResult {
    node: Node;
    links: Array<{
        wikilink: WikiLink;
        targetNodeId: string | null;
        ambiguous: boolean;
    }>;
    edges: Edge[];
    unresolved: WikiLink[];
    ambiguous: WikiLink[];
}
export interface BatchIndexingResult {
    indexed: IndexingResult[];
    errors: Array<{
        path: string;
        error: string;
    }>;
    stats: {
        totalFiles: number;
        successCount: number;
        errorCount: number;
        nodeCount: number;
        edgeCount: number;
        unresolvedCount: number;
        ambiguousCount: number;
        durationMs: number;
    };
}
export interface IndexerOptions {
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
    versionRepository: VersionRepository;
}
/**
 * Main indexing pipeline
 */
export declare class IndexingPipeline {
    private nodeRepo;
    private edgeRepo;
    private versionRepo;
    private resolver;
    constructor(options: IndexerOptions);
    /**
     * Initialize the link resolver
     */
    private getResolver;
    /**
     * Clear resolver cache (call after batch operations)
     */
    clearResolverCache(): void;
    /**
     * Index a single file
     */
    indexFile(file: FileInfo): Promise<IndexingResult>;
    /**
     * Create or update a node from file info
     */
    private upsertNode;
    /**
     * Create a version entry if content has changed
     */
    private createVersionIfNeeded;
    /**
     * Process wikilinks and create edges
     */
    private processLinks;
    /**
     * Two-pass batch indexing for handling circular references
     *
     * Pass 1: Create all nodes (stubs)
     * Pass 2: Process links and create edges
     */
    batchIndex(files: FileInfo[]): Promise<BatchIndexingResult>;
    /**
     * Remove a node and its edges
     */
    removeNode(nodeId: string): Promise<void>;
    /**
     * Remove a node by path
     */
    removeByPath(path: string): Promise<void>;
    /**
     * Check if a file needs reindexing
     */
    needsReindex(file: FileInfo): Promise<boolean>;
    /**
     * Get indexing statistics
     */
    getStats(): Promise<{
        nodeCount: number;
        edgeCount: number;
        nodesByType: Record<string, number>;
        edgesByType: Record<string, number>;
    }>;
}
//# sourceMappingURL=pipeline.d.ts.map