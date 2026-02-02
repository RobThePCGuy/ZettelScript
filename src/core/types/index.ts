import { Type, Static } from '@sinclair/typebox';

// ============================================================================
// Node Types
// ============================================================================

export const NodeTypeSchema = Type.Union([
  Type.Literal('note'),
  Type.Literal('scene'),
  Type.Literal('character'),
  Type.Literal('location'),
  Type.Literal('object'),
  Type.Literal('event'),
  Type.Literal('concept'),
  Type.Literal('moc'),
  Type.Literal('timeline'),
  Type.Literal('draft'),
]);

export type NodeType = Static<typeof NodeTypeSchema>;

export const NodeSchema = Type.Object({
  nodeId: Type.String(),
  type: NodeTypeSchema,
  title: Type.String(),
  path: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  contentHash: Type.Optional(Type.String()),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

export type Node = Static<typeof NodeSchema>;

// ============================================================================
// Edge Types
// ============================================================================

export const EdgeTypeSchema = Type.Union([
  Type.Literal('explicit_link'),
  Type.Literal('backlink'),
  Type.Literal('sequence'),
  Type.Literal('hierarchy'),
  Type.Literal('participation'),
  Type.Literal('pov_visible_to'),
  Type.Literal('causes'),
  Type.Literal('setup_payoff'),
  Type.Literal('semantic'),
  Type.Literal('mention'),
  Type.Literal('alias'),
]);

export type EdgeType = Static<typeof EdgeTypeSchema>;

export const EdgeProvenanceSchema = Type.Union([
  Type.Literal('explicit'),
  Type.Literal('inferred'),
  Type.Literal('computed'),
  Type.Literal('user_approved'),
]);

export type EdgeProvenance = Static<typeof EdgeProvenanceSchema>;

export const EdgeSchema = Type.Object({
  edgeId: Type.String(),
  sourceId: Type.String(),
  targetId: Type.String(),
  edgeType: EdgeTypeSchema,
  strength: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  provenance: EdgeProvenanceSchema,
  createdAt: Type.String({ format: 'date-time' }),
  versionStart: Type.Optional(Type.String()),
  versionEnd: Type.Optional(Type.String()),
  attributes: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

export type Edge = Static<typeof EdgeSchema>;

// ============================================================================
// Version Types
// ============================================================================

export const VersionSchema = Type.Object({
  versionId: Type.String(),
  nodeId: Type.String(),
  contentHash: Type.String(),
  parentVersionId: Type.Optional(Type.String()),
  createdAt: Type.String({ format: 'date-time' }),
  summary: Type.Optional(Type.String()),
});

export type Version = Static<typeof VersionSchema>;

// ============================================================================
// Mention Types
// ============================================================================

export const MentionStatusSchema = Type.Union([
  Type.Literal('new'),
  Type.Literal('approved'),
  Type.Literal('rejected'),
  Type.Literal('deferred'),
]);

export type MentionStatus = Static<typeof MentionStatusSchema>;

export const MentionCandidateSchema = Type.Object({
  candidateId: Type.String(),
  sourceId: Type.String(),
  targetId: Type.String(),
  surfaceText: Type.String(),
  spanStart: Type.Optional(Type.Integer()),
  spanEnd: Type.Optional(Type.Integer()),
  confidence: Type.Number({ minimum: 0, maximum: 1 }),
  reasons: Type.Optional(Type.Array(Type.String())),
  status: MentionStatusSchema,
});

export type MentionCandidate = Static<typeof MentionCandidateSchema>;

// ============================================================================
// Chunk Types (for retrieval)
// ============================================================================

export const ChunkSchema = Type.Object({
  chunkId: Type.String(),
  nodeId: Type.String(),
  text: Type.String(),
  offsetStart: Type.Integer(),
  offsetEnd: Type.Integer(),
  versionId: Type.String(),
  tokenCount: Type.Optional(Type.Integer()),
});

export type Chunk = Static<typeof ChunkSchema>;

// ============================================================================
// Proposal Types (for writeback)
// ============================================================================

export const ProposalTypeSchema = Type.Union([
  Type.Literal('link_addition'),
  Type.Literal('content_edit'),
  Type.Literal('node_creation'),
  Type.Literal('node_deletion'),
  Type.Literal('metadata_update'),
]);

export type ProposalType = Static<typeof ProposalTypeSchema>;

export const ProposalStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('approved'),
  Type.Literal('rejected'),
  Type.Literal('applied'),
]);

export type ProposalStatus = Static<typeof ProposalStatusSchema>;

export const ProposalSchema = Type.Object({
  proposalId: Type.String(),
  type: ProposalTypeSchema,
  nodeId: Type.String(),
  description: Type.String(),
  diff: Type.Object({
    before: Type.Optional(Type.String()),
    after: Type.String(),
  }),
  status: ProposalStatusSchema,
  createdAt: Type.String({ format: 'date-time' }),
  appliedAt: Type.Optional(Type.String({ format: 'date-time' })),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

export type Proposal = Static<typeof ProposalSchema>;

// ============================================================================
// Graph Metrics
// ============================================================================

export const GraphMetricsSchema = Type.Object({
  nodeId: Type.String(),
  centralityPagerank: Type.Optional(Type.Number()),
  clusterId: Type.Optional(Type.String()),
  computedAt: Type.String({ format: 'date-time' }),
});

export type GraphMetrics = Static<typeof GraphMetricsSchema>;

// ============================================================================
// Frontmatter Schema
// ============================================================================

export const FrontmatterSchema = Type.Object({
  id: Type.Optional(Type.String()),
  title: Type.Optional(Type.String()),
  type: Type.Optional(NodeTypeSchema),
  aliases: Type.Optional(Type.Array(Type.String())),
  tags: Type.Optional(Type.Array(Type.String())),
  created: Type.Optional(Type.String()),
  updated: Type.Optional(Type.String()),
  // Manuscript-specific fields
  pov: Type.Optional(Type.String()),
  scene_order: Type.Optional(Type.Number()),
  timeline_position: Type.Optional(Type.String()),
  characters: Type.Optional(Type.Array(Type.String())),
  locations: Type.Optional(Type.Array(Type.String())),
  // Allow additional fields
}, { additionalProperties: true });

export type Frontmatter = Static<typeof FrontmatterSchema>;

// ============================================================================
// Wikilink Types
// ============================================================================

export interface WikiLink {
  raw: string;           // Original text including brackets
  target: string;        // The link target (after id: prefix if present)
  display: string;       // Display text (after | if present)
  isIdLink: boolean;     // Whether it uses id: prefix
  start: number;         // Start position in source
  end: number;           // End position in source
}

export interface ResolvedLink extends WikiLink {
  resolvedNodeId: string | null;
  ambiguous: boolean;
  candidates: string[];  // Node IDs if ambiguous
}

// ============================================================================
// Query Types
// ============================================================================

export interface BacklinkResult {
  sourceNode: Node;
  edge: Edge;
  context?: string;  // Surrounding text for context
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
  path: string[];  // Node IDs forming the path
}

// ============================================================================
// Retrieval Types
// ============================================================================

export interface RetrievalQuery {
  text: string;
  maxResults?: number;
  filters?: {
    nodeTypes?: NodeType[];
    excludeNodeIds?: string[];
    dateRange?: { start?: string; end?: string };
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

// ============================================================================
// Manuscript Types
// ============================================================================

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
  knows: Map<string, { learnedAt: string; source: string }>;
  present: string[];  // Scene IDs where character is present
}

export interface ContinuityIssue {
  type: 'pov_leakage' | 'timeline_inconsistency' | 'missing_setup' | 'orphaned_payoff' | 'character_knowledge';
  severity: 'error' | 'warning' | 'info';
  nodeId: string;
  description: string;
  suggestion?: string;
}

export interface ImpactAnalysis {
  directImpact: string[];      // Directly affected node IDs
  transitiveImpact: string[];  // Indirectly affected via graph
  povImpact: string[];         // Scenes with same POV
  timelineImpact: string[];    // Scenes in timeline range
  characterImpact: string[];   // Characters whose knowledge changes
}

// ============================================================================
// Configuration Types
// ============================================================================

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
    provider: 'openai' | 'ollama' | 'none';
    model: string;
    apiKey?: string;
    baseUrl?: string;
    maxTokens?: number;
    temperature?: number;
  };
}

export const DEFAULT_CONFIG: ZettelScriptConfig = {
  vault: {
    path: '.',
    excludePatterns: ['node_modules/**', '.git/**', '.zettelscript/**'],
  },
  database: {
    path: '.zettelscript/zettelscript.db',
  },
  embeddings: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },
  retrieval: {
    defaultMaxResults: 20,
    semanticWeight: 0.5,
    lexicalWeight: 0.3,
    graphWeight: 0.2,
    rrfK: 60,
    expansionMaxDepth: 3,
    expansionBudget: 50,
  },
  manuscript: {
    enabled: false,
    validatePov: true,
    validateTimeline: true,
    validateSetupPayoff: true,
  },
  graph: {
    defaultMaxDepth: 3,
    defaultBudget: 50,
    decayFactor: 0.7,
    scoreThreshold: 0.01,
  },
  chunking: {
    maxTokens: 512,
    overlap: 50,
    minChunkSize: 50,
  },
  discovery: {
    weights: {
      locality: 0.3,
      centrality: 0.2,
      frequency: 0.2,
      matchQuality: 0.3,
    },
    confidenceThreshold: 0.3,
    ambiguityPenalty: 0.7,
    expansionMaxDepth: 4,
    expansionBudget: 100,
  },
  cache: {
    defaultTtlMs: 300000, // 5 minutes
    defaultMaxSize: 1000,
    mentionTtlMs: 600000, // 10 minutes
    mentionMaxSize: 500,
    mocTtlMs: 300000, // 5 minutes
    mocMaxSize: 100,
  },
  impact: {
    timelineRange: 5,
    maxTransitiveDepth: 3,
    maxTransitiveBudget: 50,
  },
  moc: {
    scoreNormalizationBase: 100,
    hubScoreNormalization: 50,
    clusterScoreNormalization: 20,
    defaultHubThreshold: 5,
  },
  versioning: {
    driftVersionWindow: 5,
    butterflyLogDefaultEntries: 50,
  },
  search: {
    defaultLimit: 20,
    contextWindowChars: 50,
    diffContextLines: 3,
  },
  llm: {
    provider: 'none',
    model: 'gpt-4',
  },
};
