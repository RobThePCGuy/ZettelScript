import type { Frontmatter } from '../core/types/index.js';
export interface ParsedDocument {
    frontmatter: Frontmatter | null;
    content: string;
    contentStartOffset: number;
}
/**
 * Parse frontmatter from a markdown document
 */
export declare function parseFrontmatter(source: string, filePath: string): ParsedDocument;
/**
 * Extract title from frontmatter or first heading
 */
export declare function extractTitle(frontmatter: Frontmatter | null, content: string, filePath: string): string;
/**
 * Extract node type from frontmatter
 */
export declare function extractNodeType(frontmatter: Frontmatter | null): string;
/**
 * Extract aliases from frontmatter
 */
export declare function extractAliases(frontmatter: Frontmatter | null): string[];
/**
 * Serialize frontmatter back to YAML string
 */
export declare function serializeFrontmatter(frontmatter: Frontmatter): string;
/**
 * Update frontmatter in a document
 */
export declare function updateFrontmatter(source: string, updates: Partial<Frontmatter>, filePath: string): string;
/**
 * Validate frontmatter schema
 */
export declare function validateFrontmatter(frontmatter: Frontmatter): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=frontmatter.d.ts.map