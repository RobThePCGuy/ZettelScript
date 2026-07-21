/**
 * Simple diff generation for proposal visualization
 */
export interface DiffLine {
    type: 'unchanged' | 'added' | 'removed';
    content: string;
    lineNumber?: number;
}
export interface DiffResult {
    lines: DiffLine[];
    addedCount: number;
    removedCount: number;
    unchangedCount: number;
}
/**
 * Generate a simple line-based diff
 */
export declare function generateLineDiff(before: string, after: string): DiffResult;
/**
 * Format diff as a string (similar to unified diff format)
 */
export declare function formatDiff(diff: DiffResult): string;
/**
 * Format diff with color codes for terminal
 */
export declare function formatDiffColored(diff: DiffResult): string;
/**
 * Generate a compact diff summary
 */
export declare function getDiffSummary(diff: DiffResult): string;
/**
 * Get context around changes (for preview)
 */
export declare function getDiffWithContext(diff: DiffResult, contextLines?: number): DiffLine[];
//# sourceMappingURL=diff-generator.d.ts.map