import type { Chunk, ZettelScriptConfig } from '../../core/types/index.js';
import { type ParsedMarkdown } from '../../parser/markdown.js';
export interface ChunkingOptions {
    strategy: 'paragraph' | 'section' | 'sliding' | 'scene';
    maxTokens?: number;
    overlap?: number;
    minChunkSize?: number;
    config?: ZettelScriptConfig;
}
export interface ChunkCandidate {
    text: string;
    offsetStart: number;
    offsetEnd: number;
    metadata?: Record<string, unknown>;
}
/**
 * Chunk content by paragraphs
 */
export declare function chunkByParagraph(content: string, contentStartOffset: number, options: ChunkingOptions): ChunkCandidate[];
/**
 * Chunk content by sections (headings)
 */
export declare function chunkBySection(parsed: ParsedMarkdown, options: ChunkingOptions): ChunkCandidate[];
/**
 * Chunk content using sliding window
 */
export declare function chunkBySliding(content: string, contentStartOffset: number, options: ChunkingOptions): ChunkCandidate[];
/**
 * Chunk content for scenes (manuscript-specific)
 * Keeps scene beats together, respects dialogue blocks
 */
export declare function chunkByScene(content: string, contentStartOffset: number, options: ChunkingOptions): ChunkCandidate[];
/**
 * Main chunking function
 */
export declare function chunkContent(parsed: ParsedMarkdown, options: ChunkingOptions): ChunkCandidate[];
/**
 * Create chunks from candidates with metadata
 */
export declare function createChunks(candidates: ChunkCandidate[], nodeId: string, versionId: string): Omit<Chunk, 'chunkId'>[];
//# sourceMappingURL=chunker.d.ts.map