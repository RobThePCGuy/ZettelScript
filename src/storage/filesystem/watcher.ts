import { watch, type FSWatcher } from 'chokidar';
import * as path from 'node:path';
import { EventEmitter } from 'node:events';

export type FileEventType = 'add' | 'change' | 'unlink' | 'rename';

export interface FileEvent {
  type: FileEventType;
  path: string;
  relativePath: string;
  oldPath?: string; // For rename events
}

export interface WatcherOptions {
  basePath: string;
  extensions?: string[];
  excludePatterns?: string[];
  debounceMs?: number;
  awaitWriteFinish?: boolean;
}

const DEFAULT_EXTENSIONS = ['.md', '.markdown'];
const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.zettelscript/**',
  '**/.obsidian/**',
  '**/.vscode/**',
  '**/.*',
];

/**
 * File system watcher using chokidar
 */
export class FileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private basePath: string;
  private options: WatcherOptions;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private pendingEvents: Map<string, FileEvent> = new Map();

  constructor(options: WatcherOptions) {
    super();
    this.basePath = options.basePath;
    this.options = {
      extensions: DEFAULT_EXTENSIONS,
      excludePatterns: DEFAULT_EXCLUDE,
      debounceMs: 100,
      awaitWriteFinish: true,
      ...options,
    };
  }

  /**
   * Start watching
   */
  start(): void {
    if (this.watcher) {
      return;
    }

    const patterns = this.options.extensions!.map((ext) =>
      path.join(this.basePath, '**', `*${ext}`)
    );

    this.watcher = watch(patterns, {
      ...(this.options.excludePatterns != null && { ignored: this.options.excludePatterns }),
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: this.options.awaitWriteFinish
        ? { stabilityThreshold: 100, pollInterval: 50 }
        : false,
      usePolling: false,
    });

    this.watcher
      .on('add', (filePath) => this.handleEvent('add', filePath))
      .on('change', (filePath) => this.handleEvent('change', filePath))
      .on('unlink', (filePath) => this.handleEvent('unlink', filePath))
      .on('error', (error) => this.emit('error', error))
      .on('ready', () => this.emit('ready'));
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (!this.watcher) {
      return;
    }

    // Clear pending timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.pendingEvents.clear();

    await this.watcher.close();
    this.watcher = null;
  }

  /**
   * Handle a file event with debouncing
   */
  private handleEvent(type: FileEventType, filePath: string): void {
    const relativePath = path.relative(this.basePath, filePath);

    // Cancel existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store the event
    const event: FileEvent = { type, path: filePath, relativePath };

    // If there's a pending add followed by a change, keep it as add
    const pending = this.pendingEvents.get(filePath);
    if (pending?.type === 'add' && type === 'change') {
      event.type = 'add';
    }

    this.pendingEvents.set(filePath, event);

    // Set debounce timer
    const timer = setTimeout(() => {
      const finalEvent = this.pendingEvents.get(filePath);
      if (finalEvent) {
        this.pendingEvents.delete(filePath);
        this.debounceTimers.delete(filePath);
        this.emit('file', finalEvent);
        this.emit(finalEvent.type, finalEvent);
      }
    }, this.options.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Check if watching
   */
  isWatching(): boolean {
    return this.watcher !== null;
  }

  /**
   * Get watched paths
   */
  getWatched(): Record<string, string[]> {
    if (!this.watcher) {
      return {};
    }
    return this.watcher.getWatched();
  }
}

/**
 * Create a file watcher
 */
export function createWatcher(options: WatcherOptions): FileWatcher {
  return new FileWatcher(options);
}
