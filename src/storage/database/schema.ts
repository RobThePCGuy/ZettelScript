import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';

// ============================================================================
// Nodes Table
// ============================================================================

export const nodes = sqliteTable('nodes', {
  nodeId: text('node_id').primaryKey(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  path: text('path').notNull().unique(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  contentHash: text('content_hash'),
  metadata: text('metadata', { mode: 'json' }),
}, (table) => [
  index('idx_nodes_title').on(table.title),
  index('idx_nodes_type').on(table.type),
  index('idx_nodes_path').on(table.path),
]);

// ============================================================================
// Edges Table
// ============================================================================

export const edges = sqliteTable('edges', {
  edgeId: text('edge_id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => nodes.nodeId, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull().references(() => nodes.nodeId, { onDelete: 'cascade' }),
  edgeType: text('edge_type').notNull(),
  strength: real('strength'),
  provenance: text('provenance').notNull(),
  createdAt: text('created_at').notNull(),
  versionStart: text('version_start'),
  versionEnd: text('version_end'),
  attributes: text('attributes', { mode: 'json' }),
}, (table) => [
  index('idx_edges_source').on(table.sourceId),
  index('idx_edges_target').on(table.targetId),
  index('idx_edges_type').on(table.edgeType),
  index('idx_edges_source_target').on(table.sourceId, table.targetId),
]);

// ============================================================================
// Versions Table
// ============================================================================

export const versions = sqliteTable('versions', {
  versionId: text('version_id').primaryKey(),
  nodeId: text('node_id').notNull().references(() => nodes.nodeId, { onDelete: 'cascade' }),
  contentHash: text('content_hash').notNull(),
  parentVersionId: text('parent_version_id'),
  createdAt: text('created_at').notNull(),
  summary: text('summary'),
}, (table) => [
  index('idx_versions_node').on(table.nodeId),
  index('idx_versions_parent').on(table.parentVersionId),
]);

// ============================================================================
// Mention Candidates Table
// ============================================================================

export const mentionCandidates = sqliteTable('mention_candidates', {
  candidateId: text('candidate_id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => nodes.nodeId, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull().references(() => nodes.nodeId, { onDelete: 'cascade' }),
  surfaceText: text('surface_text').notNull(),
  spanStart: integer('span_start'),
  spanEnd: integer('span_end'),
  confidence: real('confidence').notNull(),
  reasons: text('reasons', { mode: 'json' }),
  status: text('status').default('new'),
}, (table) => [
  index('idx_mentions_source').on(table.sourceId),
  index('idx_mentions_target').on(table.targetId),
  index('idx_mentions_status').on(table.status),
]);

// ============================================================================
// Chunks Table
// ============================================================================

export const chunks = sqliteTable('chunks', {
  chunkId: text('chunk_id').primaryKey(),
  nodeId: text('node_id').notNull().references(() => nodes.nodeId, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  offsetStart: integer('offset_start').notNull(),
  offsetEnd: integer('offset_end').notNull(),
  versionId: text('version_id').notNull(),
  tokenCount: integer('token_count'),
}, (table) => [
  index('idx_chunks_node').on(table.nodeId),
  index('idx_chunks_version').on(table.versionId),
]);

// ============================================================================
// Aliases Table
// ============================================================================

export const aliases = sqliteTable('aliases', {
  aliasId: text('alias_id').primaryKey(),
  nodeId: text('node_id').notNull().references(() => nodes.nodeId, { onDelete: 'cascade' }),
  alias: text('alias').notNull(),
}, (table) => [
  index('idx_aliases_node').on(table.nodeId),
  index('idx_aliases_alias').on(table.alias),
]);

// ============================================================================
// Graph Metrics Cache
// ============================================================================

export const graphMetrics = sqliteTable('graph_metrics', {
  nodeId: text('node_id').primaryKey().references(() => nodes.nodeId, { onDelete: 'cascade' }),
  centralityPagerank: real('centrality_pagerank'),
  clusterId: text('cluster_id'),
  computedAt: text('computed_at').notNull(),
});

// ============================================================================
// Proposals Table
// ============================================================================

export const proposals = sqliteTable('proposals', {
  proposalId: text('proposal_id').primaryKey(),
  type: text('type').notNull(),
  nodeId: text('node_id').notNull().references(() => nodes.nodeId, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  diff: text('diff', { mode: 'json' }).notNull(),
  status: text('status').default('pending'),
  createdAt: text('created_at').notNull(),
  appliedAt: text('applied_at'),
  metadata: text('metadata', { mode: 'json' }),
}, (table) => [
  index('idx_proposals_node').on(table.nodeId),
  index('idx_proposals_status').on(table.status),
]);

// ============================================================================
// Unresolved Links Table
// ============================================================================

export const unresolvedLinks = sqliteTable('unresolved_links', {
  linkId: text('link_id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => nodes.nodeId, { onDelete: 'cascade' }),
  targetText: text('target_text').notNull(),
  spanStart: integer('span_start'),
  spanEnd: integer('span_end'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_unresolved_source').on(table.sourceId),
  index('idx_unresolved_target').on(table.targetText),
]);

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
