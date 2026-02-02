import { getMarkdownFiles, type FileInfo, type WalkOptions } from '../storage/filesystem/reader.js';
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
export async function fullIndex(
  pipeline: IndexingPipeline,
  basePath: string,
  options: FullIndexOptions = {}
): Promise<BatchIndexingResult> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onProgress, clearExisting = false, ...walkOptions } = options;

  // Get all markdown files
  const files = await getMarkdownFiles(basePath, walkOptions);

  if (onProgress) {
    let current = 0;
    const total = files.length;

    // Wrap the batch indexing with progress
    const originalIndex = pipeline.indexFile.bind(pipeline);
    pipeline.indexFile = async (file: FileInfo) => {
      current++;
      onProgress(current, total, file.relativePath);
      return originalIndex(file);
    };
  }

  // Run batch indexing
  return pipeline.batchIndex(files);
}

/**
 * Index files that have changed since last index
 */
export async function incrementalIndex(
  pipeline: IndexingPipeline,
  basePath: string,
  options: WalkOptions = {}
): Promise<BatchIndexingResult> {
  const files = await getMarkdownFiles(basePath, options);

  // Filter to only files that need reindexing
  const filesToIndex: FileInfo[] = [];
  for (const file of files) {
    if (await pipeline.needsReindex(file)) {
      filesToIndex.push(file);
    }
  }

  if (filesToIndex.length === 0) {
    return {
      indexed: [],
      errors: [],
      stats: {
        totalFiles: 0,
        successCount: 0,
        errorCount: 0,
        nodeCount: 0,
        edgeCount: 0,
        unresolvedCount: 0,
        ambiguousCount: 0,
        durationMs: 0,
      },
    };
  }

  return pipeline.batchIndex(filesToIndex);
}
