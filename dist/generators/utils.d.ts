/**
 * Shared utilities for vault generators
 */
import type { KBData, ArcLedger, WorldRulesData } from './types.js';
/**
 * Sanitize a string for use as a filename
 * Removes or replaces characters that are unsafe in filenames
 */
export declare function sanitizeFilename(name: string): string;
/**
 * Generate a safe path for a note file
 */
export declare function generateNotePath(outputDir: string, subdir: string, name: string, extension?: string): string;
/**
 * Build frontmatter YAML string from data
 */
export declare function buildFrontmatter(data: Record<string, unknown>): string;
/**
 * Build a complete note with frontmatter and content
 */
export declare function buildNote(frontmatter: Record<string, unknown>, content: string): string;
/**
 * Load and parse a JSON file
 */
export declare function loadJson<T>(filePath: string): T;
/**
 * Load KB data from JSON file
 */
export declare function parseKBJson(kbPath: string): KBData;
/**
 * Load arc ledger from JSON file
 */
export declare function parseArcLedger(arcLedgerPath: string): ArcLedger;
/**
 * Load world rules from JSON file
 */
export declare function parseWorldRules(worldRulesPath: string): WorldRulesData;
/**
 * Find KB files in a project directory
 */
export declare function findKBFiles(projectDir: string): {
    kb?: string;
    arcLedger?: string;
    worldRules?: string;
};
/**
 * Case-insensitive entity tracker for deduplication
 */
export declare class EntityTracker {
    private seen;
    /**
     * Check if an entity has been seen
     */
    has(name: string): boolean;
    /**
     * Add an entity to the tracker
     * Returns false if already present
     */
    add(name: string): boolean;
    /**
     * Get the canonical name for an entity
     */
    getCanonical(name: string): string | undefined;
    /**
     * Get all tracked entities
     */
    getAll(): string[];
}
/**
 * Write a file, creating directories as needed
 * Returns true if file was written, false if skipped
 */
export declare function writeNoteFile(filePath: string, content: string, options?: {
    force?: boolean | undefined;
    dryRun?: boolean | undefined;
}): Promise<boolean>;
/**
 * Create a wikilink
 */
export declare function wikilink(target: string, display?: string): string;
/**
 * Create a list of wikilinks
 */
export declare function wikilinkList(items: string[]): string;
/**
 * Format an array as a YAML-compatible list in frontmatter
 */
export declare function formatList(items: string[] | undefined): string[] | undefined;
/**
 * Format chapters as a readable string
 */
export declare function formatChapters(chapters: number[] | undefined): string;
/**
 * Create a section header
 */
export declare function section(title: string, level?: number): string;
/**
 * Create a blockquote
 */
export declare function blockquote(text: string): string;
/**
 * Format a key-value pair for display
 */
export declare function kvPair(key: string, value: unknown): string;
//# sourceMappingURL=utils.d.ts.map