import type { Root } from 'mdast';
import type { WikiLink, Frontmatter, NodeType } from '../core/types/index.js';
import type { ExclusionZone } from './exclusions.js';
export interface ParsedMarkdown {
    frontmatter: Frontmatter | null;
    title: string;
    type: NodeType;
    aliases: string[];
    content: string;
    contentStartOffset: number;
    links: WikiLink[];
    exclusionZones: ExclusionZone[];
    headings: Array<{
        level: number;
        text: string;
        position: {
            start: number;
            end: number;
        };
    }>;
    paragraphs: Array<{
        text: string;
        position: {
            start: number;
            end: number;
        };
    }>;
    ast: Root;
}
/**
 * Parse a markdown document into structured data
 */
export declare function parseMarkdown(source: string, filePath: string): ParsedMarkdown;
/**
 * Extract plain text from markdown (strips formatting)
 */
export declare function extractPlainText(source: string): string;
/**
 * Split content into sections based on headings
 */
export declare function splitIntoSections(parsed: ParsedMarkdown): Array<{
    heading: string | null;
    level: number;
    content: string;
    start: number;
    end: number;
}>;
/**
 * Split content into paragraphs
 */
export declare function splitIntoParagraphs(content: string): Array<{
    text: string;
    start: number;
    end: number;
}>;
/**
 * Stringify markdown AST back to text
 */
export declare function stringifyMarkdown(ast: Root): string;
//# sourceMappingURL=markdown.d.ts.map