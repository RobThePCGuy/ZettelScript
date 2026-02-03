import { describe, it, expect } from 'vitest';
import {
  buildAdjacencyLists,
  bidirectionalBFS,
  findKShortestPaths,
  calculateJaccardOverlap,
  calculatePathScore,
  isSimplePath,
  simpleBFS,
} from '../../src/core/graph/pathfinder.js';
import type { Edge, EdgeType } from '../../src/core/types/index.js';

// Helper to create mock edges
function createEdge(
  sourceId: string,
  targetId: string,
  edgeType: EdgeType = 'explicit_link'
): Edge {
  return {
    edgeId: `${sourceId}-${targetId}`,
    sourceId,
    targetId,
    edgeType,
    provenance: 'explicit',
    createdAt: new Date().toISOString(),
  };
}

describe('Pathfinder', () => {
  describe('buildAdjacencyLists', () => {
    it('should build forward and backward adjacency lists', () => {
      const edges = [createEdge('A', 'B'), createEdge('B', 'C'), createEdge('A', 'C')];

      const { forward, backward } = buildAdjacencyLists(edges);

      // Forward adjacency
      expect(forward.get('A')?.map((e) => e.nodeId)).toEqual(['B', 'C']);
      expect(forward.get('B')?.map((e) => e.nodeId)).toEqual(['C']);
      expect(forward.get('C')).toBeUndefined();

      // Backward adjacency
      expect(backward.get('B')?.map((e) => e.nodeId)).toEqual(['A']);
      expect(backward.get('C')?.map((e) => e.nodeId)).toEqual(['B', 'A']);
      expect(backward.get('A')).toBeUndefined();
    });

    it('should filter by edge types', () => {
      const edges = [
        createEdge('A', 'B', 'explicit_link'),
        createEdge('B', 'C', 'sequence'),
        createEdge('A', 'C', 'hierarchy'),
      ];

      const { forward } = buildAdjacencyLists(edges, ['explicit_link', 'sequence']);

      expect(forward.get('A')?.map((e) => e.nodeId)).toEqual(['B']);
      expect(forward.get('B')?.map((e) => e.nodeId)).toEqual(['C']);
    });
  });

  describe('bidirectionalBFS', () => {
    it('should find shortest path in linear graph', () => {
      const edges = [createEdge('A', 'B'), createEdge('B', 'C'), createEdge('C', 'D')];
      const { forward, backward } = buildAdjacencyLists(edges);

      const result = bidirectionalBFS('A', 'D', forward, backward, 10);

      expect(result).not.toBeNull();
      expect(result!.path).toEqual(['A', 'B', 'C', 'D']);
      expect(result!.edges.length).toBe(3);
    });

    it('should find shortest path when multiple paths exist', () => {
      // A -> B -> D (length 2)
      // A -> C -> D (length 2)
      // A -> B -> C -> D (length 3)
      const edges = [
        createEdge('A', 'B'),
        createEdge('A', 'C'),
        createEdge('B', 'C'),
        createEdge('B', 'D'),
        createEdge('C', 'D'),
      ];
      const { forward, backward } = buildAdjacencyLists(edges);

      const result = bidirectionalBFS('A', 'D', forward, backward, 10);

      expect(result).not.toBeNull();
      expect(result!.path.length).toBe(3); // A -> B -> D or A -> C -> D
    });

    it('should return path for same start and end', () => {
      const edges = [createEdge('A', 'B')];
      const { forward, backward } = buildAdjacencyLists(edges);

      const result = bidirectionalBFS('A', 'A', forward, backward, 10);

      expect(result).not.toBeNull();
      expect(result!.path).toEqual(['A']);
      expect(result!.edges).toEqual([]);
    });

    it('should return null when no path exists', () => {
      const edges = [createEdge('A', 'B'), createEdge('C', 'D')];
      const { forward, backward } = buildAdjacencyLists(edges);

      const result = bidirectionalBFS('A', 'D', forward, backward, 10);

      expect(result).toBeNull();
    });

    it('should respect maxDepth', () => {
      const edges = [
        createEdge('A', 'B'),
        createEdge('B', 'C'),
        createEdge('C', 'D'),
        createEdge('D', 'E'),
        createEdge('E', 'F'),
        createEdge('F', 'G'),
      ];
      const { forward, backward } = buildAdjacencyLists(edges);

      // Path A -> G requires 6 hops
      // maxDepth=2 allows each direction to search 2 levels
      // Total searchable path = 2*maxDepth = 4, so 6 hops should not be found
      const result = bidirectionalBFS('A', 'G', forward, backward, 2);

      expect(result).toBeNull();
    });

    it('should respect disabled edges', () => {
      const edges = [
        createEdge('A', 'B'),
        createEdge('A', 'C'),
        createEdge('B', 'D'),
        createEdge('C', 'D'),
      ];
      const { forward, backward } = buildAdjacencyLists(edges);

      // Disable the A->B edge
      const disabledEdges = new Set(['A->B']);
      const result = bidirectionalBFS('A', 'D', forward, backward, 10, disabledEdges);

      expect(result).not.toBeNull();
      expect(result!.path).toEqual(['A', 'C', 'D']);
    });

    it('should respect disabled nodes', () => {
      const edges = [
        createEdge('A', 'B'),
        createEdge('B', 'D'),
        createEdge('A', 'C'),
        createEdge('C', 'D'),
      ];
      const { forward, backward } = buildAdjacencyLists(edges);

      // Disable node B
      const disabledNodes = new Set(['B']);
      const result = bidirectionalBFS('A', 'D', forward, backward, 10, undefined, disabledNodes);

      expect(result).not.toBeNull();
      expect(result!.path).toEqual(['A', 'C', 'D']);
    });
  });

  describe('findKShortestPaths', () => {
    it('should find single path when k=1', () => {
      const edges = [createEdge('A', 'B'), createEdge('B', 'C')];

      const { paths, reason } = findKShortestPaths('A', 'C', edges, { k: 1 });

      expect(paths.length).toBe(1);
      expect(paths[0]!.path).toEqual(['A', 'B', 'C']);
      expect(paths[0]!.hopCount).toBe(2);
      expect(reason).toBe('found_all');
    });

    it('should find multiple diverse paths', () => {
      // Diamond graph: A -> B -> D and A -> C -> D
      const edges = [
        createEdge('A', 'B'),
        createEdge('A', 'C'),
        createEdge('B', 'D'),
        createEdge('C', 'D'),
      ];

      const { paths, reason } = findKShortestPaths('A', 'D', edges, { k: 2 });

      expect(paths.length).toBe(2);
      // Both paths should be length 2
      expect(paths.every((p) => p.hopCount === 2)).toBe(true);
    });

    it('should return empty array when no path exists', () => {
      const edges = [createEdge('A', 'B'), createEdge('C', 'D')];

      const { paths, reason } = findKShortestPaths('A', 'D', edges, { k: 3 });

      expect(paths.length).toBe(0);
      expect(reason).toBe('no_path');
    });

    it('should respect maxExtraHops', () => {
      // A -> B -> D (2 hops, shortest)
      // A -> C -> E -> D (3 hops, maxExtraHops=0 should reject)
      const edges = [
        createEdge('A', 'B'),
        createEdge('A', 'C'),
        createEdge('B', 'D'),
        createEdge('C', 'E'),
        createEdge('E', 'D'),
      ];

      const { paths } = findKShortestPaths('A', 'D', edges, {
        k: 3,
        maxExtraHops: 0,
      });

      // Should only find the 2-hop path
      expect(paths.length).toBe(1);
      expect(paths[0]!.hopCount).toBe(2);
    });

    it('should sort paths by hop count then score', () => {
      // Multiple paths with different lengths
      const edges = [
        createEdge('A', 'B'),
        createEdge('B', 'C'),
        createEdge('A', 'D'),
        createEdge('D', 'E'),
        createEdge('E', 'C'),
      ];

      const { paths } = findKShortestPaths('A', 'C', edges, {
        k: 2,
        maxExtraHops: 1,
      });

      // First path should be shortest
      expect(paths[0]!.hopCount).toBeLessThanOrEqual(paths[1]!.hopCount);
    });

    it('should filter by edge types', () => {
      const edges = [
        createEdge('A', 'B', 'explicit_link'),
        createEdge('B', 'C', 'hierarchy'), // Should be excluded
        createEdge('A', 'D', 'explicit_link'),
        createEdge('D', 'C', 'explicit_link'),
      ];

      const { paths } = findKShortestPaths('A', 'C', edges, {
        k: 2,
        edgeTypes: ['explicit_link'],
      });

      expect(paths.length).toBe(1);
      expect(paths[0]!.path).toEqual(['A', 'D', 'C']);
    });
  });

  describe('calculateJaccardOverlap', () => {
    it('should calculate overlap for identical paths', () => {
      const overlap = calculateJaccardOverlap(['A', 'B', 'C'], ['A', 'B', 'C']);
      expect(overlap).toBe(1.0);
    });

    it('should calculate overlap for disjoint paths', () => {
      const overlap = calculateJaccardOverlap(['A', 'B', 'C'], ['D', 'E', 'F']);
      expect(overlap).toBe(0);
    });

    it('should calculate partial overlap', () => {
      const overlap = calculateJaccardOverlap(['A', 'B', 'C'], ['A', 'B', 'D']);
      // Intersection: {A, B}, Union: {A, B, C, D}
      expect(overlap).toBe(2 / 4);
    });

    it('should exclude endpoints when specified', () => {
      // Paths share only endpoints
      const overlap = calculateJaccardOverlap(['A', 'X', 'C'], ['A', 'Y', 'C'], true);
      // With endpoints excluded: {X} vs {Y}, overlap = 0
      expect(overlap).toBe(0);
    });
  });

  describe('calculatePathScore', () => {
    it('should calculate score based on edge types', () => {
      const edges: EdgeType[] = ['explicit_link', 'explicit_link'];
      const score = calculatePathScore(edges);
      // 2 hops + 0 penalty each
      expect(score).toBe(2);
    });

    it('should add penalties for different edge types', () => {
      const edges: EdgeType[] = ['sequence', 'causes', 'semantic'];
      const score = calculatePathScore(edges);
      // 3 hops + 0.1 + 0.2 + 0.3 = 3.6
      expect(score).toBeCloseTo(3.6, 5);
    });
  });

  describe('isSimplePath', () => {
    it('should return true for paths without repeated nodes', () => {
      expect(isSimplePath(['A', 'B', 'C', 'D'])).toBe(true);
    });

    it('should return false for paths with repeated nodes', () => {
      expect(isSimplePath(['A', 'B', 'C', 'A'])).toBe(false);
    });

    it('should return true for single-node path', () => {
      expect(isSimplePath(['A'])).toBe(true);
    });
  });

  describe('simpleBFS', () => {
    it('should find shortest path', () => {
      const edges = [createEdge('A', 'B'), createEdge('B', 'C'), createEdge('C', 'D')];
      const { forward } = buildAdjacencyLists(edges);

      const path = simpleBFS('A', 'D', forward);

      expect(path).toEqual(['A', 'B', 'C', 'D']);
    });

    it('should return null when no path exists', () => {
      const edges = [createEdge('A', 'B')];
      const { forward } = buildAdjacencyLists(edges);

      const path = simpleBFS('A', 'C', forward);

      expect(path).toBeNull();
    });

    it('should handle same start and end', () => {
      const edges = [createEdge('A', 'B')];
      const { forward } = buildAdjacencyLists(edges);

      const path = simpleBFS('A', 'A', forward);

      expect(path).toEqual(['A']);
    });
  });
});
