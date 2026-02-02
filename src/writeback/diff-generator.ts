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
export function generateLineDiff(before: string, after: string): DiffResult {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');

  const lines: DiffLine[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let unchangedCount = 0;

  // Simple LCS-based diff
  const lcs = longestCommonSubsequence(beforeLines, afterLines);

  let beforeIdx = 0;
  let afterIdx = 0;
  let lcsIdx = 0;

  while (beforeIdx < beforeLines.length || afterIdx < afterLines.length) {
    const beforeLine = beforeLines[beforeIdx];
    const afterLine = afterLines[afterIdx];
    const lcsLine = lcs[lcsIdx];

    if (beforeIdx < beforeLines.length && beforeLine === lcsLine) {
      if (afterIdx < afterLines.length && afterLine === lcsLine) {
        // Unchanged line
        lines.push({
          type: 'unchanged',
          content: beforeLine ?? '',
          lineNumber: afterIdx + 1,
        });
        unchangedCount++;
        beforeIdx++;
        afterIdx++;
        lcsIdx++;
      } else if (afterIdx < afterLines.length) {
        // Added line
        lines.push({
          type: 'added',
          content: afterLine ?? '',
          lineNumber: afterIdx + 1,
        });
        addedCount++;
        afterIdx++;
      } else {
        // Removed line
        lines.push({
          type: 'removed',
          content: beforeLine ?? '',
        });
        removedCount++;
        beforeIdx++;
      }
    } else if (beforeIdx < beforeLines.length) {
      // Removed line
      lines.push({
        type: 'removed',
        content: beforeLine ?? '',
      });
      removedCount++;
      beforeIdx++;
    } else if (afterIdx < afterLines.length) {
      // Added line
      lines.push({
        type: 'added',
        content: afterLine ?? '',
        lineNumber: afterIdx + 1,
      });
      addedCount++;
      afterIdx++;
    }
  }

  return {
    lines,
    addedCount,
    removedCount,
    unchangedCount,
  };
}

/**
 * Compute longest common subsequence of lines
 */
function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;

  // DP table
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = (dp[i - 1]?.[j - 1] ?? 0) + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]?.[j] ?? 0, dp[i]?.[j - 1] ?? 0);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]!);
      i--;
      j--;
    } else if ((dp[i - 1]?.[j] ?? 0) > (dp[i]?.[j - 1] ?? 0)) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * Format diff as a string (similar to unified diff format)
 */
export function formatDiff(diff: DiffResult): string {
  const lines: string[] = [];

  for (const line of diff.lines) {
    switch (line.type) {
      case 'unchanged':
        lines.push(`  ${line.content}`);
        break;
      case 'added':
        lines.push(`+ ${line.content}`);
        break;
      case 'removed':
        lines.push(`- ${line.content}`);
        break;
    }
  }

  return lines.join('\n');
}

/**
 * Format diff with color codes for terminal
 */
export function formatDiffColored(diff: DiffResult): string {
  const lines: string[] = [];

  const RED = '\x1b[31m';
  const GREEN = '\x1b[32m';
  const RESET = '\x1b[0m';

  for (const line of diff.lines) {
    switch (line.type) {
      case 'unchanged':
        lines.push(`  ${line.content}`);
        break;
      case 'added':
        lines.push(`${GREEN}+ ${line.content}${RESET}`);
        break;
      case 'removed':
        lines.push(`${RED}- ${line.content}${RESET}`);
        break;
    }
  }

  return lines.join('\n');
}

/**
 * Generate a compact diff summary
 */
export function getDiffSummary(diff: DiffResult): string {
  return `+${diff.addedCount} -${diff.removedCount} (${diff.unchangedCount} unchanged)`;
}

// Default context lines (can be overridden via config)
const DEFAULT_CONTEXT_LINES = 3;

/**
 * Get context around changes (for preview)
 */
export function getDiffWithContext(
  diff: DiffResult,
  contextLines: number = DEFAULT_CONTEXT_LINES
): DiffLine[] {
  const result: DiffLine[] = [];
  const lines = diff.lines;

  // Find change positions
  const changePositions = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.type !== 'unchanged') {
      // Add context around this change
      for (let j = Math.max(0, i - contextLines); j <= Math.min(lines.length - 1, i + contextLines); j++) {
        changePositions.add(j);
      }
    }
  }

  // Build result with separators for gaps
  let lastIncluded = -1;
  for (let i = 0; i < lines.length; i++) {
    if (changePositions.has(i)) {
      if (lastIncluded >= 0 && i > lastIncluded + 1) {
        // Add separator
        result.push({ type: 'unchanged', content: '...' });
      }
      const line = lines[i];
      if (line) {
        result.push(line);
      }
      lastIncluded = i;
    }
  }

  return result;
}
