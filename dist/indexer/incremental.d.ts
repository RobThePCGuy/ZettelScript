import { EventEmitter } from 'node:events';
import { type WatcherOptions } from '../storage/filesystem/watcher.js';
import { IndexingPipeline, type IndexingResult } from './pipeline.js';
export interface IncrementalIndexerOptions extends Omit<WatcherOptions, 'basePath'> {
    basePath: string;
    pipeline: IndexingPipeline;
}
export interface IncrementalIndexEvent {
    type: 'indexed' | 'removed' | 'error';
    path: string;
    result?: IndexingResult;
    error?: string;
}
/**
 * Incremental indexer that watches for file changes
 */
export declare class IncrementalIndexer extends EventEmitter {
    private watcher;
    private pipeline;
    private basePath;
    private processing;
    constructor(options: IncrementalIndexerOptions);
    /**
     * Start watching and indexing
     */
    start(): void;
    /**
     * Stop watching
     */
    stop(): Promise<void>;
    /**
     * Handle a file event
     */
    private handleFileEvent;
    /**
     * Handle file add or change
     */
    private handleAddOrChange;
    /**
     * Handle file deletion
     */
    private handleUnlink;
    /**
     * Check if watching
     */
    isWatching(): boolean;
}
/**
 * Create an incremental indexer
 */
export declare function createIncrementalIndexer(basePath: string, pipeline: IndexingPipeline, options?: Omit<IncrementalIndexerOptions, 'basePath' | 'pipeline'>): IncrementalIndexer;
//# sourceMappingURL=incremental.d.ts.map