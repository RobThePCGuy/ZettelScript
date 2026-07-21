import { EventEmitter } from 'node:events';
export type FileEventType = 'add' | 'change' | 'unlink' | 'rename';
export interface FileEvent {
    type: FileEventType;
    path: string;
    relativePath: string;
    oldPath?: string;
}
export interface WatcherOptions {
    basePath: string;
    extensions?: string[];
    excludePatterns?: string[];
    debounceMs?: number;
    awaitWriteFinish?: boolean;
}
/**
 * File system watcher using chokidar
 */
export declare class FileWatcher extends EventEmitter {
    private watcher;
    private basePath;
    private options;
    private debounceTimers;
    private pendingEvents;
    constructor(options: WatcherOptions);
    /**
     * Start watching
     */
    start(): void;
    /**
     * Stop watching
     */
    stop(): Promise<void>;
    /**
     * Handle a file event with debouncing
     */
    private handleEvent;
    /**
     * Check if watching
     */
    isWatching(): boolean;
    /**
     * Get watched paths
     */
    getWatched(): Record<string, string[]>;
}
/**
 * Create a file watcher
 */
export declare function createWatcher(options: WatcherOptions): FileWatcher;
//# sourceMappingURL=watcher.d.ts.map