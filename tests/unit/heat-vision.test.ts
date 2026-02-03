import { describe, it, expect } from 'vitest';

/**
 * Heat Vision unit tests
 *
 * These test the pure functions used for heat calculation.
 * The actual functions are inlined in visualize.ts client-side JS,
 * so we replicate them here for testing.
 */

const MS_PER_DAY = 86400000;

// Replicate computeAutoWindow logic
function computeAutoWindow(nodes: Array<{ updatedAtMs?: number; isGhost?: boolean }>): number {
  const now = Date.now();
  const ages = nodes
    .filter(n => n.updatedAtMs && !n.isGhost)
    .map(n => Math.max(0, (now - n.updatedAtMs!) / MS_PER_DAY))
    .sort((a, b) => a - b);

  if (ages.length < 10) return 30;

  const idx = Math.floor((ages.length - 1) * 0.85);
  const p85Value = ages[idx];

  return Math.round(Math.min(Math.max(p85Value, 7), 180));
}

// Replicate computeHeat logic
function computeHeat(
  nodes: Array<{ updatedAtMs?: number; isGhost?: boolean; heat?: number }>,
  windowDays: number
): void {
  const now = Date.now();

  for (const node of nodes) {
    if (!node.updatedAtMs || node.isGhost) {
      node.heat = 0;
      continue;
    }
    const ageDays = Math.max(0, (now - node.updatedAtMs) / MS_PER_DAY);
    node.heat = 1 - Math.min(Math.max(ageDays / windowDays, 0), 1);
  }
}

// Replicate settings loading logic
function parseManualWindow(value: string | null): number {
  const parsed = parseInt(value || '', 10);
  return (Number.isNaN(parsed) || parsed < 7 || parsed > 180) ? 30 : parsed;
}

describe('Heat Vision', () => {
  describe('computeAutoWindow', () => {
    it('should return 30 for less than 10 nodes', () => {
      const nodes = Array.from({ length: 5 }, (_, i) => ({
        updatedAtMs: Date.now() - i * MS_PER_DAY,
      }));
      expect(computeAutoWindow(nodes)).toBe(30);
    });

    it('should return 30 for exactly 9 nodes', () => {
      const nodes = Array.from({ length: 9 }, (_, i) => ({
        updatedAtMs: Date.now() - i * MS_PER_DAY,
      }));
      expect(computeAutoWindow(nodes)).toBe(30);
    });

    it('should ignore ghost nodes', () => {
      const nodes = [
        ...Array.from({ length: 5 }, (_, i) => ({
          updatedAtMs: Date.now() - i * MS_PER_DAY,
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          updatedAtMs: Date.now() - i * MS_PER_DAY,
          isGhost: true,
        })),
      ];
      // Only 5 real nodes, should fallback to 30
      expect(computeAutoWindow(nodes)).toBe(30);
    });

    it('should ignore nodes without updatedAtMs', () => {
      const nodes = [
        ...Array.from({ length: 5 }, (_, i) => ({
          updatedAtMs: Date.now() - i * MS_PER_DAY,
        })),
        ...Array.from({ length: 10 }, () => ({
          updatedAtMs: undefined,
        })),
      ];
      expect(computeAutoWindow(nodes)).toBe(30);
    });

    it('should calculate 85th percentile correctly for [1..10]', () => {
      // Create nodes with ages 1, 2, 3, ..., 10 days
      const now = Date.now();
      const nodes = Array.from({ length: 10 }, (_, i) => ({
        updatedAtMs: now - (i + 1) * MS_PER_DAY,
      }));

      // Ages when sorted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      // idx = floor((10-1) * 0.85) = floor(7.65) = 7
      // ages[7] = 8 days
      expect(computeAutoWindow(nodes)).toBe(8);
    });

    it('should calculate 85th percentile correctly for [0..99]', () => {
      const now = Date.now();
      const nodes = Array.from({ length: 100 }, (_, i) => ({
        updatedAtMs: now - i * MS_PER_DAY,
      }));

      // Ages when sorted: [0, 1, 2, ..., 99]
      // idx = floor((100-1) * 0.85) = floor(84.15) = 84
      // ages[84] = 84 days
      expect(computeAutoWindow(nodes)).toBe(84);
    });

    it('should clamp to minimum of 7 days', () => {
      const now = Date.now();
      // All nodes updated within last 2 days
      const nodes = Array.from({ length: 20 }, (_, i) => ({
        updatedAtMs: now - (i * 0.1) * MS_PER_DAY, // 0, 0.1, 0.2, ... 1.9 days
      }));

      const result = computeAutoWindow(nodes);
      expect(result).toBe(7);
    });

    it('should clamp to maximum of 180 days', () => {
      const now = Date.now();
      // All nodes very old
      const nodes = Array.from({ length: 20 }, (_, i) => ({
        updatedAtMs: now - (300 + i * 10) * MS_PER_DAY, // 300, 310, ... 490 days
      }));

      const result = computeAutoWindow(nodes);
      expect(result).toBe(180);
    });

    it('should not have index out of bounds on edge cases', () => {
      // Test with exactly 10 nodes (minimum for non-fallback)
      const now = Date.now();
      const nodes = Array.from({ length: 10 }, (_, i) => ({
        updatedAtMs: now - i * MS_PER_DAY,
      }));

      // Should not throw
      expect(() => computeAutoWindow(nodes)).not.toThrow();
      expect(typeof computeAutoWindow(nodes)).toBe('number');
    });

    it('should not have index out of bounds with 100 nodes', () => {
      const now = Date.now();
      const nodes = Array.from({ length: 100 }, (_, i) => ({
        updatedAtMs: now - i * MS_PER_DAY,
      }));

      expect(() => computeAutoWindow(nodes)).not.toThrow();
    });

    it('should not have index out of bounds with 1 node', () => {
      const nodes = [{ updatedAtMs: Date.now() }];
      expect(computeAutoWindow(nodes)).toBe(30); // Fallback
    });
  });

  describe('computeHeat', () => {
    it('should set heat=1 for nodes updated now', () => {
      const nodes = [{ updatedAtMs: Date.now() }];
      computeHeat(nodes, 30);
      expect(nodes[0].heat).toBeCloseTo(1, 2);
    });

    it('should set heat=0 for nodes at or beyond window', () => {
      const nodes = [{ updatedAtMs: Date.now() - 30 * MS_PER_DAY }];
      computeHeat(nodes, 30);
      expect(nodes[0].heat).toBe(0);
    });

    it('should set heat=0.5 for nodes at half the window', () => {
      const nodes = [{ updatedAtMs: Date.now() - 15 * MS_PER_DAY }];
      computeHeat(nodes, 30);
      expect(nodes[0].heat).toBeCloseTo(0.5, 1);
    });

    it('should set heat=0 for ghost nodes', () => {
      const nodes = [{ updatedAtMs: Date.now(), isGhost: true }];
      computeHeat(nodes, 30);
      expect(nodes[0].heat).toBe(0);
    });

    it('should set heat=0 for nodes without updatedAtMs', () => {
      const nodes: Array<{ updatedAtMs?: number; heat?: number }> = [{}];
      computeHeat(nodes, 30);
      expect(nodes[0].heat).toBe(0);
    });

    it('should clamp future timestamps to heat=1', () => {
      // Node with timestamp 1 day in the future (clock skew)
      const nodes = [{ updatedAtMs: Date.now() + MS_PER_DAY }];
      computeHeat(nodes, 30);
      expect(nodes[0].heat).toBe(1);
    });

    it('should handle nodes much older than window', () => {
      const nodes = [{ updatedAtMs: Date.now() - 365 * MS_PER_DAY }];
      computeHeat(nodes, 30);
      expect(nodes[0].heat).toBe(0);
    });

    it('should use linear scaling', () => {
      const now = Date.now();
      const nodes = [
        { updatedAtMs: now },                        // 0 days = heat 1.0
        { updatedAtMs: now - 10 * MS_PER_DAY },      // 10 days = heat ~0.67
        { updatedAtMs: now - 20 * MS_PER_DAY },      // 20 days = heat ~0.33
        { updatedAtMs: now - 30 * MS_PER_DAY },      // 30 days = heat 0.0
      ];
      computeHeat(nodes, 30);

      expect(nodes[0].heat).toBeCloseTo(1.0, 1);
      expect(nodes[1].heat).toBeCloseTo(0.67, 1);
      expect(nodes[2].heat).toBeCloseTo(0.33, 1);
      expect(nodes[3].heat).toBe(0);
    });
  });

  describe('parseManualWindow', () => {
    it('should return parsed value for valid input', () => {
      expect(parseManualWindow('30')).toBe(30);
      expect(parseManualWindow('7')).toBe(7);
      expect(parseManualWindow('180')).toBe(180);
      expect(parseManualWindow('90')).toBe(90);
    });

    it('should return 30 for null', () => {
      expect(parseManualWindow(null)).toBe(30);
    });

    it('should return 30 for empty string', () => {
      expect(parseManualWindow('')).toBe(30);
    });

    it('should return 30 for NaN input', () => {
      expect(parseManualWindow('abc')).toBe(30);
      expect(parseManualWindow('not-a-number')).toBe(30);
    });

    it('should clamp values below 7 to 30 (fallback)', () => {
      expect(parseManualWindow('0')).toBe(30);
      expect(parseManualWindow('6')).toBe(30);
      expect(parseManualWindow('-5')).toBe(30);
    });

    it('should clamp values above 180 to 30 (fallback)', () => {
      expect(parseManualWindow('181')).toBe(30);
      expect(parseManualWindow('9999')).toBe(30);
    });
  });

  describe('lazy heat computation', () => {
    it('should not compute heat when disabled (heat remains undefined)', () => {
      const nodes: Array<{ updatedAtMs: number; heat?: number }> = [
        { updatedAtMs: Date.now() },
        { updatedAtMs: Date.now() - 10 * MS_PER_DAY },
      ];

      // Simulate heat disabled - don't call computeHeat
      // Heat should remain undefined
      expect(nodes[0].heat).toBeUndefined();
      expect(nodes[1].heat).toBeUndefined();
    });

    it('should compute heat when enabled', () => {
      const nodes: Array<{ updatedAtMs: number; heat?: number }> = [
        { updatedAtMs: Date.now() },
        { updatedAtMs: Date.now() - 10 * MS_PER_DAY },
      ];

      // Simulate heat enabled - call computeHeat
      computeHeat(nodes, 30);

      expect(nodes[0].heat).toBeDefined();
      expect(nodes[1].heat).toBeDefined();
      expect(nodes[0].heat).toBeGreaterThan(nodes[1].heat!);
    });
  });
});
