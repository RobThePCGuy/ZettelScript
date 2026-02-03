import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { FileSystemError } from '../../core/errors.js';
import { getLogger } from '../../core/logger.js';

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

const DEFAULT_EXTENSIONS = ['.md', '.markdown'];
const DEFAULT_EXCLUDE = ['node_modules', '.git', '.zettelscript', '.obsidian', '.vscode', '.idea'];

/**
 * Calculate content hash (SHA-256)
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Read a single file
 */
export async function readFile(filePath: string, basePath: string): Promise<FileInfo> {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(basePath, filePath);
    const relativePath = path.relative(basePath, absolutePath);

    const content = await fs.promises.readFile(absolutePath, 'utf-8');
    const stats = await fs.promises.stat(absolutePath);

    return {
      path: absolutePath,
      relativePath,
      content,
      contentHash: hashContent(content),
      stats: {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      },
    };
  } catch (error) {
    throw new FileSystemError(`Failed to read file: ${error}`, filePath);
  }
}

/**
 * Check if a path should be excluded
 */
function shouldExclude(relativePath: string, excludePatterns: string[]): boolean {
  for (const pattern of excludePatterns) {
    // Simple glob matching
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
      if (regex.test(relativePath)) return true;
    } else {
      // Direct match or prefix match
      if (
        relativePath === pattern ||
        relativePath.startsWith(pattern + '/') ||
        relativePath.startsWith(pattern + '\\')
      ) {
        return true;
      }

      // Check if any path segment matches
      const segments = relativePath.split(/[/\\]/);
      if (segments.some((s) => s === pattern)) return true;
    }
  }
  return false;
}

/**
 * Walk a directory tree and yield markdown files
 */
export async function* walkDirectory(
  basePath: string,
  options: WalkOptions = {}
): AsyncGenerator<FileInfo> {
  const {
    extensions = DEFAULT_EXTENSIONS,
    excludePatterns = DEFAULT_EXCLUDE,
    maxDepth = Infinity,
  } = options;

  const logger = getLogger().child('filesystem');

  async function* walk(dir: string, depth: number): AsyncGenerator<FileInfo> {
    if (depth > maxDepth) return;

    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (error) {
      logger.error(`Error reading directory ${dir}: ${error}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      // Check exclusions
      if (shouldExclude(relativePath, excludePatterns)) continue;
      if (entry.name.startsWith('.')) continue; // Skip hidden files

      if (entry.isDirectory()) {
        yield* walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          try {
            yield await readFile(fullPath, basePath);
          } catch (error) {
            logger.error(`Error reading file ${fullPath}: ${error}`);
          }
        }
      }
    }
  }

  yield* walk(basePath, 0);
}

/**
 * Get all markdown files in a directory (non-streaming)
 */
export async function getMarkdownFiles(
  basePath: string,
  options: WalkOptions = {}
): Promise<FileInfo[]> {
  const files: FileInfo[] = [];

  for await (const file of walkDirectory(basePath, options)) {
    files.push(file);
  }

  return files;
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file stats
 */
export async function getFileStats(filePath: string): Promise<fs.Stats | null> {
  try {
    return await fs.promises.stat(filePath);
  } catch {
    return null;
  }
}

/**
 * Compare file modification time with stored time
 */
export async function hasFileChanged(filePath: string, storedHash: string): Promise<boolean> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const currentHash = hashContent(content);
    return currentHash !== storedHash;
  } catch {
    return true; // Assume changed if we can't read
  }
}
