import { EventEmitter } from 'node:events';
import { FileWatcher, type FileEvent, type WatcherOptions } from '../storage/filesystem/watcher.js';
import { readFile } from '../storage/filesystem/reader.js';
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
export class IncrementalIndexer extends EventEmitter {
  private watcher: FileWatcher;
  private pipeline: IndexingPipeline;
  private basePath: string;
  private processing: Set<string> = new Set();

  constructor(options: IncrementalIndexerOptions) {
    super();

    this.basePath = options.basePath;
    this.pipeline = options.pipeline;

    this.watcher = new FileWatcher({
      ...options,
      basePath: this.basePath,
    });

    // Set up event handlers
    this.watcher.on('file', this.handleFileEvent.bind(this));
    this.watcher.on('error', (error) => this.emit('error', error));
    this.watcher.on('ready', () => this.emit('ready'));
  }

  /**
   * Start watching and indexing
   */
  start(): void {
    this.watcher.start();
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    await this.watcher.stop();
  }

  /**
   * Handle a file event
   */
  private async handleFileEvent(event: FileEvent): Promise<void> {
    // Prevent concurrent processing of the same file
    if (this.processing.has(event.path)) {
      return;
    }

    this.processing.add(event.path);

    try {
      switch (event.type) {
        case 'add':
        case 'change':
          await this.handleAddOrChange(event);
          break;

        case 'unlink':
          await this.handleUnlink(event);
          break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('event', {
        type: 'error',
        path: event.relativePath,
        error: errorMessage,
      } as IncrementalIndexEvent);
    } finally {
      this.processing.delete(event.path);
    }
  }

  /**
   * Handle file add or change
   */
  private async handleAddOrChange(event: FileEvent): Promise<void> {
    const file = await readFile(event.path, this.basePath);
    const result = await this.pipeline.indexFile(file);

    this.emit('event', {
      type: 'indexed',
      path: event.relativePath,
      result,
    } as IncrementalIndexEvent);

    // Clear resolver cache after changes
    this.pipeline.clearResolverCache();
  }

  /**
   * Handle file deletion
   */
  private async handleUnlink(event: FileEvent): Promise<void> {
    await this.pipeline.removeByPath(event.relativePath);

    this.emit('event', {
      type: 'removed',
      path: event.relativePath,
    } as IncrementalIndexEvent);

    // Clear resolver cache after deletion
    this.pipeline.clearResolverCache();
  }

  /**
   * Check if watching
   */
  isWatching(): boolean {
    return this.watcher.isWatching();
  }
}

/**
 * Create an incremental indexer
 */
export function createIncrementalIndexer(
  basePath: string,
  pipeline: IndexingPipeline,
  options: Omit<IncrementalIndexerOptions, 'basePath' | 'pipeline'> = {}
): IncrementalIndexer {
  return new IncrementalIndexer({
    ...options,
    basePath,
    pipeline,
  });
}
