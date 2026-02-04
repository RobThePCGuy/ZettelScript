import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';

// ============================================================================
// Nodes Table
// ============================================================================

export const nodes = sqliteTable(
  'nodes',
  {
    nodeId: text('node_id').primaryKey(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    path: text('path').notNull().unique(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    contentHash: text('content_hash'),
    metadata: text('metadata', { mode: 'json' }),
    isGhost: integer('is_ghost').notNull().default(0), // 0 = real node, 1 = ghost
  },
  (table) => [
    index('idx_nodes_title').on(table.title),
    index('idx_nodes_type').on(table.type),
    index('idx_nodes_path').on(table.path),
    index('idx_nodes_ghost').on(table.isGhost),
  ]
);

// ============================================================================
// Edges Table
// ============================================================================

export const edges = sqliteTable(
  'edges',
  {
    edgeId: text('edge_id').primaryKey(),
    sourceId: text('source_id')
      .notNull()
      .references(() => nodes.nodeId, { onDelete: 'cascade' }),
    targetId: text('target_id')
      .notNull()
      .references(() => nodes.nodeId, { onDelete: 'cascade' }),
    edgeType: text('edge_type').notNull(),
    strength: real('strength'),
    provenance: text('provenance').notNull(),
    createdAt: text('created_at').notNull(),
    versionStart: text('version_start'),
    versionEnd: text('version_end'),
    attributes: text('attributes', { mode: 'json' }),
  },
  (table) => [
    index('idx_edges_source').on(table.sourceId),
    index('idx_edges_target').on(table.targetId),
    index('idx_edges_type').on(table.edgeType),
    index('idx_edges_source_target').on(table.sourceId, table.targetId),
  ]
);

// ============================================================================
// Versions Table
// ============================================================================

export const versions = sqliteTable(
  'versions',
  {
    versionId: text('version_id').primaryKey(),
    nodeId: text('node_id')
      .notNull()
      .references(() => nodes.nodeId, { onDelete: 'cascade' }),
    contentHash: text('content_hash').notNull(),
    parentVersionId: text('parent_version_id'),
    createdAt: text('created_at').notNull(),
    summary: text('summary'),
  },
  (table) => [
    index('idx_versions_node').on(table.nodeId),
    index('idx_versions_parent').on(table.parentVersionId),
  ]
);

// ============================================================================
// Mention Candidates Table
// ============================================================================

export const mentionCandidates = sqliteTable(
  'mention_candidates',
  {
    candidateId: text('candidate_id').primaryKey(),
    sourceId: text('source_id')
      .notNull()
      .references(() => nodes.nodeId, { onDelete: 'cascade' }),
    targetId: text('target_id')
      .notNull()
      .references(() => nodes.nodeId, { onDelete: 'cascade' }),
    surfaceText: text('surface_text').notNull(),
    spanStart: integer('span_start'),
    spanEnd: integer('span_end'),
    confidence: real('confidence').notNull(),
    reasons: text('reasons', { mode: 'json' }),
    status: text('status').default('new'),
  },
  (table) => [
    index('idx_mentions_source').on(table.sourceId),
    index('idx_mentions_target').on(table.targetId),
    index('idx_mentions_status').on(table.status),
  ]
);

// ============================================================================
// Chunks Table
// ============================================================================

export const chunks = sqliteTable(
  'chunks',
  {
    chunkId: text('chunk_id').primaryKey(),
    nodeId: text('node_id')
      .notNull()
      .references(() => nodes.nodeId, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    offsetStart: integer('offset_start').notNull(),
    offsetEnd: integer('offset_end').notNull(),
    versionId: text('version_id').notNull(),
    tokenCount: integer('token_count'),
  },
  (table) => [
    index('idx_chunks_node').on(table.nodeId),
    index('idx_chunks_version').on(table.versionId),
  ]
);

// ============================================================================
// Aliases Table
// ============================================================================

export const aliases = sqliteTable(
  'aliases',
  {
    aliasId: text('alias_id').primaryKey(),
    nodeId: text('node_id')
      .notNull()
      .references(() => nodes.nodeId, { onDelete: 'cascade' }),
    alias: text('alias').notNull(),
  },
  (table) => [
    index('idx_aliases_node').on(table.nodeId),
    index('idx_aliases_alias').on(table.alias),
  ]
);

// ============================================================================
// Graph Metrics Cache
// ============================================================================

export const graphMetrics = sqliteTable('graph_metrics', {
  nodeId: text('node_id')
    .primaryKey()
    .references(() => nodes.nodeId, { onDelete: 'cascade' }),
  centralityPagerank: real('centrality_pagerank'),
  clusterId: text('cluster_id'),
  computedAt: text('computed_at').notNull(),
});

// ============================================================================
// Proposals Table
// ============================================================================

export const proposals = sqliteTable(
  'proposals',
  {
    proposalId: text('proposal_id').primaryKey(),
    type: text('type').notNull(),
    nodeId: text('node_id')
      .notNull()
      .references(() => nodes.nodeId, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    diff: text('diff', { mode: 'json' }).notNull(),
    status: text('status').default('pending'),
    createdAt: text('created_at').notNull(),
    appliedAt: text('applied_at'),
    metadata: text('metadata', { mode: 'json' }),
  },
  (table) => [
    index('idx_proposals_node').on(table.nodeId),
    index('idx_proposals_status').on(table.status),
  ]
);

// ============================================================================
// Unresolved Links Table
// ============================================================================

export const unresolvedLinks = sqliteTable(
  'unresolved_links',
  {
    linkId: text('link_id').primaryKey(),
    sourceId: text('source_id')
      .notNull()
      .references(() => nodes.nodeId, { onDelete: 'cascade' }),
    targetText: text('target_text').notNull(),
    spanStart: integer('span_start'),
    spanEnd: integer('span_end'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_unresolved_source').on(table.sourceId),
    index('idx_unresolved_target').on(table.targetText),
  ]
);

// ============================================================================
// Constellations Table (Saved Graph Views)
// ============================================================================

export const constellations = sqliteTable(
  'constellations',
  {
    constellationId: text('constellation_id').primaryKey(),
    name: text('name').notNull().unique(),
    description: text('description'),

    // Filter state (JSON arrays)
    hiddenNodeTypes: text('hidden_node_types', { mode: 'json' }),
    hiddenEdgeTypes: text('hidden_edge_types', { mode: 'json' }),

    // Ghost node config
    showGhosts: integer('show_ghosts').notNull().default(1),
    ghostThreshold: integer('ghost_threshold').notNull().default(1),

    // Camera state
    cameraX: real('camera_x'),
    cameraY: real('camera_y'),
    cameraZoom: real('camera_zoom'),

    // Focus nodes (seed nodes for the view)
    focusNodeIds: text('focus_node_ids', { mode: 'json' }),

    // Timestamps
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_constellations_name').on(table.name)]
);

// ============================================================================
// Node Embeddings Table (for Semantic Wormholes)
// ============================================================================

export const nodeEmbeddings = sqliteTable(
  'node_embeddings',
  {
    embeddingId: text('embedding_id').primaryKey(),
    nodeId: text('node_id')
      .notNull()
      .unique()
      .references(() => nodes.nodeId, { onDelete: 'cascade' }),
    embedding: text('embedding', { mode: 'json' }).notNull(), // Float array as JSON
    model: text('model').notNull(), // e.g., 'openai:text-embedding-3-small'
    dimensions: integer('dimensions').notNull(),
    contentHash: text('content_hash').notNull(), // To detect when recompute is needed
    computedAt: text('computed_at').notNull(),
  },
  (table) => [
    index('idx_embeddings_node').on(table.nodeId),
    index('idx_embeddings_model').on(table.model),
  ]
);

// ============================================================================
// Wormhole Rejections Table (Tracks Rejected Semantic Suggestions)
// ============================================================================

export const wormholeRejections = sqliteTable(
  'wormhole_rejections',
  {
    rejectionId: text('rejection_id').primaryKey(),
    sourceId: text('source_id')
      .notNull()
      .references(() => nodes.nodeId, { onDelete: 'cascade' }),
    targetId: text('target_id')
      .notNull()
      .references(() => nodes.nodeId, { onDelete: 'cascade' }),
    sourceContentHash: text('source_content_hash').notNull(),
    targetContentHash: text('target_content_hash').notNull(),
    rejectedAt: text('rejected_at').notNull(),
  },
  (table) => [
    index('idx_rejections_source').on(table.sourceId),
    index('idx_rejections_target').on(table.targetId),
    index('idx_rejections_pair').on(table.sourceId, table.targetId),
  ]
);

// ============================================================================
// Candidate Edges Table (Phase 2: Suggestions)
// ============================================================================

export const candidateEdges = sqliteTable(
  'candidate_edges',
  {
    suggestionId: text('suggestion_id').primaryKey(),
    fromId: text('from_id').notNull(),
    toId: text('to_id').notNull(),
    suggestedEdgeType: text('suggested_edge_type').notNull(),

    // For undirected uniqueness (canonical ordering)
    fromIdNorm: text('from_id_norm').notNull(),
    toIdNorm: text('to_id_norm').notNull(),

    // Status lifecycle
    status: text('status').default('suggested').notNull(),
    statusChangedAt: text('status_changed_at'),

    // Evidence (merged from multiple sources)
    signals: text('signals', { mode: 'json' }), // { semantic?, mentionCount?, graphProximity? }
    reasons: text('reasons', { mode: 'json' }), // string[]
    provenance: text('provenance', { mode: 'json' }), // array of evidence objects

    // Timestamps
    createdAt: text('created_at').notNull(),
    lastComputedAt: text('last_computed_at').notNull(),
    lastSeenAt: text('last_seen_at'),

    // Writeback tracking
    writebackStatus: text('writeback_status'),
    writebackReason: text('writeback_reason'),
    approvedEdgeId: text('approved_edge_id'),
  },
  (table) => [
    index('idx_candidate_from').on(table.fromId),
    index('idx_candidate_to').on(table.toId),
    index('idx_candidate_status').on(table.status),
    index('idx_candidate_norm').on(table.fromIdNorm, table.toIdNorm, table.suggestedEdgeType),
  ]
);

// Type exports for use in repositories
export type NodeRow = typeof nodes.$inferSelect;
export type NewNodeRow = typeof nodes.$inferInsert;

export type EdgeRow = typeof edges.$inferSelect;
export type NewEdgeRow = typeof edges.$inferInsert;

export type VersionRow = typeof versions.$inferSelect;
export type NewVersionRow = typeof versions.$inferInsert;

export type MentionCandidateRow = typeof mentionCandidates.$inferSelect;
export type NewMentionCandidateRow = typeof mentionCandidates.$inferInsert;

export type ChunkRow = typeof chunks.$inferSelect;
export type NewChunkRow = typeof chunks.$inferInsert;

export type AliasRow = typeof aliases.$inferSelect;
export type NewAliasRow = typeof aliases.$inferInsert;

export type ProposalRow = typeof proposals.$inferSelect;
export type NewProposalRow = typeof proposals.$inferInsert;

export type ConstellationRow = typeof constellations.$inferSelect;
export type NewConstellationRow = typeof constellations.$inferInsert;

export type NodeEmbeddingRow = typeof nodeEmbeddings.$inferSelect;
export type NewNodeEmbeddingRow = typeof nodeEmbeddings.$inferInsert;

export type WormholeRejectionRow = typeof wormholeRejections.$inferSelect;
export type NewWormholeRejectionRow = typeof wormholeRejections.$inferInsert;

export type CandidateEdgeRow = typeof candidateEdges.$inferSelect;
export type NewCandidateEdgeRow = typeof candidateEdges.$inferInsert;
