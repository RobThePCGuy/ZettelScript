import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  reciprocalRankFusion,
  weightedScoreFusion,
  interleave,
} from '../../src/retrieval/fusion/rrf.js';
import {
  generateLineDiff,
  formatDiff,
  getDiffSummary,
} from '../../src/writeback/diff-generator.js';

describe('Reciprocal Rank Fusion', () => {
  it('should fuse results from multiple sources', () => {
    const resultLists = new Map([
      [
        'semantic',
        [
          { id: 'a', score: 0.9, source: 'semantic' },
          { id: 'b', score: 0.8, source: 'semantic' },
          { id: 'c', score: 0.7, source: 'semantic' },
        ],
      ],
      [
        'lexical',
        [
          { id: 'b', score: 0.95, source: 'lexical' },
          { id: 'a', score: 0.85, source: 'lexical' },
          { id: 'd', score: 0.75, source: 'lexical' },
        ],
      ],
    ]);

    const fused = reciprocalRankFusion(resultLists);

    // Results should be present and scored
    expect(fused.length).toBeGreaterThan(0);

    // Items in both lists should have higher scores
    const itemA = fused.find((f) => f.id === 'a');
    const itemD = fused.find((f) => f.id === 'd');

    expect(itemA?.sources).toContain('semantic');
    expect(itemA?.sources).toContain('lexical');
    expect(itemD?.sources).toEqual(['lexical']);
  });

  it('should respect custom weights', () => {
    const resultLists = new Map([
      ['high_weight', [{ id: 'a', score: 0.9, source: 'high_weight' }]],
      ['low_weight', [{ id: 'b', score: 0.9, source: 'low_weight' }]],
    ]);

    const fused = reciprocalRankFusion(resultLists, {
      weights: { high_weight: 2.0, low_weight: 0.5 },
    });

    const itemA = fused.find((f) => f.id === 'a');
    const itemB = fused.find((f) => f.id === 'b');

    expect(itemA?.score).toBeGreaterThan(itemB?.score ?? 0);
  });

  it('should use custom k value', () => {
    const resultLists = new Map([
      [
        'source',
        [
          { id: 'a', score: 0.9, source: 'source' },
          { id: 'b', score: 0.8, source: 'source' },
        ],
      ],
    ]);

    const fusedK60 = reciprocalRankFusion(resultLists, { k: 60 });
    const fusedK10 = reciprocalRankFusion(resultLists, { k: 10 });

    // With lower k, difference between ranks is more pronounced
    const diffK60 = (fusedK60[0]?.score ?? 0) - (fusedK60[1]?.score ?? 0);
    const diffK10 = (fusedK10[0]?.score ?? 0) - (fusedK10[1]?.score ?? 0);

    expect(diffK10).toBeGreaterThan(diffK60);
  });
});

describe('Weighted Score Fusion', () => {
  it('should compute weighted average scores', () => {
    const resultLists = new Map([
      ['source1', [{ id: 'a', score: 1.0, source: 'source1' }]],
      ['source2', [{ id: 'a', score: 0.5, source: 'source2' }]],
    ]);

    const fused = weightedScoreFusion(resultLists, {
      source1: 1.0,
      source2: 1.0,
    });

    // Should average to 0.75
    expect(fused[0]?.score).toBe(0.75);
  });
});

describe('Interleave', () => {
  it('should interleave results from multiple sources', () => {
    const resultLists = new Map([
      [
        'source1',
        [
          { id: 'a', score: 0.9, source: 'source1' },
          { id: 'c', score: 0.7, source: 'source1' },
        ],
      ],
      [
        'source2',
        [
          { id: 'b', score: 0.85, source: 'source2' },
          { id: 'd', score: 0.65, source: 'source2' },
        ],
      ],
    ]);

    const interleaved = interleave(resultLists, 4);

    expect(interleaved).toHaveLength(4);
    // Should alternate sources
    expect(interleaved.map((i) => i.id)).toContain('a');
    expect(interleaved.map((i) => i.id)).toContain('b');
  });

  it('should respect maxResults', () => {
    const resultLists = new Map([
      [
        'source',
        [
          { id: 'a', score: 0.9, source: 'source' },
          { id: 'b', score: 0.8, source: 'source' },
          { id: 'c', score: 0.7, source: 'source' },
        ],
      ],
    ]);

    const interleaved = interleave(resultLists, 2);
    expect(interleaved).toHaveLength(2);
  });
});

describe('Diff Generator', () => {
  it('should generate line diff for simple changes', () => {
    const before = 'line 1\nline 2\nline 3';
    const after = 'line 1\nline 2 modified\nline 3';

    const diff = generateLineDiff(before, after);

    expect(diff.addedCount).toBe(1);
    expect(diff.removedCount).toBe(1);
    expect(diff.unchangedCount).toBe(2);
  });

  it('should handle additions', () => {
    const before = 'line 1\nline 2';
    const after = 'line 1\nline 2\nline 3';

    const diff = generateLineDiff(before, after);

    expect(diff.addedCount).toBe(1);
    expect(diff.removedCount).toBe(0);
  });

  it('should handle deletions', () => {
    const before = 'line 1\nline 2\nline 3';
    const after = 'line 1\nline 3';

    const diff = generateLineDiff(before, after);

    expect(diff.removedCount).toBe(1);
  });

  it('should format diff as string', () => {
    const before = 'old';
    const after = 'new';

    const diff = generateLineDiff(before, after);
    const formatted = formatDiff(diff);

    expect(formatted).toContain('- old');
    expect(formatted).toContain('+ new');
  });

  it('should generate summary', () => {
    const diff = {
      lines: [],
      addedCount: 5,
      removedCount: 3,
      unchangedCount: 10,
    };

    const summary = getDiffSummary(diff);
    expect(summary).toBe('+5 -3 (10 unchanged)');
  });
});
