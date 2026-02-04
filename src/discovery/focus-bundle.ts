/**
 * Focus Bundle - Phase 2.2
 *
 * Assembles the FocusBundle schema that both Atlas and Obsidian consume.
 * This is the single source of truth for focus view data.
 *
 * Per Phase 2 Design Document Section 1.
 */

import type { Node, Edge, EdgeType, CandidateEdge } from '../core/types/index.js';
import { getEdgeLayer } from '../core/types/index.js';
import { getCircuitBreaker } from '../core/circuit-breaker.js';
import type { DoctorStats } from '../cli/commands/doctor.js';
import type { OrphanEntry } from './suggestion-engine.js';

// ============================================================================
// Schema Version
// ============================================================================

export const FOCUS_SCHEMA_VERSION = 1;
export const APP_VERSION = '2.0.0';

// ============================================================================
// FocusBundle Types (per Phase 2 Design Section 1)
// ============================================================================

export interface FocusBundleMeta {
  schemaVersion: number;
  appVersion: string;
  generatedAt: string;
  mode: 'focus' | 'classic';
  scope: {
    kind: 'node' | 'file' | 'folder' | 'vault';
    focusNodeId: string;
    focusNodePath: string;
    focusNodeTitle: string;
  };
}

export interface HealthSummary {
  level: 'ok' | 'warn' | 'fail';
  warnings: string[];

  embeddings: {
    level: 'ok' | 'warn' | 'fail';
    coverageInView: number;
    eligibleInView: number;
    embeddedInView: number;
    missingInView: number;
    pending: number;
    errors: number;
    lastError?: string;
  };

  wormholes: {
    enabled: boolean;
    level: 'ok' | 'warn' | 'fail';
    countInView: number;
    threshold: number;
    disabledReason?: string;
  };

  index: {
    lastRunAt?: string;
    nodeCount: number;
    edgeCountsByLayer: { A: number; B: number; C: number };
  };

  extraction: {
    parseFailures: number;
    badChunksPath?: string;
  };
}

export interface NodeDTO {
  id: string;
  title: string;
  path: string;
  type: string;
  updatedAtMs?: number;
  isGhost: boolean;
  degreeA: number;
  degreeB: number;
  degreeC: number;
}

export interface EdgeDTO {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  status: 'truth' | 'suggested' | 'approved' | 'rejected';
  layer: 'A' | 'B' | 'C';
  confidence?: number;
  provenance?: string;
}

export interface RelatedNote {
  nodeId: string;
  title: string;
  path: string;
  score: number;
  reasons: string[];
  layer: 'B';
  isInView: boolean;
  signals?: {
    semantic?: number;
    lexical?: number;
    graph?: number;
    recency?: number;
  };
}

export interface CandidateLink {
  suggestionId: string;
  fromId: string;
  fromTitle: string;
  toId: string;
  toTitle: string;
  toIsGhost: boolean;
  suggestedEdgeType: EdgeType;
  confidence: number;
  reasons: string[];
  source: 'mention' | 'semantic' | 'heuristic';
  status: 'suggested' | 'approved' | 'rejected';
  signals: {
    semantic?: number;
    mentionCount?: number;
    graphProximity?: number;
  };
  provenance?: {
    model?: string;
    excerpt?: string;
    createdAt?: string;
  };
}

export interface SuggestedAction {
  actionType: 'link_to' | 'link_from' | 'create_note' | 'pin' | 'ignore';
  targetNodeId?: string;
  label: string;
  template: string;
}

export interface OrphanEntryDTO {
  nodeId: string;
  title: string;
  path: string;
  orphanScore: number;
  severity: 'low' | 'med' | 'high';
  percentile: number;
  reasons: string[];
  relatedNodeIds: string[];
  suggestedActions: SuggestedAction[];
}

export interface ActionTemplates {
  approve: {
    template: string;
    supportsBatch: boolean;
  };
  reject: {
    template: string;
  };
  focus: {
    template: string;
  };
  createNote: {
    template: string;
  };
}

export interface FocusBundle {
  meta: FocusBundleMeta;
  health: HealthSummary;
  graph: {
    nodes: NodeDTO[];
    edges: EdgeDTO[];
  };
  suggestions: {
    relatedNotes: RelatedNote[];
    candidateLinks: CandidateLink[];
    orphans: OrphanEntryDTO[];
  };
  actions: ActionTemplates;
}

// ============================================================================
// Hard Caps (per Phase 2 Design Section 3.2)
// ============================================================================

export const SUGGESTION_CAPS = {
  relatedNotesPerFocus: 10,
  candidateLinksPerFocus: 20,
  orphansPerFocus: 10,
  reasonsPerSuggestion: 3,
  excerptMaxLength: 200,
};

// ============================================================================
// Bundle Assembler
// ============================================================================

export interface FocusBundleInput {
  focusNode: Node;
  nodesInView: Node[];
  edgesInView: Edge[];
  candidateEdges: CandidateEdge[];
  orphanEntries: OrphanEntry[];
  relatedNotes: RelatedNote[];
  doctorStats: DoctorStats;
  mode: 'focus' | 'classic';
}

/**
 * Assemble a FocusBundle from computed data.
 * Applies hard caps and deterministic ordering (score desc, then title).
 */
export function assembleFocusBundle(input: FocusBundleInput): FocusBundle {
  const {
    focusNode,
    nodesInView,
    edgesInView,
    candidateEdges,
    orphanEntries,
    relatedNotes,
    doctorStats,
    mode,
  } = input;

  // Build node ID set for "in view" checks
  const nodeIdsInView = new Set(nodesInView.map((n) => n.nodeId));

  // Compute degree counts per node
  const degreesA = new Map<string, number>();
  const degreesB = new Map<string, number>();
  const degreesC = new Map<string, number>();

  for (const edge of edgesInView) {
    const layer = getEdgeLayer(edge.edgeType as EdgeType);
    const map = layer === 'A' ? degreesA : layer === 'B' ? degreesB : degreesC;

    map.set(edge.sourceId, (map.get(edge.sourceId) || 0) + 1);
    map.set(edge.targetId, (map.get(edge.targetId) || 0) + 1);
  }

  // Build NodeDTOs
  const nodeDTOs: NodeDTO[] = nodesInView.map((node) => ({
    id: node.nodeId,
    title: node.title,
    path: node.path,
    type: node.type,
    updatedAtMs: node.updatedAt ? new Date(node.updatedAt).getTime() : undefined,
    isGhost: node.isGhost || false,
    degreeA: degreesA.get(node.nodeId) || 0,
    degreeB: degreesB.get(node.nodeId) || 0,
    degreeC: degreesC.get(node.nodeId) || 0,
  }));

  // Build EdgeDTOs
  const edgeDTOs: EdgeDTO[] = edgesInView.map((edge) => ({
    id: edge.edgeId,
    fromId: edge.sourceId,
    toId: edge.targetId,
    type: edge.edgeType,
    status: 'truth' as const,
    layer: getEdgeLayer(edge.edgeType as EdgeType) as 'A' | 'B' | 'C',
    confidence: edge.strength,
    provenance: edge.provenance,
  }));

  // Build node lookup for titles
  const nodeMap = new Map(nodesInView.map((n) => [n.nodeId, n]));

  // Build CandidateLinks with deterministic ordering
  const candidateLinks: CandidateLink[] = candidateEdges
    .filter((ce) => ce.status === 'suggested')
    .map((ce) => {
      const fromNode = nodeMap.get(ce.fromId);
      const toNode = nodeMap.get(ce.toId);

      // Determine source type
      let source: 'mention' | 'semantic' | 'heuristic' = 'heuristic';
      if (ce.signals?.mentionCount !== undefined && ce.signals.mentionCount > 0) {
        source = 'mention';
      } else if (ce.signals?.semantic !== undefined) {
        source = 'semantic';
      }

      // Compute confidence from signals
      let confidence = 0.5;
      if (ce.signals?.semantic !== undefined) {
        confidence = ce.signals.semantic;
      } else if (ce.signals?.mentionCount !== undefined) {
        confidence = Math.min(1, ce.signals.mentionCount / 10);
      }

      return {
        suggestionId: ce.suggestionId,
        fromId: ce.fromId,
        fromTitle: fromNode?.title || 'Unknown',
        toId: ce.toId,
        toTitle: toNode?.title || 'Unknown',
        toIsGhost: toNode?.isGhost || false,
        suggestedEdgeType: ce.suggestedEdgeType,
        confidence,
        reasons: (ce.reasons || []).slice(0, SUGGESTION_CAPS.reasonsPerSuggestion),
        source,
        status: ce.status,
        signals: ce.signals || {},
        provenance:
          ce.provenance && ce.provenance.length > 0
            ? {
                model: ce.provenance[0].model,
                excerpt: ce.provenance[0].excerpt?.slice(0, SUGGESTION_CAPS.excerptMaxLength),
                createdAt: ce.provenance[0].createdAt,
              }
            : undefined,
      };
    })
    // Sort by confidence desc, then title
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.toTitle.localeCompare(b.toTitle);
    })
    // Apply hard cap
    .slice(0, SUGGESTION_CAPS.candidateLinksPerFocus);

  // Build OrphanEntryDTOs with suggested actions
  const orphanDTOs: OrphanEntryDTO[] = orphanEntries
    .map((entry) => ({
      nodeId: entry.nodeId,
      title: entry.title,
      path: entry.path,
      orphanScore: entry.orphanScore,
      severity: entry.severity,
      percentile: entry.percentile,
      reasons: entry.reasons.slice(0, SUGGESTION_CAPS.reasonsPerSuggestion),
      relatedNodeIds: entry.relatedNodeIds.slice(0, 3),
      suggestedActions: buildOrphanActions(entry, nodeMap),
    }))
    // Sort by score desc, then title
    .sort((a, b) => {
      if (b.orphanScore !== a.orphanScore) return b.orphanScore - a.orphanScore;
      return a.title.localeCompare(b.title);
    })
    // Apply hard cap
    .slice(0, SUGGESTION_CAPS.orphansPerFocus);

  // Build RelatedNotes - mark isInView
  const relatedNotesDTO: RelatedNote[] = relatedNotes
    .map((rn) => ({
      ...rn,
      isInView: nodeIdsInView.has(rn.nodeId),
      reasons: rn.reasons.slice(0, SUGGESTION_CAPS.reasonsPerSuggestion),
    }))
    // Sort by score desc, then title
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.title.localeCompare(b.title);
    })
    // Apply hard cap
    .slice(0, SUGGESTION_CAPS.relatedNotesPerFocus);

  // Build HealthSummary from DoctorStats
  const health = buildHealthSummary(doctorStats, nodesInView, edgesInView);

  // Build action templates
  const actions: ActionTemplates = {
    approve: {
      template: 'zs approve --suggestion-id {suggestionId} --json',
      supportsBatch: true,
    },
    reject: {
      template: 'zs reject --suggestion-id {suggestionId} --json',
    },
    focus: {
      template: 'zs focus "{path}" --json-stdout',
    },
    createNote: {
      template: 'zs create --title "{title}" --link-from {fromId} --json',
    },
  };

  return {
    meta: {
      schemaVersion: FOCUS_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      generatedAt: new Date().toISOString(),
      mode,
      scope: {
        kind: 'node',
        focusNodeId: focusNode.nodeId,
        focusNodePath: focusNode.path,
        focusNodeTitle: focusNode.title,
      },
    },
    health,
    graph: {
      nodes: nodeDTOs,
      edges: edgeDTOs,
    },
    suggestions: {
      relatedNotes: relatedNotesDTO,
      candidateLinks,
      orphans: orphanDTOs,
    },
    actions,
  };
}

/**
 * Build HealthSummary from DoctorStats, scoped to nodes in view.
 */
function buildHealthSummary(
  stats: DoctorStats,
  nodesInView: Node[],
  edgesInView: Edge[]
): HealthSummary {
  // Count non-ghost nodes (eligible for embedding)
  const eligibleNodes = nodesInView.filter((n) => !n.isGhost);
  const eligibleInView = eligibleNodes.length;

  // Count embedded nodes in view (proxy: assume all non-ghost nodes with contentHash are embedded)
  // Note: This is an approximation; true count would require embedding lookup
  const embeddedInView = eligibleNodes.filter((n) => n.contentHash).length;
  const missingInView = eligibleInView - embeddedInView;

  // Coverage in view
  const coverageInView = eligibleInView > 0 ? (embeddedInView / eligibleInView) * 100 : 100;

  // Count wormholes in view
  const wormholesInView = edgesInView.filter((e) => e.edgeType === 'semantic').length;

  // Edge counts by layer in view
  const edgeCountsByLayer = { A: 0, B: 0, C: 0 };
  for (const edge of edgesInView) {
    const layer = getEdgeLayer(edge.edgeType as EdgeType);
    if (layer === 'A') edgeCountsByLayer.A++;
    else if (layer === 'B') edgeCountsByLayer.B++;
    else if (layer === 'C') edgeCountsByLayer.C++;
  }

  // Wormhole health level
  let wormholeLevel: 'ok' | 'warn' | 'fail' = 'ok';
  if (!stats.wormholes.enabled) {
    wormholeLevel = stats.embeddings.level === 'fail' ? 'fail' : 'warn';
  }

  // Get circuit breaker warnings (plain text, no ANSI codes)
  const circuitWarnings = getCircuitBreaker().getWarnings();

  return {
    level: stats.overallLevel,
    warnings: circuitWarnings,

    embeddings: {
      level: stats.embeddings.level,
      coverageInView,
      eligibleInView,
      embeddedInView,
      missingInView,
      pending: stats.embeddings.pending,
      errors: stats.embeddings.errorCount,
      lastError: stats.embeddings.lastError,
    },

    wormholes: {
      enabled: stats.wormholes.enabled,
      level: wormholeLevel,
      countInView: wormholesInView,
      threshold: stats.wormholes.threshold,
      disabledReason: stats.wormholes.disabledReason,
    },

    index: {
      lastRunAt: stats.index.lastIndexTime?.toISOString(),
      nodeCount: stats.index.nodeCount,
      edgeCountsByLayer,
    },

    extraction: {
      parseFailures: stats.extraction.parseFailCount,
      badChunksPath: stats.extraction.badChunksPath,
    },
  };
}

/**
 * Build suggested actions for an orphan entry.
 */
function buildOrphanActions(
  entry: OrphanEntry,
  nodeMap: Map<string, Node>
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  // Suggest linking to related nodes
  for (const relatedId of entry.relatedNodeIds.slice(0, 2)) {
    const relatedNode = nodeMap.get(relatedId);
    if (relatedNode) {
      actions.push({
        actionType: 'link_to',
        targetNodeId: relatedId,
        label: `Link to "${relatedNode.title}"`,
        template: `zs link --from "${entry.path}" --to "${relatedNode.path}" --json`,
      });
    }
  }

  // Always offer ignore
  actions.push({
    actionType: 'ignore',
    label: 'Ignore this orphan',
    template: `zs orphan ignore --node-id ${entry.nodeId} --json`,
  });

  return actions;
}
