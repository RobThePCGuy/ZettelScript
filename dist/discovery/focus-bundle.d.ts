/**
 * Focus Bundle - Phase 2.2
 *
 * Assembles the FocusBundle schema that both Atlas and Obsidian consume.
 * This is the single source of truth for focus view data.
 *
 * Per Phase 2 Design Document Section 1.
 */
import type { Node, Edge, EdgeType, CandidateEdge } from '../core/types/index.js';
import type { DoctorStats } from '../cli/commands/doctor.js';
import type { OrphanEntry } from './suggestion-engine.js';
export declare const FOCUS_SCHEMA_VERSION = 1;
export declare const APP_VERSION = "2.0.0";
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
        edgeCountsByLayer: {
            A: number;
            B: number;
            C: number;
        };
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
export declare const SUGGESTION_CAPS: {
    relatedNotesPerFocus: number;
    candidateLinksPerFocus: number;
    orphansPerFocus: number;
    reasonsPerSuggestion: number;
    excerptMaxLength: number;
};
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
export declare function assembleFocusBundle(input: FocusBundleInput): FocusBundle;
//# sourceMappingURL=focus-bundle.d.ts.map