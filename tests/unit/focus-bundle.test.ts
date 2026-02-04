import { describe, it, expect } from 'vitest';
import {
  assembleFocusBundle,
  FOCUS_SCHEMA_VERSION,
  APP_VERSION,
  SUGGESTION_CAPS,
  type FocusBundleInput,
  type RelatedNote,
} from '../../src/discovery/focus-bundle.js';
import type { Node, Edge, CandidateEdge } from '../../src/core/types/index.js';
import type { OrphanEntry } from '../../src/discovery/suggestion-engine.js';
import type { DoctorStats } from '../../src/cli/commands/doctor.js';

// Helper to create test nodes
function createNode(partial: Partial<Node> & { nodeId: string; title: string }): Node {
  return {
    type: 'note',
    path: `notes/${partial.nodeId}.md`,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  };
}

// Helper to create test edges
function createEdge(
  partial: Partial<Edge> & { edgeId: string; sourceId: string; targetId: string }
): Edge {
  return {
    edgeType: 'explicit_link',
    provenance: 'explicit',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  };
}

// Helper to create test candidate edges
function createCandidateEdge(
  partial: Partial<CandidateEdge> & { suggestionId: string; fromId: string; toId: string }
): CandidateEdge {
  return {
    suggestedEdgeType: 'mention',
    status: 'suggested',
    createdAt: '2024-01-01T00:00:00.000Z',
    lastComputedAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  };
}

// Helper to create test orphan entries
function createOrphanEntry(
  partial: Partial<OrphanEntry> & { nodeId: string; title: string }
): OrphanEntry {
  return {
    path: `notes/${partial.nodeId}.md`,
    orphanScore: 0.5,
    severity: 'med',
    percentile: 50,
    reasons: [],
    relatedNodeIds: [],
    components: {
      semanticPull: 0.3,
      lowTruthDegree: 0.5,
      mentionPressure: 0.2,
      importance: 0.3,
    },
    ...partial,
  };
}

// Helper to create minimal doctor stats
function createDoctorStats(partial?: Partial<DoctorStats>): DoctorStats {
  return {
    version: '0.4.1',
    vaultPath: '/test',
    overallLevel: 'ok',
    index: {
      nodeCount: 10,
      edgeCount: 5,
      edgesByLayer: { A: 3, B: 1, C: 1 },
      dbPath: '/test/.zettelscript/test.db',
      dbSizeBytes: 1024,
    },
    embeddings: {
      level: 'ok',
      total: 10,
      embedded: 10,
      coverage: 100,
      pending: 0,
      errorCount: 0,
    },
    wormholes: {
      enabled: true,
      count: 1,
      threshold: 0.75,
    },
    extraction: {
      parseFailCount: 0,
    },
    visualization: {
      mode: 'focus',
      filteredEdgeCount: 4,
      totalEdgeCount: 5,
    },
    ...partial,
  };
}

describe('FocusBundle Assembly', () => {
  describe('assembleFocusBundle', () => {
    it('assembles a valid FocusBundle', () => {
      const focusNode = createNode({ nodeId: 'focus1', title: 'Focus Note' });
      const node2 = createNode({ nodeId: 'node2', title: 'Connected Note' });
      const edge = createEdge({
        edgeId: 'edge1',
        sourceId: 'focus1',
        targetId: 'node2',
        edgeType: 'explicit_link',
      });

      const input: FocusBundleInput = {
        focusNode,
        nodesInView: [focusNode, node2],
        edgesInView: [edge],
        candidateEdges: [],
        orphanEntries: [],
        relatedNotes: [],
        doctorStats: createDoctorStats(),
        mode: 'focus',
      };

      const bundle = assembleFocusBundle(input);

      expect(bundle.meta.schemaVersion).toBe(FOCUS_SCHEMA_VERSION);
      expect(bundle.meta.appVersion).toBe(APP_VERSION);
      expect(bundle.meta.mode).toBe('focus');
      expect(bundle.meta.scope.focusNodeId).toBe('focus1');
      expect(bundle.meta.scope.focusNodeTitle).toBe('Focus Note');

      expect(bundle.graph.nodes).toHaveLength(2);
      expect(bundle.graph.edges).toHaveLength(1);
    });

    it('includes correct node DTOs with degree counts', () => {
      const node1 = createNode({ nodeId: 'n1', title: 'Node 1' });
      const node2 = createNode({ nodeId: 'n2', title: 'Node 2' });
      const node3 = createNode({ nodeId: 'n3', title: 'Node 3' });

      // n1 -> n2 (Layer A)
      // n1 -> n3 (Layer A)
      // n2 -> n3 (Layer B - semantic)
      const edges = [
        createEdge({ edgeId: 'e1', sourceId: 'n1', targetId: 'n2', edgeType: 'explicit_link' }),
        createEdge({ edgeId: 'e2', sourceId: 'n1', targetId: 'n3', edgeType: 'explicit_link' }),
        createEdge({ edgeId: 'e3', sourceId: 'n2', targetId: 'n3', edgeType: 'semantic' }),
      ];

      const input: FocusBundleInput = {
        focusNode: node1,
        nodesInView: [node1, node2, node3],
        edgesInView: edges,
        candidateEdges: [],
        orphanEntries: [],
        relatedNotes: [],
        doctorStats: createDoctorStats(),
        mode: 'focus',
      };

      const bundle = assembleFocusBundle(input);

      const nodeMap = new Map(bundle.graph.nodes.map((n) => [n.id, n]));

      // n1 has 2 Layer A edges (both outgoing)
      expect(nodeMap.get('n1')?.degreeA).toBe(2);
      expect(nodeMap.get('n1')?.degreeB).toBe(0);

      // n2 has 1 Layer A edge, 1 Layer B edge
      expect(nodeMap.get('n2')?.degreeA).toBe(1);
      expect(nodeMap.get('n2')?.degreeB).toBe(1);

      // n3 has 1 Layer A edge, 1 Layer B edge
      expect(nodeMap.get('n3')?.degreeA).toBe(1);
      expect(nodeMap.get('n3')?.degreeB).toBe(1);
    });

    it('builds candidate links from candidate edges', () => {
      const node1 = createNode({ nodeId: 'n1', title: 'Source Note' });
      const node2 = createNode({ nodeId: 'n2', title: 'Target Note' });

      const candidate = createCandidateEdge({
        suggestionId: 'sugg1',
        fromId: 'n1',
        toId: 'n2',
        signals: { mentionCount: 3 },
        reasons: ['Mentioned 3 times'],
      });

      const input: FocusBundleInput = {
        focusNode: node1,
        nodesInView: [node1, node2],
        edgesInView: [],
        candidateEdges: [candidate],
        orphanEntries: [],
        relatedNotes: [],
        doctorStats: createDoctorStats(),
        mode: 'focus',
      };

      const bundle = assembleFocusBundle(input);

      expect(bundle.suggestions.candidateLinks).toHaveLength(1);
      expect(bundle.suggestions.candidateLinks[0].suggestionId).toBe('sugg1');
      expect(bundle.suggestions.candidateLinks[0].fromTitle).toBe('Source Note');
      expect(bundle.suggestions.candidateLinks[0].toTitle).toBe('Target Note');
      expect(bundle.suggestions.candidateLinks[0].source).toBe('mention');
      expect(bundle.suggestions.candidateLinks[0].signals.mentionCount).toBe(3);
    });

    it('filters out non-suggested candidate edges', () => {
      const node1 = createNode({ nodeId: 'n1', title: 'Note 1' });
      const node2 = createNode({ nodeId: 'n2', title: 'Note 2' });

      const candidates = [
        createCandidateEdge({
          suggestionId: 'sugg1',
          fromId: 'n1',
          toId: 'n2',
          status: 'suggested',
        }),
        createCandidateEdge({
          suggestionId: 'sugg2',
          fromId: 'n2',
          toId: 'n1',
          status: 'approved', // Should be filtered
        }),
        createCandidateEdge({
          suggestionId: 'sugg3',
          fromId: 'n1',
          toId: 'n2',
          status: 'rejected', // Should be filtered
        }),
      ];

      const input: FocusBundleInput = {
        focusNode: node1,
        nodesInView: [node1, node2],
        edgesInView: [],
        candidateEdges: candidates,
        orphanEntries: [],
        relatedNotes: [],
        doctorStats: createDoctorStats(),
        mode: 'focus',
      };

      const bundle = assembleFocusBundle(input);

      expect(bundle.suggestions.candidateLinks).toHaveLength(1);
      expect(bundle.suggestions.candidateLinks[0].suggestionId).toBe('sugg1');
    });

    it('builds orphan entries with suggested actions', () => {
      const orphanNode = createNode({ nodeId: 'orphan1', title: 'Orphan Note' });
      const relatedNode = createNode({ nodeId: 'related1', title: 'Related Note' });

      const orphan = createOrphanEntry({
        nodeId: 'orphan1',
        title: 'Orphan Note',
        orphanScore: 0.8,
        severity: 'high',
        percentile: 90,
        relatedNodeIds: ['related1'],
        reasons: ['No explicit links'],
      });

      const input: FocusBundleInput = {
        focusNode: orphanNode,
        nodesInView: [orphanNode, relatedNode],
        edgesInView: [],
        candidateEdges: [],
        orphanEntries: [orphan],
        relatedNotes: [],
        doctorStats: createDoctorStats(),
        mode: 'focus',
      };

      const bundle = assembleFocusBundle(input);

      expect(bundle.suggestions.orphans).toHaveLength(1);
      expect(bundle.suggestions.orphans[0].nodeId).toBe('orphan1');
      expect(bundle.suggestions.orphans[0].severity).toBe('high');
      expect(bundle.suggestions.orphans[0].suggestedActions.length).toBeGreaterThan(0);

      // Should have a link_to action for the related node
      const linkAction = bundle.suggestions.orphans[0].suggestedActions.find(
        (a) => a.actionType === 'link_to'
      );
      expect(linkAction).toBeDefined();
      expect(linkAction?.targetNodeId).toBe('related1');
    });

    it('includes related notes with isInView flag', () => {
      const focusNode = createNode({ nodeId: 'focus', title: 'Focus' });
      const inViewNode = createNode({ nodeId: 'inView', title: 'In View' });

      const relatedNotes: RelatedNote[] = [
        {
          nodeId: 'inView',
          title: 'In View',
          path: 'notes/inView.md',
          score: 0.8,
          reasons: ['High similarity'],
          layer: 'B',
          isInView: true,
        },
        {
          nodeId: 'notInView',
          title: 'Not In View',
          path: 'notes/notInView.md',
          score: 0.6,
          reasons: ['Medium similarity'],
          layer: 'B',
          isInView: false,
        },
      ];

      const input: FocusBundleInput = {
        focusNode,
        nodesInView: [focusNode, inViewNode],
        edgesInView: [],
        candidateEdges: [],
        orphanEntries: [],
        relatedNotes,
        doctorStats: createDoctorStats(),
        mode: 'focus',
      };

      const bundle = assembleFocusBundle(input);

      expect(bundle.suggestions.relatedNotes).toHaveLength(2);
      expect(bundle.suggestions.relatedNotes[0].isInView).toBe(true); // inView node
      expect(bundle.suggestions.relatedNotes[1].isInView).toBe(false); // notInView node
    });

    it('includes action templates', () => {
      const input: FocusBundleInput = {
        focusNode: createNode({ nodeId: 'f', title: 'Focus' }),
        nodesInView: [createNode({ nodeId: 'f', title: 'Focus' })],
        edgesInView: [],
        candidateEdges: [],
        orphanEntries: [],
        relatedNotes: [],
        doctorStats: createDoctorStats(),
        mode: 'focus',
      };

      const bundle = assembleFocusBundle(input);

      expect(bundle.actions.approve.template).toContain('zs approve');
      expect(bundle.actions.approve.template).toContain('{suggestionId}');
      expect(bundle.actions.approve.supportsBatch).toBe(true);

      expect(bundle.actions.reject.template).toContain('zs reject');
      expect(bundle.actions.focus.template).toContain('zs focus');
      expect(bundle.actions.createNote.template).toContain('zs create');
    });

    it('builds health summary from doctor stats', () => {
      const stats = createDoctorStats({
        overallLevel: 'warn',
        embeddings: {
          level: 'warn',
          total: 10,
          embedded: 7,
          coverage: 70,
          pending: 3,
          errorCount: 1,
        },
        wormholes: {
          enabled: false,
          count: 0,
          threshold: 0.75,
          disabledReason: 'Insufficient embeddings',
        },
      });

      const input: FocusBundleInput = {
        focusNode: createNode({ nodeId: 'f', title: 'Focus' }),
        nodesInView: [createNode({ nodeId: 'f', title: 'Focus' })],
        edgesInView: [],
        candidateEdges: [],
        orphanEntries: [],
        relatedNotes: [],
        doctorStats: stats,
        mode: 'focus',
      };

      const bundle = assembleFocusBundle(input);

      expect(bundle.health.level).toBe('warn');
      expect(bundle.health.embeddings.level).toBe('warn');
      expect(bundle.health.embeddings.pending).toBe(3);
      expect(bundle.health.wormholes.enabled).toBe(false);
      expect(bundle.health.wormholes.disabledReason).toBe('Insufficient embeddings');
    });
  });

  describe('Hard Caps', () => {
    it('applies candidate link cap', () => {
      const focusNode = createNode({ nodeId: 'focus', title: 'Focus' });
      const nodes = [focusNode];

      // Create more candidates than the cap
      const candidates: CandidateEdge[] = [];
      for (let i = 0; i < 30; i++) {
        const targetNode = createNode({ nodeId: `n${i}`, title: `Note ${i}` });
        nodes.push(targetNode);

        candidates.push(
          createCandidateEdge({
            suggestionId: `sugg${i}`,
            fromId: 'focus',
            toId: `n${i}`,
            signals: { semantic: 0.5 + i * 0.01 }, // Different scores
          })
        );
      }

      const input: FocusBundleInput = {
        focusNode,
        nodesInView: nodes,
        edgesInView: [],
        candidateEdges: candidates,
        orphanEntries: [],
        relatedNotes: [],
        doctorStats: createDoctorStats(),
        mode: 'focus',
      };

      const bundle = assembleFocusBundle(input);

      expect(bundle.suggestions.candidateLinks.length).toBeLessThanOrEqual(
        SUGGESTION_CAPS.candidateLinksPerFocus
      );
    });

    it('applies orphan cap', () => {
      const focusNode = createNode({ nodeId: 'focus', title: 'Focus' });
      const nodes = [focusNode];

      // Create more orphans than the cap
      const orphans: OrphanEntry[] = [];
      for (let i = 0; i < 20; i++) {
        const node = createNode({ nodeId: `orphan${i}`, title: `Orphan ${i}` });
        nodes.push(node);

        orphans.push(
          createOrphanEntry({
            nodeId: `orphan${i}`,
            title: `Orphan ${i}`,
            orphanScore: 0.5 + i * 0.01,
          })
        );
      }

      const input: FocusBundleInput = {
        focusNode,
        nodesInView: nodes,
        edgesInView: [],
        candidateEdges: [],
        orphanEntries: orphans,
        relatedNotes: [],
        doctorStats: createDoctorStats(),
        mode: 'focus',
      };

      const bundle = assembleFocusBundle(input);

      expect(bundle.suggestions.orphans.length).toBeLessThanOrEqual(
        SUGGESTION_CAPS.orphansPerFocus
      );
    });

    it('applies related notes cap', () => {
      const focusNode = createNode({ nodeId: 'focus', title: 'Focus' });

      // Create more related notes than the cap
      const relatedNotes: RelatedNote[] = [];
      for (let i = 0; i < 20; i++) {
        relatedNotes.push({
          nodeId: `related${i}`,
          title: `Related ${i}`,
          path: `notes/related${i}.md`,
          score: 0.5 + i * 0.01,
          reasons: ['Similar'],
          layer: 'B',
          isInView: false,
        });
      }

      const input: FocusBundleInput = {
        focusNode,
        nodesInView: [focusNode],
        edgesInView: [],
        candidateEdges: [],
        orphanEntries: [],
        relatedNotes,
        doctorStats: createDoctorStats(),
        mode: 'focus',
      };

      const bundle = assembleFocusBundle(input);

      expect(bundle.suggestions.relatedNotes.length).toBeLessThanOrEqual(
        SUGGESTION_CAPS.relatedNotesPerFocus
      );
    });

    it('truncates reasons to max 3', () => {
      const focusNode = createNode({ nodeId: 'focus', title: 'Focus' });
      const targetNode = createNode({ nodeId: 'target', title: 'Target' });

      const candidate = createCandidateEdge({
        suggestionId: 'sugg1',
        fromId: 'focus',
        toId: 'target',
        reasons: ['Reason 1', 'Reason 2', 'Reason 3', 'Reason 4', 'Reason 5'],
      });

      const input: FocusBundleInput = {
        focusNode,
        nodesInView: [focusNode, targetNode],
        edgesInView: [],
        candidateEdges: [candidate],
        orphanEntries: [],
        relatedNotes: [],
        doctorStats: createDoctorStats(),
        mode: 'focus',
      };

      const bundle = assembleFocusBundle(input);

      expect(bundle.suggestions.candidateLinks[0].reasons.length).toBeLessThanOrEqual(
        SUGGESTION_CAPS.reasonsPerSuggestion
      );
    });
  });

  describe('Deterministic Ordering', () => {
    it('sorts candidate links by confidence desc, then title', () => {
      const focusNode = createNode({ nodeId: 'focus', title: 'Focus' });
      const nodeA = createNode({ nodeId: 'a', title: 'Alpha' });
      const nodeB = createNode({ nodeId: 'b', title: 'Beta' });
      const nodeC = createNode({ nodeId: 'c', title: 'Charlie' });

      const candidates = [
        createCandidateEdge({
          suggestionId: 'sugg1',
          fromId: 'focus',
          toId: 'a',
          signals: { semantic: 0.5 },
        }),
        createCandidateEdge({
          suggestionId: 'sugg2',
          fromId: 'focus',
          toId: 'b',
          signals: { semantic: 0.8 }, // Highest
        }),
        createCandidateEdge({
          suggestionId: 'sugg3',
          fromId: 'focus',
          toId: 'c',
          signals: { semantic: 0.5 }, // Same as Alpha, but Charlie comes after Alpha
        }),
      ];

      const input: FocusBundleInput = {
        focusNode,
        nodesInView: [focusNode, nodeA, nodeB, nodeC],
        edgesInView: [],
        candidateEdges: candidates,
        orphanEntries: [],
        relatedNotes: [],
        doctorStats: createDoctorStats(),
        mode: 'focus',
      };

      const bundle = assembleFocusBundle(input);

      // Beta should be first (highest confidence)
      expect(bundle.suggestions.candidateLinks[0].toTitle).toBe('Beta');
      // Alpha should be second (0.5 confidence, comes before Charlie alphabetically)
      expect(bundle.suggestions.candidateLinks[1].toTitle).toBe('Alpha');
      // Charlie should be third
      expect(bundle.suggestions.candidateLinks[2].toTitle).toBe('Charlie');
    });

    it('sorts orphans by score desc, then title', () => {
      const focusNode = createNode({ nodeId: 'focus', title: 'Focus' });
      const nodeA = createNode({ nodeId: 'a', title: 'Alpha Orphan' });
      const nodeB = createNode({ nodeId: 'b', title: 'Beta Orphan' });
      const nodeC = createNode({ nodeId: 'c', title: 'Charlie Orphan' });

      const orphans = [
        createOrphanEntry({ nodeId: 'a', title: 'Alpha Orphan', orphanScore: 0.5 }),
        createOrphanEntry({ nodeId: 'b', title: 'Beta Orphan', orphanScore: 0.8 }), // Highest
        createOrphanEntry({ nodeId: 'c', title: 'Charlie Orphan', orphanScore: 0.5 }),
      ];

      const input: FocusBundleInput = {
        focusNode,
        nodesInView: [focusNode, nodeA, nodeB, nodeC],
        edgesInView: [],
        candidateEdges: [],
        orphanEntries: orphans,
        relatedNotes: [],
        doctorStats: createDoctorStats(),
        mode: 'focus',
      };

      const bundle = assembleFocusBundle(input);

      expect(bundle.suggestions.orphans[0].title).toBe('Beta Orphan');
      expect(bundle.suggestions.orphans[1].title).toBe('Alpha Orphan');
      expect(bundle.suggestions.orphans[2].title).toBe('Charlie Orphan');
    });
  });
});
