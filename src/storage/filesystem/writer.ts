import * as fs from 'node:fs';
import * as path from 'node:path';
import { FileSystemError } from '../../core/errors.js';

/**
 * Write content to a file
 */
export async function writeFile(
  filePath: string,
  content: string,
  createDirs: boolean = true
): Promise<void> {
  try {
    if (createDirs) {
      const dir = path.dirname(filePath);
      await fs.promises.mkdir(dir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new FileSystemError(`Failed to write file: ${error}`, filePath);
  }
}

/**
 * Append content to a file
 */
export async function appendFile(
  filePath: string,
  content: string,
  createDirs: boolean = true
): Promise<void> {
  try {
    if (createDirs) {
      const dir = path.dirname(filePath);
      await fs.promises.mkdir(dir, { recursive: true });
    }

    await fs.promises.appendFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new FileSystemError(`Failed to append to file: ${error}`, filePath);
  }
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    const err = error as { code?: string };
    if (err.code !== 'ENOENT') {
      throw new FileSystemError(`Failed to delete file: ${error}`, filePath);
    }
  }
}

/**
 * Rename/move a file
 */
export async function moveFile(
  oldPath: string,
  newPath: string,
  createDirs: boolean = true
): Promise<void> {
  try {
    if (createDirs) {
      const dir = path.dirname(newPath);
      await fs.promises.mkdir(dir, { recursive: true });
    }

    await fs.promises.rename(oldPath, newPath);
  } catch (error) {
    throw new FileSystemError(`Failed to move file: ${error}`, oldPath);
  }
}

/**
 * Copy a file
 */
export async function copyFile(
  srcPath: string,
  destPath: string,
  createDirs: boolean = true
): Promise<void> {
  try {
    if (createDirs) {
      const dir = path.dirname(destPath);
      await fs.promises.mkdir(dir, { recursive: true });
    }

    await fs.promises.copyFile(srcPath, destPath);
  } catch (error) {
    throw new FileSystemError(`Failed to copy file: ${error}`, srcPath);
  }
}

/**
 * Create a directory
 */
export async function createDirectory(dirPath: string): Promise<void> {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new FileSystemError(`Failed to create directory: ${error}`, dirPath);
  }
}

/**
 * Delete a directory
 */
export async function deleteDirectory(dirPath: string, recursive: boolean = false): Promise<void> {
  try {
    await fs.promises.rm(dirPath, { recursive, force: true });
  } catch (error) {
    throw new FileSystemError(`Failed to delete directory: ${error}`, dirPath);
  }
}

/**
 * Create a backup of a file
 */
export async function backupFile(filePath: string, backupDir?: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const dir = backupDir || path.dirname(filePath);

  const backupPath = path.join(dir, `${base}.${timestamp}${ext}`);

  await copyFile(filePath, backupPath);
  return backupPath;
}

/**
 * Atomic write (write to temp then rename)
 */
export async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}`;

  try {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });

    await fs.promises.writeFile(tempPath, content, 'utf-8');
    await fs.promises.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.promises.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw new FileSystemError(`Failed atomic write: ${error}`, filePath);
  }
}
