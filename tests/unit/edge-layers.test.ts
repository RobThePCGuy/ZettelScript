import { describe, it, expect } from 'vitest';
import {
  shouldRenderEdge,
  getEdgeLayer,
  LAYER_A_EDGES,
  LAYER_B_EDGES,
  LAYER_C_EDGES,
  type EdgeType,
} from '../../src/core/types/index.js';

describe('Edge Layer Classification', () => {
  describe('shouldRenderEdge', () => {
    describe('focus mode', () => {
      it('should render Layer A edges', () => {
        for (const edgeType of LAYER_A_EDGES) {
          expect(shouldRenderEdge(edgeType, 'focus')).toBe(true);
        }
      });

      it('should render Layer B edges', () => {
        for (const edgeType of LAYER_B_EDGES) {
          expect(shouldRenderEdge(edgeType, 'focus')).toBe(true);
        }
      });

      it('should NOT render Layer C edges', () => {
        for (const edgeType of LAYER_C_EDGES) {
          expect(shouldRenderEdge(edgeType, 'focus')).toBe(false);
        }
      });
    });

    describe('classic mode', () => {
      it('should render all Layer A edges', () => {
        for (const edgeType of LAYER_A_EDGES) {
          expect(shouldRenderEdge(edgeType, 'classic')).toBe(true);
        }
      });

      it('should render all Layer B edges', () => {
        for (const edgeType of LAYER_B_EDGES) {
          expect(shouldRenderEdge(edgeType, 'classic')).toBe(true);
        }
      });

      it('should render all Layer C edges', () => {
        for (const edgeType of LAYER_C_EDGES) {
          expect(shouldRenderEdge(edgeType, 'classic')).toBe(true);
        }
      });
    });

    describe('specific edge types', () => {
      it('renders explicit_link in focus mode', () => {
        expect(shouldRenderEdge('explicit_link', 'focus')).toBe(true);
      });

      it('renders semantic (wormhole) in focus mode', () => {
        expect(shouldRenderEdge('semantic', 'focus')).toBe(true);
      });

      it('hides mention in focus mode', () => {
        expect(shouldRenderEdge('mention', 'focus')).toBe(false);
      });

      it('hides semantic_suggestion in focus mode', () => {
        expect(shouldRenderEdge('semantic_suggestion', 'focus')).toBe(false);
      });

      it('hides backlink in focus mode', () => {
        expect(shouldRenderEdge('backlink', 'focus')).toBe(false);
      });
    });
  });

  describe('layer constants', () => {
    it('Layer A should contain truth edges', () => {
      expect(LAYER_A_EDGES).toContain('explicit_link');
      expect(LAYER_A_EDGES).toContain('hierarchy');
      expect(LAYER_A_EDGES).toContain('sequence');
      expect(LAYER_A_EDGES).toContain('causes');
      expect(LAYER_A_EDGES).toContain('setup_payoff');
      expect(LAYER_A_EDGES).toContain('participation');
      expect(LAYER_A_EDGES).toContain('pov_visible_to');
    });

    it('Layer B should contain semantic edges', () => {
      expect(LAYER_B_EDGES).toContain('semantic');
    });

    it('Layer C should contain suggestion edges', () => {
      expect(LAYER_C_EDGES).toContain('mention');
      expect(LAYER_C_EDGES).toContain('semantic_suggestion');
      expect(LAYER_C_EDGES).toContain('backlink');
      expect(LAYER_C_EDGES).toContain('alias');
    });

    it('no edge type should be in multiple layers', () => {
      const allEdges = [...LAYER_A_EDGES, ...LAYER_B_EDGES, ...LAYER_C_EDGES];
      const uniqueEdges = new Set(allEdges);
      expect(uniqueEdges.size).toBe(allEdges.length);
    });
  });

  describe('getEdgeLayer', () => {
    it('returns A for Layer A edges', () => {
      for (const edgeType of LAYER_A_EDGES) {
        expect(getEdgeLayer(edgeType)).toBe('A');
      }
    });

    it('returns B for Layer B edges', () => {
      for (const edgeType of LAYER_B_EDGES) {
        expect(getEdgeLayer(edgeType)).toBe('B');
      }
    });

    it('returns C for Layer C edges', () => {
      for (const edgeType of LAYER_C_EDGES) {
        expect(getEdgeLayer(edgeType)).toBe('C');
      }
    });

    it('returns specific layers for known edge types', () => {
      expect(getEdgeLayer('explicit_link')).toBe('A');
      expect(getEdgeLayer('hierarchy')).toBe('A');
      expect(getEdgeLayer('semantic')).toBe('B');
      expect(getEdgeLayer('mention')).toBe('C');
      expect(getEdgeLayer('backlink')).toBe('C');
    });
  });
});
