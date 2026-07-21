/**
 * Chapter Generator
 * Splits a manuscript into individual chapter notes
 */
import type { ChapterGeneratorOptions, GeneratorResult } from './types.js';
/**
 * Generate chapter notes from a manuscript file
 */
export declare function generateChapters(options: ChapterGeneratorOptions): Promise<GeneratorResult>;
/**
 * Analyze a manuscript and return chapter info without generating files
 */
export declare function analyzeManuscript(manuscriptPath: string): {
    chapters: Array<{
        number: number;
        title: string | null;
        lines: number;
    }>;
    totalLines: number;
};
//# sourceMappingURL=chapters.d.ts.map