import * as fs from 'node:fs';
export interface FileInfo {
    path: string;
    relativePath: string;
    content: string;
    contentHash: string;
    stats: {
        size: number;
        createdAt: Date;
        modifiedAt: Date;
    };
}
export interface WalkOptions {
    extensions?: string[];
    excludePatterns?: string[];
    maxDepth?: number;
}
/**
 * Calculate content hash (SHA-256)
 */
export declare function hashContent(content: string): string;
/**
 * Read a single file
 */
export declare function readFile(filePath: string, basePath: string): Promise<FileInfo>;
/**
 * Walk a directory tree and yield markdown files
 */
export declare function walkDirectory(basePath: string, options?: WalkOptions): AsyncGenerator<FileInfo>;
/**
 * Get all markdown files in a directory (non-streaming)
 */
export declare function getMarkdownFiles(basePath: string, options?: WalkOptions): Promise<FileInfo[]>;
/**
 * Check if a file exists
 */
export declare function fileExists(filePath: string): Promise<boolean>;
/**
 * Get file stats
 */
export declare function getFileStats(filePath: string): Promise<fs.Stats | null>;
/**
 * Compare file modification time with stored time
 */
export declare function hasFileChanged(filePath: string, storedHash: string): Promise<boolean>;
//# sourceMappingURL=reader.d.ts.map