import { Static } from '@sinclair/typebox';
export declare const NodeTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"note">, import("@sinclair/typebox").TLiteral<"scene">, import("@sinclair/typebox").TLiteral<"character">, import("@sinclair/typebox").TLiteral<"location">, import("@sinclair/typebox").TLiteral<"object">, import("@sinclair/typebox").TLiteral<"event">, import("@sinclair/typebox").TLiteral<"concept">, import("@sinclair/typebox").TLiteral<"moc">, import("@sinclair/typebox").TLiteral<"timeline">, import("@sinclair/typebox").TLiteral<"draft">]>;
export type NodeType = Static<typeof NodeTypeSchema>;
export declare const NodeSchema: import("@sinclair/typebox").TObject<{
    nodeId: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"note">, import("@sinclair/typebox").TLiteral<"scene">, import("@sinclair/typebox").TLiteral<"character">, import("@sinclair/typebox").TLiteral<"location">, import("@sinclair/typebox").TLiteral<"object">, import("@sinclair/typebox").TLiteral<"event">, import("@sinclair/typebox").TLiteral<"concept">, import("@sinclair/typebox").TLiteral<"moc">, import("@sinclair/typebox").TLiteral<"timeline">, import("@sinclair/typebox").TLiteral<"draft">]>;
    title: import("@sinclair/typebox").TString;
    path: import("@sinclair/typebox").TString;
    createdAt: import("@sinclair/typebox").TString;
    updatedAt: import("@sinclair/typebox").TString;
    contentHash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
    isGhost: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
}>;
export type Node = Static<typeof NodeSchema>;
export declare const EdgeTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"explicit_link">, import("@sinclair/typebox").TLiteral<"backlink">, import("@sinclair/typebox").TLiteral<"sequence">, import("@sinclair/typebox").TLiteral<"hierarchy">, import("@sinclair/typebox").TLiteral<"participation">, import("@sinclair/typebox").TLiteral<"pov_visible_to">, import("@sinclair/typebox").TLiteral<"causes">, import("@sinclair/typebox").TLiteral<"setup_payoff">, import("@sinclair/typebox").TLiteral<"semantic">, import("@sinclair/typebox").TLiteral<"semantic_suggestion">, import("@sinclair/typebox").TLiteral<"mention">, import("@sinclair/typebox").TLiteral<"alias">]>;
export type EdgeType = Static<typeof EdgeTypeSchema>;
export declare const EdgeProvenanceSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"explicit">, import("@sinclair/typebox").TLiteral<"inferred">, import("@sinclair/typebox").TLiteral<"computed">, import("@sinclair/typebox").TLiteral<"user_approved">]>;
export type EdgeProvenance = Static<typeof EdgeProvenanceSchema>;
export declare const EdgeSchema: import("@sinclair/typebox").TObject<{
    edgeId: import("@sinclair/typebox").TString;
    sourceId: import("@sinclair/typebox").TString;
    targetId: import("@sinclair/typebox").TString;
    edgeType: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"explicit_link">, import("@sinclair/typebox").TLiteral<"backlink">, import("@sinclair/typebox").TLiteral<"sequence">, import("@sinclair/typebox").TLiteral<"hierarchy">, import("@sinclair/typebox").TLiteral<"participation">, import("@sinclair/typebox").TLiteral<"pov_visible_to">, import("@sinclair/typebox").TLiteral<"causes">, import("@sinclair/typebox").TLiteral<"setup_payoff">, import("@sinclair/typebox").TLiteral<"semantic">, import("@sinclair/typebox").TLiteral<"semantic_suggestion">, import("@sinclair/typebox").TLiteral<"mention">, import("@sinclair/typebox").TLiteral<"alias">]>;
    strength: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    provenance: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"explicit">, import("@sinclair/typebox").TLiteral<"inferred">, import("@sinclair/typebox").TLiteral<"computed">, import("@sinclair/typebox").TLiteral<"user_approved">]>;
    createdAt: import("@sinclair/typebox").TString;
    versionStart: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    versionEnd: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    attributes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
}>;
export type Edge = Static<typeof EdgeSchema>;
export declare const VersionSchema: import("@sinclair/typebox").TObject<{
    versionId: import("@sinclair/typebox").TString;
    nodeId: import("@sinclair/typebox").TString;
    contentHash: import("@sinclair/typebox").TString;
    parentVersionId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    createdAt: import("@sinclair/typebox").TString;
    summary: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type Version = Static<typeof VersionSchema>;
export declare const MentionStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"new">, import("@sinclair/typebox").TLiteral<"approved">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"deferred">]>;
export type MentionStatus = Static<typeof MentionStatusSchema>;
export declare const MentionCandidateSchema: import("@sinclair/typebox").TObject<{
    candidateId: import("@sinclair/typebox").TString;
    sourceId: import("@sinclair/typebox").TString;
    targetId: import("@sinclair/typebox").TString;
    surfaceText: import("@sinclair/typebox").TString;
    spanStart: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    spanEnd: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    confidence: import("@sinclair/typebox").TNumber;
    reasons: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"new">, import("@sinclair/typebox").TLiteral<"approved">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"deferred">]>;
}>;
export type MentionCandidate = Static<typeof MentionCandidateSchema>;
export declare const ChunkSchema: import("@sinclair/typebox").TObject<{
    chunkId: import("@sinclair/typebox").TString;
    nodeId: import("@sinclair/typebox").TString;
    text: import("@sinclair/typebox").TString;
    offsetStart: import("@sinclair/typebox").TInteger;
    offsetEnd: import("@sinclair/typebox").TInteger;
    versionId: import("@sinclair/typebox").TString;
    tokenCount: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type Chunk = Static<typeof ChunkSchema>;
export declare const ProposalTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"link_addition">, import("@sinclair/typebox").TLiteral<"content_edit">, import("@sinclair/typebox").TLiteral<"node_creation">, import("@sinclair/typebox").TLiteral<"node_deletion">, import("@sinclair/typebox").TLiteral<"metadata_update">]>;
export type ProposalType = Static<typeof ProposalTypeSchema>;
export declare const ProposalStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"approved">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"applied">]>;
export type ProposalStatus = Static<typeof ProposalStatusSchema>;
export declare const ProposalSchema: import("@sinclair/typebox").TObject<{
    proposalId: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"link_addition">, import("@sinclair/typebox").TLiteral<"content_edit">, import("@sinclair/typebox").TLiteral<"node_creation">, import("@sinclair/typebox").TLiteral<"node_deletion">, import("@sinclair/typebox").TLiteral<"metadata_update">]>;
    nodeId: import("@sinclair/typebox").TString;
    description: import("@sinclair/typebox").TString;
    diff: import("@sinclair/typebox").TObject<{
        before: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        after: import("@sinclair/typebox").TString;
    }>;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"approved">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"applied">]>;
    createdAt: import("@sinclair/typebox").TString;
    appliedAt: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
}>;
export type Proposal = Static<typeof ProposalSchema>;
export declare const GraphMetricsSchema: import("@sinclair/typebox").TObject<{
    nodeId: import("@sinclair/typebox").TString;
    centralityPagerank: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    clusterId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    computedAt: import("@sinclair/typebox").TString;
}>;
export type GraphMetrics = Static<typeof GraphMetricsSchema>;
export declare const FrontmatterSchema: import("@sinclair/typebox").TObject<{
    id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    title: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    type: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"note">, import("@sinclair/typebox").TLiteral<"scene">, import("@sinclair/typebox").TLiteral<"character">, import("@sinclair/typebox").TLiteral<"location">, import("@sinclair/typebox").TLiteral<"object">, import("@sinclair/typebox").TLiteral<"event">, import("@sinclair/typebox").TLiteral<"concept">, import("@sinclair/typebox").TLiteral<"moc">, import("@sinclair/typebox").TLiteral<"timeline">, import("@sinclair/typebox").TLiteral<"draft">]>>;
    aliases: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    tags: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    created: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    updated: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    pov: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    scene_order: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    timeline_position: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    characters: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    locations: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
}>;
export type Frontmatter = Static<typeof FrontmatterSchema>;
export interface WikiLink {
    raw: string;
    target: string;
    display: string;
    isIdLink: boolean;
    start: number;
    end: number;
}
export interface ResolvedLink extends WikiLink {
    resolvedNodeId: string | null;
    ambiguous: boolean;
    candidates: string[];
}
export interface BacklinkResult {
    sourceNode: Node;
    edge: Edge;
    context?: string;
}
export interface NeighborResult {
    node: Node;
    edge: Edge;
    direction: 'incoming' | 'outgoing';
}
export interface TraversalResult {
    nodeId: string;
    depth: number;
    score: number;
    path: string[];
}
export interface RetrievalQuery {
    text: string;
    maxResults?: number;
    filters?: {
        nodeTypes?: NodeType[];
        excludeNodeIds?: string[];
        dateRange?: {
            start?: string;
            end?: string;
        };
    };
    expansion?: {
        maxDepth?: number;
        budget?: number;
        edgeTypes?: EdgeType[];
        decayFactor?: number;
    };
}
export interface RetrievalResult {
    chunks: Array<{
        chunk: Chunk;
        node: Node;
        score: number;
        matchType: 'semantic' | 'lexical' | 'graph';
    }>;
    context: string;
    provenance: Array<{
        nodeId: string;
        path: string;
        contribution: number;
    }>;
}
export interface SceneInfo {
    nodeId: string;
    sceneOrder: number;
    timelinePosition?: string;
    pov?: string;
    characters: string[];
    locations: string[];
}
export interface CharacterKnowledge {
    characterId: string;
    knows: Map<string, {
        learnedAt: string;
        source: string;
    }>;
    present: string[];
}
export interface ContinuityIssue {
    type: 'pov_leakage' | 'timeline_inconsistency' | 'missing_setup' | 'orphaned_payoff' | 'character_knowledge';
    severity: 'error' | 'warning' | 'info';
    nodeId: string;
    description: string;
    suggestion?: string;
}
export interface ImpactAnalysis {
    directImpact: string[];
    transitiveImpact: string[];
    povImpact: string[];
    timelineImpact: string[];
    characterImpact: string[];
}
export type VisualizationMode = 'focus' | 'classic';
export interface ZettelScriptConfig {
    vault: {
        path: string;
        excludePatterns: string[];
    };
    database: {
        path: string;
    };
    embeddings: {
        provider: 'openai' | 'ollama';
        model: string;
        dimensions: number;
        apiKey?: string;
        baseUrl?: string;
    };
    retrieval: {
        defaultMaxResults: number;
        semanticWeight: number;
        lexicalWeight: number;
        graphWeight: number;
        rrfK: number;
        expansionMaxDepth: number;
        expansionBudget: number;
    };
    manuscript: {
        enabled: boolean;
        validatePov: boolean;
        validateTimeline: boolean;
        validateSetupPayoff: boolean;
    };
    graph: {
        defaultMaxDepth: number;
        defaultBudget: number;
        decayFactor: number;
        scoreThreshold: number;
    };
    chunking: {
        maxTokens: number;
        overlap: number;
        minChunkSize: number;
    };
    discovery: {
        weights: {
            locality: number;
            centrality: number;
            frequency: number;
            matchQuality: number;
        };
        confidenceThreshold: number;
        ambiguityPenalty: number;
        expansionMaxDepth: number;
        expansionBudget: number;
    };
    cache: {
        defaultTtlMs: number;
        defaultMaxSize: number;
        mentionTtlMs: number;
        mentionMaxSize: number;
        mocTtlMs: number;
        mocMaxSize: number;
    };
    impact: {
        timelineRange: number;
        maxTransitiveDepth: number;
        maxTransitiveBudget: number;
    };
    moc: {
        scoreNormalizationBase: number;
        hubScoreNormalization: number;
        clusterScoreNormalization: number;
        defaultHubThreshold: number;
    };
    versioning: {
        driftVersionWindow: number;
        butterflyLogDefaultEntries: number;
    };
    search: {
        defaultLimit: number;
        contextWindowChars: number;
        diffContextLines: number;
    };
    llm: {
        provider: 'openai' | 'ollama' | 'gemini' | 'none';
        model: string;
        apiKey?: string;
        baseUrl?: string;
        maxTokens?: number;
        temperature?: number;
    };
    visualization: {
        mode: VisualizationMode;
    };
}
export declare const DEFAULT_CONFIG: ZettelScriptConfig;
/**
 * Layer A: Truth edges - explicit user intent or durable structure.
 * Always rendered in both focus and classic modes.
 */
export declare const LAYER_A_EDGES: EdgeType[];
/**
 * Layer B: Semantic edges - computed similarity.
 * Rendered with visual distinction (dotted, subdued).
 */
export declare const LAYER_B_EDGES: EdgeType[];
/**
 * Layer C: Suggestion edges - candidates, not truth.
 * Hidden by default in focus mode, shown in classic mode.
 */
export declare const LAYER_C_EDGES: EdgeType[];
/**
 * Edge layer classification result.
 * A = Truth, B = Semantic, C = Suggestions, unknown = unclassified
 */
export type EdgeLayer = 'A' | 'B' | 'C' | 'unknown';
/**
 * Get the layer classification for an edge type.
 * Single source of truth for edge categorization.
 * @param edgeType The type of edge to classify
 * @returns The layer ('A', 'B', 'C', or 'unknown')
 */
export declare function getEdgeLayer(edgeType: EdgeType): EdgeLayer;
/**
 * Determine if an edge should be rendered based on visualization mode.
 * @param edgeType The type of edge to check
 * @param mode The current visualization mode ('focus' or 'classic')
 * @returns true if the edge should be rendered
 */
export declare function shouldRenderEdge(edgeType: EdgeType, mode: VisualizationMode): boolean;
export declare const CandidateEdgeStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"suggested">, import("@sinclair/typebox").TLiteral<"approved">, import("@sinclair/typebox").TLiteral<"rejected">]>;
export type CandidateEdgeStatus = Static<typeof CandidateEdgeStatusSchema>;
export declare const CandidateEdgeSourceSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"mention">, import("@sinclair/typebox").TLiteral<"semantic">, import("@sinclair/typebox").TLiteral<"heuristic">]>;
export type CandidateEdgeSource = Static<typeof CandidateEdgeSourceSchema>;
export interface CandidateEdgeSignals {
    semantic?: number;
    mentionCount?: number;
    graphProximity?: number;
}
export interface CandidateEdgeProvenance {
    model?: string;
    excerpt?: string;
    createdAt?: string;
}
export interface CandidateEdge {
    suggestionId: string;
    fromId: string;
    toId: string;
    suggestedEdgeType: EdgeType;
    status: CandidateEdgeStatus;
    statusChangedAt?: string;
    signals?: CandidateEdgeSignals;
    reasons?: string[];
    provenance?: CandidateEdgeProvenance[];
    createdAt: string;
    lastComputedAt: string;
    lastSeenAt?: string;
    writebackStatus?: string;
    writebackReason?: string;
    approvedEdgeId?: string;
}
/**
 * Generate a canonical suggestionId from edge components.
 *
 * Per Phase 2 design Section 2.4:
 * - 128-bit hash (32 hex chars) from (fromId, toId, edgeType)
 * - For undirected edges, IDs are canonically ordered (smaller first)
 * - For directed edges, order is preserved
 *
 * @param fromId Source node ID
 * @param toId Target node ID
 * @param edgeType The suggested edge type
 * @param isUndirected If true, IDs are canonically ordered for deduplication
 * @returns 32-character hex string (128 bits)
 */
export declare function generateSuggestionId(fromId: string, toId: string, edgeType: EdgeType, isUndirected?: boolean): string;
/**
 * Check if an edge type is undirected for suggestionId generation.
 * Most edges in ZettelScript are directed, but semantic similarity is undirected.
 */
export declare function isUndirectedEdgeType(edgeType: EdgeType): boolean;
//# sourceMappingURL=index.d.ts.map