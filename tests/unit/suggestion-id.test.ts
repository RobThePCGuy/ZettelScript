import { describe, it, expect } from 'vitest';
import {
  generateSuggestionId,
  isUndirectedEdgeType,
} from '../../src/core/types/index.js';

describe('suggestionId generation', () => {
  describe('generateSuggestionId', () => {
    it('generates 32-character hex string', () => {
      const id = generateSuggestionId('node1', 'node2', 'explicit_link');
      expect(id).toMatch(/^[0-9a-f]{32}$/);
    });

    it('is deterministic for same inputs', () => {
      const id1 = generateSuggestionId('node1', 'node2', 'explicit_link');
      const id2 = generateSuggestionId('node1', 'node2', 'explicit_link');
      expect(id1).toBe(id2);
    });

    it('differs for different edge types', () => {
      const id1 = generateSuggestionId('node1', 'node2', 'explicit_link');
      const id2 = generateSuggestionId('node1', 'node2', 'semantic');
      expect(id1).not.toBe(id2);
    });

    it('differs for different node pairs', () => {
      const id1 = generateSuggestionId('node1', 'node2', 'explicit_link');
      const id2 = generateSuggestionId('node1', 'node3', 'explicit_link');
      expect(id1).not.toBe(id2);
    });

    describe('undirected edges', () => {
      it('produces same ID regardless of order for undirected edges', () => {
        const id1 = generateSuggestionId('nodeA', 'nodeB', 'semantic', true);
        const id2 = generateSuggestionId('nodeB', 'nodeA', 'semantic', true);
        expect(id1).toBe(id2);
      });

      it('canonicalizes to smaller ID first', () => {
        // Both should produce same hash because 'aaa' < 'zzz'
        const id1 = generateSuggestionId('aaa', 'zzz', 'semantic', true);
        const id2 = generateSuggestionId('zzz', 'aaa', 'semantic', true);
        expect(id1).toBe(id2);
      });
    });

    describe('directed edges', () => {
      it('produces different IDs for different directions when directed', () => {
        const id1 = generateSuggestionId('nodeA', 'nodeB', 'explicit_link', false);
        const id2 = generateSuggestionId('nodeB', 'nodeA', 'explicit_link', false);
        expect(id1).not.toBe(id2);
      });

      it('preserves order for directed edges', () => {
        // Directed: A->B should differ from B->A
        const idAtoB = generateSuggestionId('A', 'B', 'hierarchy', false);
        const idBtoA = generateSuggestionId('B', 'A', 'hierarchy', false);
        expect(idAtoB).not.toBe(idBtoA);
      });
    });

    it('handles special characters in node IDs', () => {
      const id = generateSuggestionId('node/with/path', 'node:with:colons', 'explicit_link');
      expect(id).toMatch(/^[0-9a-f]{32}$/);
    });

    it('handles empty strings (edge case)', () => {
      const id = generateSuggestionId('', '', 'explicit_link');
      expect(id).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe('isUndirectedEdgeType', () => {
    it('returns true for semantic edges', () => {
      expect(isUndirectedEdgeType('semantic')).toBe(true);
    });

    it('returns true for semantic_suggestion edges', () => {
      expect(isUndirectedEdgeType('semantic_suggestion')).toBe(true);
    });

    it('returns false for explicit_link', () => {
      expect(isUndirectedEdgeType('explicit_link')).toBe(false);
    });

    it('returns false for hierarchy', () => {
      expect(isUndirectedEdgeType('hierarchy')).toBe(false);
    });

    it('returns false for mention', () => {
      expect(isUndirectedEdgeType('mention')).toBe(false);
    });
  });
});
