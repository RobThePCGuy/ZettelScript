/**
 * Write content to a file
 */
export declare function writeFile(filePath: string, content: string, createDirs?: boolean): Promise<void>;
/**
 * Append content to a file
 */
export declare function appendFile(filePath: string, content: string, createDirs?: boolean): Promise<void>;
/**
 * Delete a file
 */
export declare function deleteFile(filePath: string): Promise<void>;
/**
 * Rename/move a file
 */
export declare function moveFile(oldPath: string, newPath: string, createDirs?: boolean): Promise<void>;
/**
 * Copy a file
 */
export declare function copyFile(srcPath: string, destPath: string, createDirs?: boolean): Promise<void>;
/**
 * Create a directory
 */
export declare function createDirectory(dirPath: string): Promise<void>;
/**
 * Delete a directory
 */
export declare function deleteDirectory(dirPath: string, recursive?: boolean): Promise<void>;
/**
 * Create a backup of a file
 */
export declare function backupFile(filePath: string, backupDir?: string): Promise<string>;
/**
 * Atomic write (write to temp then rename)
 */
export declare function atomicWrite(filePath: string, content: string): Promise<void>;
//# sourceMappingURL=writer.d.ts.map