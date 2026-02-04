import * as _sinclair_typebox from '@sinclair/typebox';
import { Static } from '@sinclair/typebox';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { Root } from 'mdast';

declare const NodeTypeSchema: _sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"note">, _sinclair_typebox.TLiteral<"scene">, _sinclair_typebox.TLiteral<"character">, _sinclair_typebox.TLiteral<"location">, _sinclair_typebox.TLiteral<"object">, _sinclair_typebox.TLiteral<"event">, _sinclair_typebox.TLiteral<"concept">, _sinclair_typebox.TLiteral<"moc">, _sinclair_typebox.TLiteral<"timeline">, _sinclair_typebox.TLiteral<"draft">]>;
type NodeType = Static<typeof NodeTypeSchema>;
declare const NodeSchema: _sinclair_typebox.TObject<{
    nodeId: _sinclair_typebox.TString;
    type: _sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"note">, _sinclair_typebox.TLiteral<"scene">, _sinclair_typebox.TLiteral<"character">, _sinclair_typebox.TLiteral<"location">, _sinclair_typebox.TLiteral<"object">, _sinclair_typebox.TLiteral<"event">, _sinclair_typebox.TLiteral<"concept">, _sinclair_typebox.TLiteral<"moc">, _sinclair_typebox.TLiteral<"timeline">, _sinclair_typebox.TLiteral<"draft">]>;
    title: _sinclair_typebox.TString;
    path: _sinclair_typebox.TString;
    createdAt: _sinclair_typebox.TString;
    updatedAt: _sinclair_typebox.TString;
    contentHash: _sinclair_typebox.TOptional<_sinclair_typebox.TString>;
    metadata: _sinclair_typebox.TOptional<_sinclair_typebox.TRecord<_sinclair_typebox.TString, _sinclair_typebox.TUnknown>>;
    isGhost: _sinclair_typebox.TOptional<_sinclair_typebox.TBoolean>;
}>;
type Node = Static<typeof NodeSchema>;
declare const EdgeTypeSchema: _sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"explicit_link">, _sinclair_typebox.TLiteral<"backlink">, _sinclair_typebox.TLiteral<"sequence">, _sinclair_typebox.TLiteral<"hierarchy">, _sinclair_typebox.TLiteral<"participation">, _sinclair_typebox.TLiteral<"pov_visible_to">, _sinclair_typebox.TLiteral<"causes">, _sinclair_typebox.TLiteral<"setup_payoff">, _sinclair_typebox.TLiteral<"semantic">, _sinclair_typebox.TLiteral<"semantic_suggestion">, _sinclair_typebox.TLiteral<"mention">, _sinclair_typebox.TLiteral<"alias">]>;
type EdgeType = Static<typeof EdgeTypeSchema>;
declare const EdgeProvenanceSchema: _sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"explicit">, _sinclair_typebox.TLiteral<"inferred">, _sinclair_typebox.TLiteral<"computed">, _sinclair_typebox.TLiteral<"user_approved">]>;
type EdgeProvenance = Static<typeof EdgeProvenanceSchema>;
declare const EdgeSchema: _sinclair_typebox.TObject<{
    edgeId: _sinclair_typebox.TString;
    sourceId: _sinclair_typebox.TString;
    targetId: _sinclair_typebox.TString;
    edgeType: _sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"explicit_link">, _sinclair_typebox.TLiteral<"backlink">, _sinclair_typebox.TLiteral<"sequence">, _sinclair_typebox.TLiteral<"hierarchy">, _sinclair_typebox.TLiteral<"participation">, _sinclair_typebox.TLiteral<"pov_visible_to">, _sinclair_typebox.TLiteral<"causes">, _sinclair_typebox.TLiteral<"setup_payoff">, _sinclair_typebox.TLiteral<"semantic">, _sinclair_typebox.TLiteral<"semantic_suggestion">, _sinclair_typebox.TLiteral<"mention">, _sinclair_typebox.TLiteral<"alias">]>;
    strength: _sinclair_typebox.TOptional<_sinclair_typebox.TNumber>;
    provenance: _sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"explicit">, _sinclair_typebox.TLiteral<"inferred">, _sinclair_typebox.TLiteral<"computed">, _sinclair_typebox.TLiteral<"user_approved">]>;
    createdAt: _sinclair_typebox.TString;
    versionStart: _sinclair_typebox.TOptional<_sinclair_typebox.TString>;
    versionEnd: _sinclair_typebox.TOptional<_sinclair_typebox.TString>;
    attributes: _sinclair_typebox.TOptional<_sinclair_typebox.TRecord<_sinclair_typebox.TString, _sinclair_typebox.TUnknown>>;
}>;
type Edge = Static<typeof EdgeSchema>;
declare const VersionSchema: _sinclair_typebox.TObject<{
    versionId: _sinclair_typebox.TString;
    nodeId: _sinclair_typebox.TString;
    contentHash: _sinclair_typebox.TString;
    parentVersionId: _sinclair_typebox.TOptional<_sinclair_typebox.TString>;
    createdAt: _sinclair_typebox.TString;
    summary: _sinclair_typebox.TOptional<_sinclair_typebox.TString>;
}>;
type Version = Static<typeof VersionSchema>;
declare const MentionStatusSchema: _sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"new">, _sinclair_typebox.TLiteral<"approved">, _sinclair_typebox.TLiteral<"rejected">, _sinclair_typebox.TLiteral<"deferred">]>;
type MentionStatus = Static<typeof MentionStatusSchema>;
declare const MentionCandidateSchema: _sinclair_typebox.TObject<{
    candidateId: _sinclair_typebox.TString;
    sourceId: _sinclair_typebox.TString;
    targetId: _sinclair_typebox.TString;
    surfaceText: _sinclair_typebox.TString;
    spanStart: _sinclair_typebox.TOptional<_sinclair_typebox.TInteger>;
    spanEnd: _sinclair_typebox.TOptional<_sinclair_typebox.TInteger>;
    confidence: _sinclair_typebox.TNumber;
    reasons: _sinclair_typebox.TOptional<_sinclair_typebox.TArray<_sinclair_typebox.TString>>;
    status: _sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"new">, _sinclair_typebox.TLiteral<"approved">, _sinclair_typebox.TLiteral<"rejected">, _sinclair_typebox.TLiteral<"deferred">]>;
}>;
type MentionCandidate = Static<typeof MentionCandidateSchema>;
declare const ChunkSchema: _sinclair_typebox.TObject<{
    chunkId: _sinclair_typebox.TString;
    nodeId: _sinclair_typebox.TString;
    text: _sinclair_typebox.TString;
    offsetStart: _sinclair_typebox.TInteger;
    offsetEnd: _sinclair_typebox.TInteger;
    versionId: _sinclair_typebox.TString;
    tokenCount: _sinclair_typebox.TOptional<_sinclair_typebox.TInteger>;
}>;
type Chunk = Static<typeof ChunkSchema>;
declare const ProposalTypeSchema: _sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"link_addition">, _sinclair_typebox.TLiteral<"content_edit">, _sinclair_typebox.TLiteral<"node_creation">, _sinclair_typebox.TLiteral<"node_deletion">, _sinclair_typebox.TLiteral<"metadata_update">]>;
type ProposalType = Static<typeof ProposalTypeSchema>;
declare const ProposalStatusSchema: _sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"pending">, _sinclair_typebox.TLiteral<"approved">, _sinclair_typebox.TLiteral<"rejected">, _sinclair_typebox.TLiteral<"applied">]>;
type ProposalStatus = Static<typeof ProposalStatusSchema>;
declare const ProposalSchema: _sinclair_typebox.TObject<{
    proposalId: _sinclair_typebox.TString;
    type: _sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"link_addition">, _sinclair_typebox.TLiteral<"content_edit">, _sinclair_typebox.TLiteral<"node_creation">, _sinclair_typebox.TLiteral<"node_deletion">, _sinclair_typebox.TLiteral<"metadata_update">]>;
    nodeId: _sinclair_typebox.TString;
    description: _sinclair_typebox.TString;
    diff: _sinclair_typebox.TObject<{
        before: _sinclair_typebox.TOptional<_sinclair_typebox.TString>;
        after: _sinclair_typebox.TString;
    }>;
    status: _sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"pending">, _sinclair_typebox.TLiteral<"approved">, _sinclair_typebox.TLiteral<"rejected">, _sinclair_typebox.TLiteral<"applied">]>;
    createdAt: _sinclair_typebox.TString;
    appliedAt: _sinclair_typebox.TOptional<_sinclair_typebox.TString>;
    metadata: _sinclair_typebox.TOptional<_sinclair_typebox.TRecord<_sinclair_typebox.TString, _sinclair_typebox.TUnknown>>;
}>;
type Proposal = Static<typeof ProposalSchema>;
declare const GraphMetricsSchema: _sinclair_typebox.TObject<{
    nodeId: _sinclair_typebox.TString;
    centralityPagerank: _sinclair_typebox.TOptional<_sinclair_typebox.TNumber>;
    clusterId: _sinclair_typebox.TOptional<_sinclair_typebox.TString>;
    computedAt: _sinclair_typebox.TString;
}>;
type GraphMetrics = Static<typeof GraphMetricsSchema>;
declare const FrontmatterSchema: _sinclair_typebox.TObject<{
    id: _sinclair_typebox.TOptional<_sinclair_typebox.TString>;
    title: _sinclair_typebox.TOptional<_sinclair_typebox.TString>;
    type: _sinclair_typebox.TOptional<_sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"note">, _sinclair_typebox.TLiteral<"scene">, _sinclair_typebox.TLiteral<"character">, _sinclair_typebox.TLiteral<"location">, _sinclair_typebox.TLiteral<"object">, _sinclair_typebox.TLiteral<"event">, _sinclair_typebox.TLiteral<"concept">, _sinclair_typebox.TLiteral<"moc">, _sinclair_typebox.TLiteral<"timeline">, _sinclair_typebox.TLiteral<"draft">]>>;
    aliases: _sinclair_typebox.TOptional<_sinclair_typebox.TArray<_sinclair_typebox.TString>>;
    tags: _sinclair_typebox.TOptional<_sinclair_typebox.TArray<_sinclair_typebox.TString>>;
    created: _sinclair_typebox.TOptional<_sinclair_typebox.TString>;
    updated: _sinclair_typebox.TOptional<_sinclair_typebox.TString>;
    pov: _sinclair_typebox.TOptional<_sinclair_typebox.TString>;
    scene_order: _sinclair_typebox.TOptional<_sinclair_typebox.TNumber>;
    timeline_position: _sinclair_typebox.TOptional<_sinclair_typebox.TString>;
    characters: _sinclair_typebox.TOptional<_sinclair_typebox.TArray<_sinclair_typebox.TString>>;
    locations: _sinclair_typebox.TOptional<_sinclair_typebox.TArray<_sinclair_typebox.TString>>;
}>;
type Frontmatter = Static<typeof FrontmatterSchema>;
interface WikiLink {
    raw: string;
    target: string;
    display: string;
    isIdLink: boolean;
    start: number;
    end: number;
}
interface ResolvedLink extends WikiLink {
    resolvedNodeId: string | null;
    ambiguous: boolean;
    candidates: string[];
}
interface BacklinkResult {
    sourceNode: Node;
    edge: Edge;
    context?: string;
}
interface NeighborResult {
    node: Node;
    edge: Edge;
    direction: 'incoming' | 'outgoing';
}
interface TraversalResult {
    nodeId: string;
    depth: number;
    score: number;
    path: string[];
}
interface RetrievalQuery {
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
interface RetrievalResult {
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
interface SceneInfo {
    nodeId: string;
    sceneOrder: number;
    timelinePosition?: string;
    pov?: string;
    characters: string[];
    locations: string[];
}
interface CharacterKnowledge {
    characterId: string;
    knows: Map<string, {
        learnedAt: string;
        source: string;
    }>;
    present: string[];
}
interface ContinuityIssue {
    type: 'pov_leakage' | 'timeline_inconsistency' | 'missing_setup' | 'orphaned_payoff' | 'character_knowledge';
    severity: 'error' | 'warning' | 'info';
    nodeId: string;
    description: string;
    suggestion?: string;
}
interface ImpactAnalysis {
    directImpact: string[];
    transitiveImpact: string[];
    povImpact: string[];
    timelineImpact: string[];
    characterImpact: string[];
}
type VisualizationMode = 'focus' | 'classic';
interface ZettelScriptConfig {
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
        provider: 'openai' | 'ollama' | 'none';
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
declare const DEFAULT_CONFIG: ZettelScriptConfig;
/**
 * Layer A: Truth edges - explicit user intent or durable structure.
 * Always rendered in both focus and classic modes.
 */
declare const LAYER_A_EDGES: EdgeType[];
/**
 * Layer B: Semantic edges - computed similarity.
 * Rendered with visual distinction (dotted, subdued).
 */
declare const LAYER_B_EDGES: EdgeType[];
/**
 * Layer C: Suggestion edges - candidates, not truth.
 * Hidden by default in focus mode, shown in classic mode.
 */
declare const LAYER_C_EDGES: EdgeType[];
/**
 * Edge layer classification result.
 * A = Truth, B = Semantic, C = Suggestions, unknown = unclassified
 */
type EdgeLayer = 'A' | 'B' | 'C' | 'unknown';
/**
 * Get the layer classification for an edge type.
 * Single source of truth for edge categorization.
 * @param edgeType The type of edge to classify
 * @returns The layer ('A', 'B', 'C', or 'unknown')
 */
declare function getEdgeLayer(edgeType: EdgeType): EdgeLayer;
/**
 * Determine if an edge should be rendered based on visualization mode.
 * @param edgeType The type of edge to check
 * @param mode The current visualization mode ('focus' or 'classic')
 * @returns true if the edge should be rendered
 */
declare function shouldRenderEdge(edgeType: EdgeType, mode: VisualizationMode): boolean;
declare const CandidateEdgeStatusSchema: _sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"suggested">, _sinclair_typebox.TLiteral<"approved">, _sinclair_typebox.TLiteral<"rejected">]>;
type CandidateEdgeStatus = Static<typeof CandidateEdgeStatusSchema>;
declare const CandidateEdgeSourceSchema: _sinclair_typebox.TUnion<[_sinclair_typebox.TLiteral<"mention">, _sinclair_typebox.TLiteral<"semantic">, _sinclair_typebox.TLiteral<"heuristic">]>;
type CandidateEdgeSource = Static<typeof CandidateEdgeSourceSchema>;
interface CandidateEdgeSignals {
    semantic?: number;
    mentionCount?: number;
    graphProximity?: number;
}
interface CandidateEdgeProvenance {
    model?: string;
    excerpt?: string;
    createdAt?: string;
}
interface CandidateEdge {
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
declare function generateSuggestionId(fromId: string, toId: string, edgeType: EdgeType, isUndirected?: boolean): string;
/**
 * Check if an edge type is undirected for suggestionId generation.
 * Most edges in ZettelScript are directed, but semantic similarity is undirected.
 */
declare function isUndirectedEdgeType(edgeType: EdgeType): boolean;

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;
/**
 * Database connection manager for ZettelScript
 */
declare class ConnectionManager {
    private static instance;
    private sqlite;
    private db;
    private dbPath;
    private constructor();
    /**
     * Get or create the singleton connection manager
     */
    static getInstance(dbPath?: string): ConnectionManager;
    /**
     * Reset the singleton (useful for testing)
     */
    static resetInstance(): void;
    /**
     * Initialize the database connection and schema
     */
    initialize(): Promise<void>;
    /**
     * Run database migrations
     */
    private migrate;
    /**
     * Get the Drizzle database instance
     */
    getDb(): DrizzleDB;
    /**
     * Get the raw SQLite database instance (for FTS5 and custom queries)
     */
    getSqlite(): Database.Database;
    /**
     * Close the database connection
     */
    close(): void;
    /**
     * Run a transaction
     */
    transaction<T>(fn: () => T): T;
    /**
     * Check if the database is initialized
     */
    isInitialized(): boolean;
    /**
     * Get database statistics
     */
    getStats(): {
        nodeCount: number;
        edgeCount: number;
        chunkCount: number;
        dbSizeBytes: number;
    };
}
/**
 * Helper to get a database connection for a vault
 */
declare function getDatabase(vaultPath: string): Promise<DrizzleDB>;
/**
 * Helper to get raw SQLite for FTS5 queries
 */
declare function getRawSqlite(vaultPath: string): Database.Database;

/**
 * Repository for Node CRUD operations
 */
declare class NodeRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Create a new node
     */
    create(data: Omit<Node, 'nodeId'>): Promise<Node>;
    /**
     * Create or update a node by path
     */
    upsert(data: Omit<Node, 'nodeId'> & {
        nodeId?: string;
    }): Promise<Node>;
    /**
     * Find a node by ID
     */
    findById(nodeId: string): Promise<Node | null>;
    /**
     * Find a node by path
     */
    findByPath(path: string): Promise<Node | null>;
    /**
     * Find a node by title (case-insensitive)
     */
    findByTitle(title: string): Promise<Node[]>;
    /**
     * Find a node by title or alias
     */
    findByTitleOrAlias(text: string): Promise<Node[]>;
    /**
     * Find nodes by type
     */
    findByType(type: NodeType): Promise<Node[]>;
    /**
     * Get all nodes
     */
    findAll(): Promise<Node[]>;
    /**
     * Find nodes by IDs
     */
    findByIds(nodeIds: string[]): Promise<Node[]>;
    /**
     * Search nodes by title pattern
     */
    searchByTitle(pattern: string): Promise<Node[]>;
    /**
     * Update a node
     */
    update(nodeId: string, data: Partial<Omit<Node, 'nodeId'>>): Promise<Node>;
    /**
     * Delete a node
     */
    delete(nodeId: string): Promise<void>;
    /**
     * Delete nodes by path pattern
     */
    deleteByPathPattern(pattern: string): Promise<number>;
    /**
     * Count nodes
     */
    count(): Promise<number>;
    /**
     * Count nodes by type
     */
    countByType(): Promise<Record<string, number>>;
    /**
     * Add an alias for a node
     */
    addAlias(nodeId: string, alias: string): Promise<void>;
    /**
     * Remove an alias
     */
    removeAlias(nodeId: string, alias: string): Promise<void>;
    /**
     * Get aliases for a node
     */
    getAliases(nodeId: string): Promise<string[]>;
    /**
     * Set aliases for a node (replaces existing)
     */
    setAliases(nodeId: string, newAliases: string[]): Promise<void>;
    /**
     * Find all ghost nodes
     */
    findGhosts(): Promise<Node[]>;
    /**
     * Find all non-ghost (real) nodes
     */
    findRealNodes(): Promise<Node[]>;
    /**
     * Count ghost nodes
     */
    countGhosts(): Promise<number>;
    /**
     * Create or find a ghost node by title.
     * Ghosts are placeholder nodes for unresolved references.
     * They have a synthetic path based on title.
     */
    getOrCreateGhost(title: string): Promise<Node>;
    /**
     * Materialize a ghost - convert it to a real node when the file is created.
     * Updates the ghost to be a real node with the actual path.
     */
    materializeGhost(nodeId: string, realPath: string): Promise<Node>;
    /**
     * Convert database row to Node type
     */
    private rowToNode;
}

/**
 * Repository for Edge CRUD operations
 */
declare class EdgeRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Create a new edge
     */
    create(data: Omit<Edge, 'edgeId' | 'createdAt'>): Promise<Edge>;
    /**
     * Create or update an edge
     */
    upsert(data: Omit<Edge, 'edgeId' | 'createdAt'>): Promise<Edge>;
    /**
     * Find an edge by ID
     */
    findById(edgeId: string): Promise<Edge | null>;
    /**
     * Find edge by source, target, and type
     */
    findBySourceTargetType(sourceId: string, targetId: string, edgeType: EdgeType): Promise<Edge | null>;
    /**
     * Find all outgoing edges from a node
     */
    findOutgoing(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]>;
    /**
     * Find all incoming edges to a node
     */
    findIncoming(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]>;
    /**
     * Find all edges connected to a node (both directions)
     */
    findConnected(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]>;
    /**
     * Find edges by type
     */
    findByType(edgeType: EdgeType): Promise<Edge[]>;
    /**
     * Get all edges, optionally filtered by edge types
     */
    findAll(edgeTypes?: EdgeType[]): Promise<Edge[]>;
    /**
     * Find backlinks (explicit_link edges targeting a node)
     */
    findBacklinks(nodeId: string): Promise<Edge[]>;
    /**
     * Update an edge
     */
    update(edgeId: string, data: Partial<Omit<Edge, 'edgeId' | 'createdAt'>>): Promise<Edge>;
    /**
     * Delete an edge
     */
    delete(edgeId: string): Promise<void>;
    /**
     * Delete all edges for a node
     */
    deleteForNode(nodeId: string): Promise<number>;
    /**
     * Delete edges by source and type
     */
    deleteBySourceAndType(sourceId: string, edgeType: EdgeType): Promise<number>;
    /**
     * Count edges
     */
    count(): Promise<number>;
    /**
     * Count edges by type
     */
    countByType(): Promise<Record<string, number>>;
    /**
     * Find neighbors with node info
     */
    findNeighborsWithNodes(nodeId: string, edgeTypes?: EdgeType[]): Promise<Array<{
        edge: Edge;
        node: {
            nodeId: string;
            title: string;
            type: string;
            path: string;
        };
        direction: 'incoming' | 'outgoing';
    }>>;
    /**
     * Convert database row to Edge type
     */
    private rowToEdge;
}

/**
 * Repository for Version CRUD operations
 */
declare class VersionRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Create a new version
     */
    create(data: Omit<Version, 'versionId' | 'createdAt'>): Promise<Version>;
    /**
     * Find a version by ID
     */
    findById(versionId: string): Promise<Version | null>;
    /**
     * Find all versions for a node
     */
    findByNodeId(nodeId: string): Promise<Version[]>;
    /**
     * Find the latest version for a node
     */
    findLatest(nodeId: string): Promise<Version | null>;
    /**
     * Find version by content hash
     */
    findByContentHash(nodeId: string, contentHash: string): Promise<Version | null>;
    /**
     * Get version chain (all ancestors)
     */
    getVersionChain(versionId: string): Promise<Version[]>;
    /**
     * Get child versions
     */
    findChildren(versionId: string): Promise<Version[]>;
    /**
     * Update a version (mainly for summary)
     */
    update(versionId: string, data: Pick<Version, 'summary'>): Promise<Version>;
    /**
     * Delete a version
     */
    delete(versionId: string): Promise<void>;
    /**
     * Delete all versions for a node
     */
    deleteForNode(nodeId: string): Promise<number>;
    /**
     * Count versions
     */
    count(): Promise<number>;
    /**
     * Count versions per node
     */
    countPerNode(): Promise<Map<string, number>>;
    /**
     * Convert database row to Version type
     */
    private rowToVersion;
}

/**
 * Repository for Chunk CRUD operations including FTS5 queries
 */
declare class ChunkRepository {
    private db;
    private sqlite;
    constructor(db: DrizzleDB, sqlite: Database.Database);
    /**
     * Create a new chunk
     */
    create(data: Omit<Chunk, 'chunkId'>): Promise<Chunk>;
    /**
     * Create multiple chunks
     */
    createMany(dataArray: Array<Omit<Chunk, 'chunkId'>>): Promise<Chunk[]>;
    /**
     * Find a chunk by ID
     */
    findById(chunkId: string): Promise<Chunk | null>;
    /**
     * Find all chunks for a node
     */
    findByNodeId(nodeId: string): Promise<Chunk[]>;
    /**
     * Find chunks by version
     */
    findByVersionId(versionId: string): Promise<Chunk[]>;
    /**
     * Find chunks by IDs
     */
    findByIds(chunkIds: string[]): Promise<Chunk[]>;
    /**
     * Full-text search using FTS5
     */
    searchFullText(query: string, limit?: number): Array<{
        chunkId: string;
        nodeId: string;
        text: string;
        rank: number;
    }>;
    /**
     * Full-text search with BM25 ranking
     */
    searchBM25(query: string, limit?: number): Array<{
        chunkId: string;
        nodeId: string;
        text: string;
        score: number;
    }>;
    /**
     * Update a chunk
     */
    update(chunkId: string, data: Partial<Omit<Chunk, 'chunkId'>>): Promise<Chunk>;
    /**
     * Delete a chunk
     */
    delete(chunkId: string): Promise<void>;
    /**
     * Delete all chunks for a node
     */
    deleteForNode(nodeId: string): Promise<number>;
    /**
     * Delete chunks by version
     */
    deleteByVersion(versionId: string): Promise<number>;
    /**
     * Count chunks
     */
    count(): Promise<number>;
    /**
     * Get total token count
     */
    getTotalTokens(): Promise<number>;
    /**
     * Convert database row to Chunk type
     */
    private rowToChunk;
}

/**
 * Repository for MentionCandidate CRUD operations
 */
declare class MentionRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Create a new mention candidate
     */
    create(data: Omit<MentionCandidate, 'candidateId'>): Promise<MentionCandidate>;
    /**
     * Create multiple mention candidates
     */
    createMany(dataArray: Array<Omit<MentionCandidate, 'candidateId'>>): Promise<MentionCandidate[]>;
    /**
     * Find a mention by ID
     */
    findById(candidateId: string): Promise<MentionCandidate | null>;
    /**
     * Find mentions by source node
     */
    findBySourceId(sourceId: string): Promise<MentionCandidate[]>;
    /**
     * Find mentions by target node
     */
    findByTargetId(targetId: string): Promise<MentionCandidate[]>;
    /**
     * Find mentions by status
     */
    findByStatus(status: MentionStatus): Promise<MentionCandidate[]>;
    /**
     * Find new (pending review) mentions for a source
     */
    findNewForSource(sourceId: string): Promise<MentionCandidate[]>;
    /**
     * Check if a mention already exists
     */
    exists(sourceId: string, targetId: string, spanStart: number, spanEnd: number): Promise<boolean>;
    /**
     * Update mention status
     */
    updateStatus(candidateId: string, status: MentionStatus): Promise<MentionCandidate>;
    /**
     * Approve a mention (converts to edge)
     */
    approve(candidateId: string): Promise<MentionCandidate>;
    /**
     * Reject a mention
     */
    reject(candidateId: string): Promise<MentionCandidate>;
    /**
     * Defer a mention for later review
     */
    defer(candidateId: string): Promise<MentionCandidate>;
    /**
     * Update confidence score
     */
    updateConfidence(candidateId: string, confidence: number): Promise<MentionCandidate>;
    /**
     * Delete a mention
     */
    delete(candidateId: string): Promise<void>;
    /**
     * Delete all mentions for a source
     */
    deleteForSource(sourceId: string): Promise<number>;
    /**
     * Delete rejected mentions
     */
    deleteRejected(): Promise<number>;
    /**
     * Count mentions
     */
    count(): Promise<number>;
    /**
     * Count mentions by status
     */
    countByStatus(): Promise<Record<string, number>>;
    /**
     * Get top mentions by confidence
     */
    getTopByConfidence(limit?: number): Promise<MentionCandidate[]>;
    /**
     * Convert database row to MentionCandidate type
     */
    private rowToMention;
}

/**
 * Data structure for ghost nodes in the visualization
 */
interface GhostNodeData {
    /** The unresolved link text (e.g., "Missing Note") */
    targetText: string;
    /** All node IDs that reference this ghost */
    sourceIds: string[];
    /** Number of times this ghost is referenced */
    referenceCount: number;
    /** Timestamp of the earliest reference */
    firstSeen: string;
    /** Most recent reference timestamp (from unresolved_link or referencer's updatedAt) */
    mostRecentRef?: string | undefined;
}
/**
 * Repository for unresolved link operations, primarily for ghost node visualization
 */
declare class UnresolvedLinkRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Get all unresolved links grouped by target text for ghost node visualization.
     * Returns ghost node data sorted by reference count (most referenced first).
     */
    getGhostNodes(): Promise<GhostNodeData[]>;
    /**
     * Get ghost nodes with a minimum reference count threshold.
     * Useful for filtering out rarely-referenced unresolved links.
     */
    getGhostNodesWithThreshold(minReferenceCount: number): Promise<GhostNodeData[]>;
    /**
     * Count total number of unique unresolved link targets (ghost nodes)
     */
    countGhostNodes(): Promise<number>;
    /**
     * Count total number of unresolved link references
     */
    countReferences(): Promise<number>;
    /**
     * Get ghost nodes with most recent reference time included.
     * The most recent reference time is the latest of:
     * - The unresolved_link createdAt timestamp
     * - The referencing node's updatedAt timestamp
     *
     * Returns ghost node data sorted by reference count (most referenced first).
     */
    getGhostNodesWithRecency(): Promise<GhostNodeData[]>;
    /**
     * Delete unresolved links by target text
     */
    deleteByTargetText(targetText: string): Promise<number>;
}

/**
 * Constellation represents a saved graph view configuration
 */
interface Constellation {
    constellationId: string;
    name: string;
    description: string | undefined;
    hiddenNodeTypes: string[];
    hiddenEdgeTypes: string[];
    showGhosts: boolean;
    ghostThreshold: number;
    cameraX: number | undefined;
    cameraY: number | undefined;
    cameraZoom: number | undefined;
    focusNodeIds: string[] | undefined;
    createdAt: string;
    updatedAt: string;
}
/**
 * Input for creating a new constellation
 */
interface CreateConstellationInput {
    name: string;
    description?: string;
    hiddenNodeTypes?: string[];
    hiddenEdgeTypes?: string[];
    showGhosts?: boolean;
    ghostThreshold?: number;
    cameraX?: number;
    cameraY?: number;
    cameraZoom?: number;
    focusNodeIds?: string[];
}
/**
 * Input for updating an existing constellation
 */
interface UpdateConstellationInput {
    name?: string;
    description?: string;
    hiddenNodeTypes?: string[];
    hiddenEdgeTypes?: string[];
    showGhosts?: boolean;
    ghostThreshold?: number;
    cameraX?: number;
    cameraY?: number;
    cameraZoom?: number;
    focusNodeIds?: string[];
}
/**
 * Repository for constellation CRUD operations
 */
declare class ConstellationRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Convert a database row to a Constellation object
     */
    private rowToConstellation;
    /**
     * Create a new constellation
     */
    create(input: CreateConstellationInput): Promise<Constellation>;
    /**
     * Find a constellation by ID
     */
    findById(id: string): Promise<Constellation | null>;
    /**
     * Find a constellation by name
     */
    findByName(name: string): Promise<Constellation | null>;
    /**
     * Find all constellations
     */
    findAll(): Promise<Constellation[]>;
    /**
     * Update an existing constellation
     */
    update(id: string, input: UpdateConstellationInput): Promise<Constellation | null>;
    /**
     * Delete a constellation by ID
     */
    delete(id: string): Promise<boolean>;
    /**
     * Delete a constellation by name
     */
    deleteByName(name: string): Promise<boolean>;
}

/**
 * Interface for a node's embedding data
 */
interface NodeEmbedding {
    embeddingId: string;
    nodeId: string;
    embedding: number[];
    model: string;
    dimensions: number;
    contentHash: string;
    computedAt: string;
}
interface CreateEmbeddingInput {
    nodeId: string;
    embedding: number[];
    model: string;
    dimensions: number;
    contentHash: string;
}
/**
 * Repository for Node Embedding CRUD operations
 */
declare class EmbeddingRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Create a new embedding
     */
    create(data: CreateEmbeddingInput): Promise<NodeEmbedding>;
    /**
     * Create or update an embedding for a node
     */
    upsert(data: CreateEmbeddingInput): Promise<NodeEmbedding>;
    /**
     * Find an embedding by ID
     */
    findById(embeddingId: string): Promise<NodeEmbedding | null>;
    /**
     * Find embedding by node ID
     */
    findByNodeId(nodeId: string): Promise<NodeEmbedding | null>;
    /**
     * Find all embeddings
     */
    findAll(): Promise<NodeEmbedding[]>;
    /**
     * Find embeddings by model
     */
    findByModel(model: string): Promise<NodeEmbedding[]>;
    /**
     * Find embeddings by node IDs
     */
    findByNodeIds(nodeIds: string[]): Promise<NodeEmbedding[]>;
    /**
     * Find nodes that need embedding computation
     * Returns nodes where either:
     * - No embedding exists
     * - The content hash has changed since last embedding
     */
    findDirtyNodeIds(): Promise<string[]>;
    /**
     * Update an embedding
     */
    update(embeddingId: string, data: Partial<CreateEmbeddingInput>): Promise<NodeEmbedding>;
    /**
     * Delete an embedding by ID
     */
    delete(embeddingId: string): Promise<void>;
    /**
     * Delete embedding by node ID
     */
    deleteByNodeId(nodeId: string): Promise<void>;
    /**
     * Delete all embeddings for a model
     */
    deleteByModel(model: string): Promise<number>;
    /**
     * Count embeddings
     */
    count(): Promise<number>;
    /**
     * Count embeddings by model
     */
    countByModel(): Promise<Record<string, number>>;
    /**
     * Convert database row to NodeEmbedding type
     */
    private rowToEmbedding;
}

/**
 * Interface for a wormhole rejection
 */
interface WormholeRejection {
    rejectionId: string;
    sourceId: string;
    targetId: string;
    sourceContentHash: string;
    targetContentHash: string;
    rejectedAt: string;
}
interface CreateRejectionInput {
    sourceId: string;
    targetId: string;
    sourceContentHash: string;
    targetContentHash: string;
}
/**
 * Repository for Wormhole Rejection CRUD operations
 */
declare class WormholeRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Create a new rejection
     */
    createRejection(data: CreateRejectionInput): Promise<WormholeRejection>;
    /**
     * Check if a pair is rejected (considering content hashes)
     * Returns true if the pair was rejected AND the content hasn't changed
     */
    isRejected(sourceId: string, targetId: string, sourceContentHash: string, targetContentHash: string): Promise<boolean>;
    /**
     * Check if any rejection exists for a pair (regardless of content hash)
     */
    hasAnyRejection(sourceId: string, targetId: string): Promise<boolean>;
    /**
     * Find all rejections
     */
    findAll(): Promise<WormholeRejection[]>;
    /**
     * Find rejections for a specific node
     */
    findByNodeId(nodeId: string): Promise<WormholeRejection[]>;
    /**
     * Delete a rejection by ID
     */
    delete(rejectionId: string): Promise<void>;
    /**
     * Delete rejections for a node pair
     */
    deleteForPair(sourceId: string, targetId: string): Promise<void>;
    /**
     * Delete all rejections for a node
     */
    deleteForNode(nodeId: string): Promise<number>;
    /**
     * Clear all rejections
     */
    clearAll(): Promise<number>;
    /**
     * Count rejections
     */
    count(): Promise<number>;
    /**
     * Convert database row to WormholeRejection type
     */
    private rowToRejection;
}

/**
 * Input for creating a new candidate edge
 */
interface CreateCandidateEdgeInput {
    suggestionId: string;
    fromId: string;
    toId: string;
    suggestedEdgeType: EdgeType;
    signals?: CandidateEdgeSignals;
    reasons?: string[];
    provenance?: CandidateEdgeProvenance[];
}
/**
 * Input for updating a candidate edge
 */
interface UpdateCandidateEdgeInput {
    status?: CandidateEdgeStatus;
    signals?: CandidateEdgeSignals;
    reasons?: string[];
    provenance?: CandidateEdgeProvenance[];
    writebackStatus?: string;
    writebackReason?: string;
    approvedEdgeId?: string;
}
/**
 * Repository for candidate edge CRUD operations.
 * Candidate edges are suggestions that may be approved or rejected.
 */
declare class CandidateEdgeRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Create a new candidate edge
     */
    create(data: CreateCandidateEdgeInput): Promise<CandidateEdge>;
    /**
     * Create or update a candidate edge (upsert by suggestionId)
     */
    upsert(data: CreateCandidateEdgeInput): Promise<CandidateEdge>;
    /**
     * Find a candidate edge by ID
     */
    findById(suggestionId: string): Promise<CandidateEdge | null>;
    /**
     * Find candidate edges by status
     */
    findByStatus(status: CandidateEdgeStatus): Promise<CandidateEdge[]>;
    /**
     * Find candidate edges involving a specific node (as source or target)
     */
    findByNodeId(nodeId: string): Promise<CandidateEdge[]>;
    /**
     * Find suggested candidate edges for nodes in a given set
     */
    findSuggestedForNodes(nodeIds: string[]): Promise<CandidateEdge[]>;
    /**
     * Find by normalized pair (for checking duplicates)
     */
    findByNormalizedPair(nodeId1: string, nodeId2: string, edgeType: EdgeType): Promise<CandidateEdge | null>;
    /**
     * Update a candidate edge
     */
    update(suggestionId: string, data: UpdateCandidateEdgeInput): Promise<CandidateEdge>;
    /**
     * Update status of a candidate edge
     */
    updateStatus(suggestionId: string, status: CandidateEdgeStatus, approvedEdgeId?: string): Promise<CandidateEdge>;
    /**
     * Mark last seen time for candidate edges (for pruning stale suggestions)
     */
    markSeen(suggestionIds: string[]): Promise<void>;
    /**
     * Delete a candidate edge
     */
    delete(suggestionId: string): Promise<void>;
    /**
     * Delete all candidate edges for a node
     */
    deleteForNode(nodeId: string): Promise<number>;
    /**
     * Count candidate edges by status
     */
    countByStatus(): Promise<Record<CandidateEdgeStatus, number>>;
    /**
     * Count total candidate edges
     */
    count(): Promise<number>;
    /**
     * Convert database row to CandidateEdge type
     */
    private rowToCandidateEdge;
}

/**
 * Result of a path search
 */
interface PathResult {
    path: string[];
    edges: EdgeType[];
    hopCount: number;
    score: number;
}
/**
 * Options for K-shortest paths search
 */
interface KShortestPathsOptions {
    k?: number;
    edgeTypes?: EdgeType[];
    maxDepth?: number;
    overlapThreshold?: number;
    maxCandidates?: number;
    maxExtraHops?: number;
}

interface GraphEngineOptions {
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
    config?: ZettelScriptConfig;
}
/**
 * Graph engine for traversal, queries, and analytics
 */
declare class GraphEngine {
    private nodeRepo;
    private edgeRepo;
    private config;
    constructor(options: GraphEngineOptions);
    getNode(nodeId: string): Promise<Node | null>;
    getNodeByPath(path: string): Promise<Node | null>;
    getNodeByTitle(title: string): Promise<Node[]>;
    getAllNodes(): Promise<Node[]>;
    getEdge(edgeId: string): Promise<Edge | null>;
    getOutgoingEdges(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]>;
    getIncomingEdges(nodeId: string, edgeTypes?: EdgeType[]): Promise<Edge[]>;
    /**
     * Get backlinks for a node
     * backlinks(node) = { edge.source_id | edge.edge_type == 'explicit_link' AND edge.target_id == node }
     */
    getBacklinks(nodeId: string): Promise<BacklinkResult[]>;
    /**
     * Count backlinks for a node
     */
    countBacklinks(nodeId: string): Promise<number>;
    /**
     * Get all neighbors of a node (both directions)
     */
    getNeighbors(nodeId: string, edgeTypes?: EdgeType[]): Promise<NeighborResult[]>;
    /**
     * Get outgoing neighbors
     */
    getOutgoingNeighbors(nodeId: string, edgeTypes?: EdgeType[]): Promise<Node[]>;
    /**
     * Get incoming neighbors
     */
    getIncomingNeighbors(nodeId: string, edgeTypes?: EdgeType[]): Promise<Node[]>;
    /**
     * Bounded graph expansion from seed nodes
     *
     * Algorithm:
     * frontier = seed_nodes
     * for depth in 1..max_depth:
     *     if visited_count >= budget: break
     *     for node in frontier:
     *         for edge in outgoing_edges(node, allowed_types):
     *             score = current_score * edge_weight * decay^depth
     *             accumulated_scores[edge.target] = max(existing, score)
     *     frontier = newly_discovered_nodes
     */
    expandGraph(options: {
        seedNodes: Array<{
            nodeId: string;
            score: number;
        }>;
        maxDepth?: number;
        budget?: number;
        edgeTypes?: EdgeType[];
        decayFactor?: number;
        includeIncoming?: boolean;
    }): Promise<TraversalResult[]>;
    /**
     * Find shortest path between two nodes using optimized BFS
     */
    findShortestPath(startId: string, endId: string, edgeTypes?: EdgeType[]): Promise<string[] | null>;
    /**
     * Find K shortest diverse paths between two nodes
     *
     * Uses Yen's algorithm with Jaccard diversity filtering.
     *
     * @param startId - Starting node ID
     * @param endId - Ending node ID
     * @param options - Search options
     * @returns Array of path results and reason for stopping
     */
    findKShortestPaths(startId: string, endId: string, options?: KShortestPathsOptions): Promise<{
        paths: PathResult[];
        reason: string;
    }>;
    /**
     * Check if two nodes are connected
     */
    areConnected(nodeId1: string, nodeId2: string, edgeTypes?: EdgeType[], maxDepth?: number): Promise<boolean>;
    /**
     * Extract a subgraph around a node
     */
    extractSubgraph(centerNodeId: string, radius?: number, edgeTypes?: EdgeType[]): Promise<{
        nodes: Node[];
        edges: Edge[];
    }>;
    /**
     * Calculate degree for a node
     */
    getDegree(nodeId: string): Promise<{
        in: number;
        out: number;
        total: number;
    }>;
    /**
     * Find isolated nodes (no edges)
     */
    findIsolatedNodes(): Promise<Node[]>;
    /**
     * Find nodes with high in-degree (potential hubs)
     */
    findHighInDegreeNodes(threshold?: number): Promise<Array<{
        node: Node;
        inDegree: number;
    }>>;
    /**
     * Find connected components in the graph
     */
    findConnectedComponents(): Promise<string[][]>;
    /**
     * Get the component containing a specific node
     */
    getComponentContaining(nodeId: string): Promise<string[]>;
}

/**
 * Base error class for ZettelScript
 */
declare class ZettelScriptError extends Error {
    code: string;
    details?: Record<string, unknown> | undefined;
    constructor(message: string, code: string, details?: Record<string, unknown> | undefined);
}
/**
 * Database-related errors
 */
declare class DatabaseError extends ZettelScriptError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Parsing errors (markdown, frontmatter, wikilinks)
 */
declare class ParseError extends ZettelScriptError {
    filePath: string;
    line?: number | undefined;
    column?: number | undefined;
    constructor(message: string, filePath: string, line?: number | undefined, column?: number | undefined, details?: Record<string, unknown>);
}
/**
 * Link resolution errors
 */
declare class ResolutionError extends ZettelScriptError {
    linkText: string;
    candidates?: string[] | undefined;
    constructor(message: string, linkText: string, candidates?: string[] | undefined, details?: Record<string, unknown>);
}
/**
 * Validation errors
 */
declare class ValidationError extends ZettelScriptError {
    issues: Array<{
        path: string;
        message: string;
        severity: 'error' | 'warning';
    }>;
    constructor(message: string, issues: Array<{
        path: string;
        message: string;
        severity: 'error' | 'warning';
    }>, details?: Record<string, unknown>);
}
/**
 * Configuration errors
 */
declare class ConfigError extends ZettelScriptError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Graph operation errors
 */
declare class GraphError extends ZettelScriptError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Retrieval/embedding errors
 */
declare class RetrievalError extends ZettelScriptError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * File system errors
 */
declare class FileSystemError extends ZettelScriptError {
    filePath: string;
    constructor(message: string, filePath: string, details?: Record<string, unknown>);
}
/**
 * Manuscript/continuity errors
 */
declare class ContinuityError extends ZettelScriptError {
    issueType: string;
    nodeId: string;
    constructor(message: string, issueType: string, nodeId: string, details?: Record<string, unknown>);
}
/**
 * Proposal/writeback errors
 */
declare class ProposalError extends ZettelScriptError {
    proposalId: string;
    constructor(message: string, proposalId: string, details?: Record<string, unknown>);
}
/**
 * Embedding provider errors
 */
declare class EmbeddingError extends ZettelScriptError {
    provider: string;
    constructor(message: string, provider: string, details?: Record<string, unknown>);
}

/**
 * Exclusion zones for wikilink detection.
 * These areas should not be scanned for wikilinks or unlinked mentions.
 */
interface ExclusionZone {
    start: number;
    end: number;
    type: 'code_block' | 'inline_code' | 'url' | 'existing_link' | 'frontmatter' | 'html_tag';
}

interface ParsedMarkdown {
    frontmatter: Frontmatter | null;
    title: string;
    type: NodeType;
    aliases: string[];
    content: string;
    contentStartOffset: number;
    links: WikiLink[];
    exclusionZones: ExclusionZone[];
    headings: Array<{
        level: number;
        text: string;
        position: {
            start: number;
            end: number;
        };
    }>;
    paragraphs: Array<{
        text: string;
        position: {
            start: number;
            end: number;
        };
    }>;
    ast: Root;
}
/**
 * Parse a markdown document into structured data
 */
declare function parseMarkdown(source: string, filePath: string): ParsedMarkdown;
/**
 * Extract plain text from markdown (strips formatting)
 */
declare function extractPlainText(source: string): string;
/**
 * Split content into sections based on headings
 */
declare function splitIntoSections(parsed: ParsedMarkdown): Array<{
    heading: string | null;
    level: number;
    content: string;
    start: number;
    end: number;
}>;
/**
 * Split content into paragraphs
 */
declare function splitIntoParagraphs(content: string): Array<{
    text: string;
    start: number;
    end: number;
}>;
/**
 * Stringify markdown AST back to text
 */
declare function stringifyMarkdown(ast: Root): string;

interface WikiLinkParseResult {
    links: WikiLink[];
    exclusionZones: ExclusionZone[];
}
/**
 * Extract all wikilinks from content
 */
declare function extractWikilinks(content: string, contentStartOffset?: number): WikiLinkParseResult;
/**
 * Extract link targets only (simplified version)
 */
declare function extractLinkTargets(content: string): string[];
/**
 * Check if a string contains wikilinks
 */
declare function hasWikilinks(content: string): boolean;
/**
 * Create a wikilink string
 */
declare function createWikilink(target: string, display?: string, useIdPrefix?: boolean): string;
/**
 * Replace text with a wikilink at a specific position
 */
declare function insertWikilink(content: string, start: number, end: number, target: string, display?: string): string;
/**
 * Get all unique link targets from content
 */
declare function getUniqueTargets(content: string): Set<string>;
/**
 * Normalize a link target for comparison
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Case-insensitive comparison done separately
 */
declare function normalizeTarget(target: string): string;
/**
 * Check if two link targets match (case-insensitive)
 */
declare function targetsMatch(target1: string, target2: string): boolean;
/**
 * Parse a wikilink string into components
 */
declare function parseWikilinkString(wikilink: string): WikiLink | null;
/**
 * Get context around a wikilink (surrounding text)
 */
declare function getWikilinkContext(content: string, link: WikiLink, contextChars?: number): string;

interface ParsedDocument {
    frontmatter: Frontmatter | null;
    content: string;
    contentStartOffset: number;
}
/**
 * Parse frontmatter from a markdown document
 */
declare function parseFrontmatter(source: string, filePath: string): ParsedDocument;
/**
 * Extract title from frontmatter or first heading
 */
declare function extractTitle(frontmatter: Frontmatter | null, content: string, filePath: string): string;
/**
 * Extract node type from frontmatter
 */
declare function extractNodeType(frontmatter: Frontmatter | null): string;
/**
 * Extract aliases from frontmatter
 */
declare function extractAliases(frontmatter: Frontmatter | null): string[];
/**
 * Serialize frontmatter back to YAML string
 */
declare function serializeFrontmatter(frontmatter: Frontmatter): string;
/**
 * Update frontmatter in a document
 */
declare function updateFrontmatter(source: string, updates: Partial<Frontmatter>, filePath: string): string;
/**
 * Validate frontmatter schema
 */
declare function validateFrontmatter(frontmatter: Frontmatter): {
    valid: boolean;
    errors: string[];
};

interface LinkResolverOptions {
    /**
     * Function to find nodes by title (case-insensitive)
     */
    findByTitle: (title: string) => Promise<Node[]>;
    /**
     * Function to find a node by ID
     */
    findById: (nodeId: string) => Promise<Node | null>;
    /**
     * Function to find nodes by title or alias
     */
    findByTitleOrAlias: (text: string) => Promise<Node[]>;
}
interface ResolutionResult {
    resolved: ResolvedLink[];
    unresolved: WikiLink[];
    ambiguous: WikiLink[];
}
/**
 * Link resolver following the spec:
 * 1. If id: prefix → direct node_id lookup
 * 2. Else normalize text:
 *    a. Exact title match (case-insensitive)
 *    b. Alias match
 * 3. Multiple matches → ambiguous (prompt user)
 * 4. No matches → unresolved (record separately)
 */
declare class LinkResolver {
    private options;
    private cache;
    constructor(options: LinkResolverOptions);
    /**
     * Resolve a single wikilink
     */
    resolveLink(link: WikiLink): Promise<ResolvedLink>;
    /**
     * Resolve multiple wikilinks
     */
    resolveLinks(links: WikiLink[]): Promise<ResolutionResult>;
    /**
     * Clear the resolution cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        hits: number;
    };
}
/**
 * Create a link resolver with repository functions
 */
declare function createLinkResolver(nodeRepository: {
    findByTitle: (title: string) => Promise<Node[]>;
    findById: (nodeId: string) => Promise<Node | null>;
    findByTitleOrAlias: (text: string) => Promise<Node[]>;
}): LinkResolver;
/**
 * Simple in-memory resolver for testing or single-file parsing
 */
declare class InMemoryLinkResolver {
    private nodesByTitle;
    private nodesById;
    private nodesByAlias;
    /**
     * Add a node to the resolver
     */
    addNode(node: Node, aliases?: string[]): void;
    /**
     * Resolve a wikilink
     */
    resolveLink(link: WikiLink): ResolvedLink;
    /**
     * Clear all indexed nodes
     */
    clear(): void;
}

interface FileInfo {
    path: string;
    relativePath: string;
    content: string;
    contentHash: string;
    stats: {
        size: number;
        createdAt: Date;
        modifiedAt: Date;
    };
}

interface IndexingResult {
    node: Node;
    links: Array<{
        wikilink: WikiLink;
        targetNodeId: string | null;
        ambiguous: boolean;
    }>;
    edges: Edge[];
    unresolved: WikiLink[];
    ambiguous: WikiLink[];
}
interface BatchIndexingResult {
    indexed: IndexingResult[];
    errors: Array<{
        path: string;
        error: string;
    }>;
    stats: {
        totalFiles: number;
        successCount: number;
        errorCount: number;
        nodeCount: number;
        edgeCount: number;
        unresolvedCount: number;
        ambiguousCount: number;
        durationMs: number;
    };
}
interface IndexerOptions {
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
    versionRepository: VersionRepository;
}
/**
 * Main indexing pipeline
 */
declare class IndexingPipeline {
    private nodeRepo;
    private edgeRepo;
    private versionRepo;
    private resolver;
    constructor(options: IndexerOptions);
    /**
     * Initialize the link resolver
     */
    private getResolver;
    /**
     * Clear resolver cache (call after batch operations)
     */
    clearResolverCache(): void;
    /**
     * Index a single file
     */
    indexFile(file: FileInfo): Promise<IndexingResult>;
    /**
     * Create or update a node from file info
     */
    private upsertNode;
    /**
     * Create a version entry if content has changed
     */
    private createVersionIfNeeded;
    /**
     * Process wikilinks and create edges
     */
    private processLinks;
    /**
     * Two-pass batch indexing for handling circular references
     *
     * Pass 1: Create all nodes (stubs)
     * Pass 2: Process links and create edges
     */
    batchIndex(files: FileInfo[]): Promise<BatchIndexingResult>;
    /**
     * Remove a node and its edges
     */
    removeNode(nodeId: string): Promise<void>;
    /**
     * Remove a node by path
     */
    removeByPath(path: string): Promise<void>;
    /**
     * Check if a file needs reindexing
     */
    needsReindex(file: FileInfo): Promise<boolean>;
    /**
     * Get indexing statistics
     */
    getStats(): Promise<{
        nodeCount: number;
        edgeCount: number;
        nodesByType: Record<string, number>;
        edgesByType: Record<string, number>;
    }>;
}

interface ContextAssemblerOptions {
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
    chunkRepository: ChunkRepository;
    graphEngine: GraphEngine;
    config: {
        defaultMaxResults: number;
        semanticWeight: number;
        lexicalWeight: number;
        graphWeight: number;
        rrfK: number;
        expansionMaxDepth: number;
        expansionBudget: number;
    };
}
/**
 * Assembles context from multiple retrieval strategies
 */
declare class ContextAssembler {
    private nodeRepo;
    private chunkRepo;
    private expander;
    private config;
    constructor(options: ContextAssemblerOptions);
    /**
     * Main retrieval function
     */
    retrieve(query: RetrievalQuery): Promise<RetrievalResult>;
    /**
     * Lexical search using FTS5
     */
    private lexicalSearch;
    /**
     * Apply query filters
     */
    private applyFilters;
    /**
     * Extract seed nodes from initial results
     */
    private extractSeeds;
    /**
     * Fetch chunks for expanded nodes
     */
    private fetchChunksForNodes;
    /**
     * Fuse lexical and graph results using RRF
     */
    private fuseResults;
    /**
     * Assemble context string from chunks
     */
    private assembleContext;
    /**
     * Build provenance information
     */
    private buildProvenance;
}

export { type BacklinkResult, type BatchIndexingResult, type CandidateEdge, type CandidateEdgeProvenance, CandidateEdgeRepository, type CandidateEdgeSignals, type CandidateEdgeSource, CandidateEdgeSourceSchema, type CandidateEdgeStatus, CandidateEdgeStatusSchema, type CharacterKnowledge, type Chunk, ChunkRepository, ChunkSchema, ConfigError, ConnectionManager, type Constellation, ConstellationRepository, ContextAssembler, type ContextAssemblerOptions, ContinuityError, type ContinuityIssue, type CreateCandidateEdgeInput, type CreateConstellationInput, type CreateEmbeddingInput, type CreateRejectionInput, DEFAULT_CONFIG, DatabaseError, type DrizzleDB, type Edge, type EdgeLayer, type EdgeProvenance, EdgeProvenanceSchema, EdgeRepository, EdgeSchema, type EdgeType, EdgeTypeSchema, EmbeddingError, EmbeddingRepository, FileSystemError, type Frontmatter, FrontmatterSchema, type GhostNodeData, GraphEngine, type GraphEngineOptions, GraphError, type GraphMetrics, GraphMetricsSchema, type ImpactAnalysis, InMemoryLinkResolver, type IndexerOptions, IndexingPipeline, type IndexingResult, type KShortestPathsOptions, LAYER_A_EDGES, LAYER_B_EDGES, LAYER_C_EDGES, LinkResolver, type LinkResolverOptions, type MentionCandidate, MentionCandidateSchema, MentionRepository, type MentionStatus, MentionStatusSchema, type NeighborResult, type Node, type NodeEmbedding, NodeRepository, NodeSchema, type NodeType, NodeTypeSchema, ParseError, type ParsedDocument, type ParsedMarkdown, type PathResult, type Proposal, ProposalError, ProposalSchema, type ProposalStatus, ProposalStatusSchema, type ProposalType, ProposalTypeSchema, ResolutionError, type ResolutionResult, type ResolvedLink, RetrievalError, type RetrievalQuery, type RetrievalResult, type SceneInfo, type TraversalResult, UnresolvedLinkRepository, type UpdateCandidateEdgeInput, type UpdateConstellationInput, ValidationError, type Version, VersionRepository, VersionSchema, type VisualizationMode, type WikiLink, type WikiLinkParseResult, type WormholeRejection, WormholeRepository, type ZettelScriptConfig, ZettelScriptError, createLinkResolver, createWikilink, extractAliases, extractLinkTargets, extractNodeType, extractPlainText, extractTitle, extractWikilinks, generateSuggestionId, getDatabase, getEdgeLayer, getRawSqlite, getUniqueTargets, getWikilinkContext, hasWikilinks, insertWikilink, isUndirectedEdgeType, normalizeTarget, parseFrontmatter, parseMarkdown, parseWikilinkString, serializeFrontmatter, shouldRenderEdge, splitIntoParagraphs, splitIntoSections, stringifyMarkdown, targetsMatch, updateFrontmatter, validateFrontmatter };
