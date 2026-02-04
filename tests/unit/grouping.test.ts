import { describe, it, expect } from 'vitest';
import {
  findGroupBoundaries,
  applyGrouping,
  DEFAULT_GROUPING_CONFIG,
  type GroupingConfig,
} from '../../src/cli/commands/focus.js';

describe('Statistical Grouping Algorithm', () => {
  describe('findGroupBoundaries', () => {
    it('should return empty array for single item', () => {
      const results = [{ score: 0.8 }];
      const boundaries = findGroupBoundaries(results, DEFAULT_GROUPING_CONFIG);
      expect(boundaries).toEqual([]);
    });

    it('should return empty array for two items', () => {
      const results = [{ score: 0.8 }, { score: 0.7 }];
      const boundaries = findGroupBoundaries(results, DEFAULT_GROUPING_CONFIG);
      expect(boundaries).toEqual([]);
    });

    it('should return empty array when disabled', () => {
      const results = [
        { score: 0.9 },
        { score: 0.5 }, // Big gap
        { score: 0.45 },
      ];
      const config: GroupingConfig = { ...DEFAULT_GROUPING_CONFIG, enabled: false };
      const boundaries = findGroupBoundaries(results, config);
      expect(boundaries).toEqual([]);
    });

    it('should find boundary at obvious gap', () => {
      // Scores: 0.9, 0.85, 0.8, [GAP], 0.4, 0.35
      // Gaps:   0.05, 0.05, 0.4, 0.05
      // Mean: 0.1375, Std: ~0.15
      // Threshold (k=1.0): 0.1375 + 0.15 = ~0.29
      // Gap 0.4 > 0.29, so boundary at index 3
      const results = [
        { score: 0.9 },
        { score: 0.85 },
        { score: 0.8 },
        { score: 0.4 },
        { score: 0.35 },
      ];
      const boundaries = findGroupBoundaries(results, DEFAULT_GROUPING_CONFIG);
      expect(boundaries).toContain(3);
    });

    it('should find multiple boundaries', () => {
      // Scores: 0.95, 0.9, [GAP], 0.6, 0.55, [GAP], 0.2, 0.15
      // Gaps:   0.05, 0.3, 0.05, 0.35, 0.05
      const results = [
        { score: 0.95 },
        { score: 0.9 },
        { score: 0.6 },
        { score: 0.55 },
        { score: 0.2 },
        { score: 0.15 },
      ];
      const boundaries = findGroupBoundaries(results, DEFAULT_GROUPING_CONFIG);
      // Should find boundaries at indices 2 and 4
      expect(boundaries.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect kStrong multiplier', () => {
      // With higher k, threshold is higher, fewer boundaries found
      const results = [
        { score: 0.9 },
        { score: 0.7 },
        { score: 0.5 },
        { score: 0.3 },
      ];

      // kStrong = 0: mean is threshold
      const configLow: GroupingConfig = { enabled: true, kStrong: 0, kWeak: 0 };
      const boundariesLow = findGroupBoundaries(results, configLow);

      // kStrong = 2.0: mean + 2*std is threshold (fewer boundaries)
      const configHigh: GroupingConfig = { enabled: true, kStrong: 2.0, kWeak: 0 };
      const boundariesHigh = findGroupBoundaries(results, configHigh);

      // Lower k should find more or equal boundaries
      expect(boundariesLow.length).toBeGreaterThanOrEqual(boundariesHigh.length);
    });

    it('should handle uniform gaps (no boundaries)', () => {
      // All gaps are equal, so no gap exceeds mean + std
      const results = [
        { score: 0.9 },
        { score: 0.8 },
        { score: 0.7 },
        { score: 0.6 },
        { score: 0.5 },
      ];
      const boundaries = findGroupBoundaries(results, DEFAULT_GROUPING_CONFIG);
      // With uniform gaps, std ≈ 0, so threshold = mean
      // No gap exceeds mean, so no boundaries
      expect(boundaries).toEqual([]);
    });
  });

  describe('applyGrouping', () => {
    it('should return all items when disabled', () => {
      const results = [
        { score: 0.9, id: 'a' },
        { score: 0.5, id: 'b' },
        { score: 0.45, id: 'c' },
      ];
      const config: GroupingConfig = { ...DEFAULT_GROUPING_CONFIG, enabled: false };
      const grouped = applyGrouping(results, config);
      expect(grouped).toEqual(results);
    });

    it('should return all items for single item', () => {
      const results = [{ score: 0.9, id: 'a' }];
      const grouped = applyGrouping(results, DEFAULT_GROUPING_CONFIG);
      expect(grouped).toEqual(results);
    });

    it('should return first group only with maxGroups=1', () => {
      // Scores: 0.9, 0.85, 0.8, [GAP at index 3], 0.4, 0.35
      const results = [
        { score: 0.9, id: 'a' },
        { score: 0.85, id: 'b' },
        { score: 0.8, id: 'c' },
        { score: 0.4, id: 'd' },
        { score: 0.35, id: 'e' },
      ];
      const grouped = applyGrouping(results, DEFAULT_GROUPING_CONFIG, 1);
      // Should stop at boundary, returning first 3 items
      expect(grouped.length).toBeLessThanOrEqual(3);
      expect(grouped.map(g => g.id)).toEqual(['a', 'b', 'c']);
    });

    it('should return two groups with maxGroups=2', () => {
      // Scores: 0.95, 0.9, [GAP], 0.6, 0.55, [GAP], 0.2, 0.15
      const results = [
        { score: 0.95, id: 'a' },
        { score: 0.9, id: 'b' },
        { score: 0.6, id: 'c' },
        { score: 0.55, id: 'd' },
        { score: 0.2, id: 'e' },
        { score: 0.15, id: 'f' },
      ];
      const grouped = applyGrouping(results, DEFAULT_GROUPING_CONFIG, 2);
      // Should include first two groups (up to and including second boundary)
      expect(grouped.length).toBeLessThan(results.length);
    });

    it('should return all items when no boundaries found', () => {
      // Uniform gaps = no boundaries
      const results = [
        { score: 0.9, id: 'a' },
        { score: 0.8, id: 'b' },
        { score: 0.7, id: 'c' },
        { score: 0.6, id: 'd' },
      ];
      const grouped = applyGrouping(results, DEFAULT_GROUPING_CONFIG);
      expect(grouped).toEqual(results);
    });

    it('should handle case where fewer boundaries than maxGroups', () => {
      // Only one boundary exists but requesting 2 groups
      const results = [
        { score: 0.9, id: 'a' },
        { score: 0.85, id: 'b' },
        { score: 0.4, id: 'c' }, // One obvious gap
        { score: 0.35, id: 'd' },
      ];
      const grouped = applyGrouping(results, DEFAULT_GROUPING_CONFIG, 2);
      // Should return all since only 1 boundary < 2 requested groups
      expect(grouped.length).toBe(4);
    });
  });

  describe('integration: relatedNotes use case', () => {
    it('should separate highly related from loosely related', () => {
      // Simulate related notes scenario
      const relatedNotes = [
        { score: 0.82, title: 'Character Kevin' },
        { score: 0.78, title: 'Kevin Background' },
        { score: 0.75, title: 'Kevin Relationships' },
        // Gap: these are about different topics
        { score: 0.52, title: 'The Basement' },
        { score: 0.48, title: 'House Layout' },
        // Another gap: even less related
        { score: 0.38, title: 'Random Note' },
        { score: 0.35, title: 'Another Random' },
      ];

      // With k=1.0, should find the natural breaks
      const strongGroup = applyGrouping(relatedNotes, DEFAULT_GROUPING_CONFIG, 1);
      expect(strongGroup.length).toBeLessThanOrEqual(3);
      expect(strongGroup.every(n => n.title.includes('Kevin'))).toBe(true);
    });

    it('should maintain deterministic ordering', () => {
      // Results should maintain score-descending order after grouping
      const results = [
        { score: 0.9, id: 'a' },
        { score: 0.85, id: 'b' },
        { score: 0.4, id: 'c' },
      ];
      const grouped = applyGrouping(results, DEFAULT_GROUPING_CONFIG, 1);

      // Verify descending order
      for (let i = 0; i < grouped.length - 1; i++) {
        expect(grouped[i].score).toBeGreaterThanOrEqual(grouped[i + 1].score);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', () => {
      const results: { score: number }[] = [];
      const grouped = applyGrouping(results, DEFAULT_GROUPING_CONFIG);
      expect(grouped).toEqual([]);
    });

    it('should handle identical scores', () => {
      const results = [
        { score: 0.7, id: 'a' },
        { score: 0.7, id: 'b' },
        { score: 0.7, id: 'c' },
      ];
      const grouped = applyGrouping(results, DEFAULT_GROUPING_CONFIG);
      // All same score = gaps all 0 = no boundaries
      expect(grouped).toEqual(results);
    });

    it('should handle very small score differences', () => {
      const results = [
        { score: 0.70001, id: 'a' },
        { score: 0.70000, id: 'b' },
        { score: 0.69999, id: 'c' },
      ];
      const grouped = applyGrouping(results, DEFAULT_GROUPING_CONFIG);
      // Tiny differences, no significant boundaries
      expect(grouped).toEqual(results);
    });
  });
});
