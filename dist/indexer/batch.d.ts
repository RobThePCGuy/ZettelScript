import { type WalkOptions } from '../storage/filesystem/reader.js';
import { IndexingPipeline, type BatchIndexingResult } from './pipeline.js';
export interface FullIndexOptions extends WalkOptions {
    /** Callback for progress updates */
    onProgress?: (current: number, total: number, path: string) => void;
    /** Whether to clear existing data before indexing */
    clearExisting?: boolean;
}
/**
 * Perform a full vault index
 */
export declare function fullIndex(pipeline: IndexingPipeline, basePath: string, options?: FullIndexOptions): Promise<BatchIndexingResult>;
/**
 * Index files that have changed since last index
 */
export declare function incrementalIndex(pipeline: IndexingPipeline, basePath: string, options?: WalkOptions): Promise<BatchIndexingResult>;
//# sourceMappingURL=batch.d.ts.map