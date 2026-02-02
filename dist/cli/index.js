#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/cli/index.ts
import { Command as Command14 } from "commander";

// src/cli/commands/init.ts
import { Command } from "commander";
import * as fs3 from "fs";
import * as path3 from "path";
import { stringify as stringifyYaml3 } from "yaml";

// src/storage/database/connection.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

// src/storage/database/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aliases: () => aliases,
  chunks: () => chunks,
  edges: () => edges,
  graphMetrics: () => graphMetrics,
  mentionCandidates: () => mentionCandidates,
  nodes: () => nodes,
  proposals: () => proposals,
  unresolvedLinks: () => unresolvedLinks,
  versions: () => versions
});
import { sqliteTable, text, real, integer, index } from "drizzle-orm/sqlite-core";
var nodes = sqliteTable("nodes", {
  nodeId: text("node_id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  path: text("path").notNull().unique(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  contentHash: text("content_hash"),
  metadata: text("metadata", { mode: "json" })
}, (table) => [
  index("idx_nodes_title").on(table.title),
  index("idx_nodes_type").on(table.type),
  index("idx_nodes_path").on(table.path)
]);
var edges = sqliteTable("edges", {
  edgeId: text("edge_id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
  targetId: text("target_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
  edgeType: text("edge_type").notNull(),
  strength: real("strength"),
  provenance: text("provenance").notNull(),
  createdAt: text("created_at").notNull(),
  versionStart: text("version_start"),
  versionEnd: text("version_end"),
  attributes: text("attributes", { mode: "json" })
}, (table) => [
  index("idx_edges_source").on(table.sourceId),
  index("idx_edges_target").on(table.targetId),
  index("idx_edges_type").on(table.edgeType),
  index("idx_edges_source_target").on(table.sourceId, table.targetId)
]);
var versions = sqliteTable("versions", {
  versionId: text("version_id").primaryKey(),
  nodeId: text("node_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
  contentHash: text("content_hash").notNull(),
  parentVersionId: text("parent_version_id"),
  createdAt: text("created_at").notNull(),
  summary: text("summary")
}, (table) => [
  index("idx_versions_node").on(table.nodeId),
  index("idx_versions_parent").on(table.parentVersionId)
]);
var mentionCandidates = sqliteTable("mention_candidates", {
  candidateId: text("candidate_id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
  targetId: text("target_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
  surfaceText: text("surface_text").notNull(),
  spanStart: integer("span_start"),
  spanEnd: integer("span_end"),
  confidence: real("confidence").notNull(),
  reasons: text("reasons", { mode: "json" }),
  status: text("status").default("new")
}, (table) => [
  index("idx_mentions_source").on(table.sourceId),
  index("idx_mentions_target").on(table.targetId),
  index("idx_mentions_status").on(table.status)
]);
var chunks = sqliteTable("chunks", {
  chunkId: text("chunk_id").primaryKey(),
  nodeId: text("node_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
  text: text("text").notNull(),
  offsetStart: integer("offset_start").notNull(),
  offsetEnd: integer("offset_end").notNull(),
  versionId: text("version_id").notNull(),
  tokenCount: integer("token_count")
}, (table) => [
  index("idx_chunks_node").on(table.nodeId),
  index("idx_chunks_version").on(table.versionId)
]);
var aliases = sqliteTable("aliases", {
  aliasId: text("alias_id").primaryKey(),
  nodeId: text("node_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
  alias: text("alias").notNull()
}, (table) => [
  index("idx_aliases_node").on(table.nodeId),
  index("idx_aliases_alias").on(table.alias)
]);
var graphMetrics = sqliteTable("graph_metrics", {
  nodeId: text("node_id").primaryKey().references(() => nodes.nodeId, { onDelete: "cascade" }),
  centralityPagerank: real("centrality_pagerank"),
  clusterId: text("cluster_id"),
  computedAt: text("computed_at").notNull()
});
var proposals = sqliteTable("proposals", {
  proposalId: text("proposal_id").primaryKey(),
  type: text("type").notNull(),
  nodeId: text("node_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
  description: text("description").notNull(),
  diff: text("diff", { mode: "json" }).notNull(),
  status: text("status").default("pending"),
  createdAt: text("created_at").notNull(),
  appliedAt: text("applied_at"),
  metadata: text("metadata", { mode: "json" })
}, (table) => [
  index("idx_proposals_node").on(table.nodeId),
  index("idx_proposals_status").on(table.status)
]);
var unresolvedLinks = sqliteTable("unresolved_links", {
  linkId: text("link_id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => nodes.nodeId, { onDelete: "cascade" }),
  targetText: text("target_text").notNull(),
  spanStart: integer("span_start"),
  spanEnd: integer("span_end"),
  createdAt: text("created_at").notNull()
}, (table) => [
  index("idx_unresolved_source").on(table.sourceId),
  index("idx_unresolved_target").on(table.targetText)
]);

// src/core/errors.ts
var ZettelScriptError = class extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "ZettelScriptError";
    Error.captureStackTrace(this, this.constructor);
  }
};
var DatabaseError = class extends ZettelScriptError {
  constructor(message, details) {
    super(message, "DATABASE_ERROR", details);
    this.name = "DatabaseError";
  }
};
var ParseError = class extends ZettelScriptError {
  constructor(message, filePath, line, column, details) {
    super(message, "PARSE_ERROR", { filePath, line, column, ...details });
    this.filePath = filePath;
    this.line = line;
    this.column = column;
    this.name = "ParseError";
  }
};
var FileSystemError = class extends ZettelScriptError {
  constructor(message, filePath, details) {
    super(message, "FILESYSTEM_ERROR", { filePath, ...details });
    this.filePath = filePath;
    this.name = "FileSystemError";
  }
};

// src/storage/database/connection.ts
import * as fs from "fs";
import * as path from "path";
var FTS5_SCHEMA = `
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  chunk_id,
  node_id,
  text,
  tokenize='porter'
);
`;
var FTS5_TRIGGERS = `
CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
  INSERT INTO chunks_fts(chunk_id, node_id, text)
  VALUES (new.chunk_id, new.node_id, new.text);
END;

CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
  DELETE FROM chunks_fts WHERE chunk_id = old.chunk_id;
END;

CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON chunks BEGIN
  DELETE FROM chunks_fts WHERE chunk_id = old.chunk_id;
  INSERT INTO chunks_fts(chunk_id, node_id, text)
  VALUES (new.chunk_id, new.node_id, new.text);
END;
`;
var SCHEMA_VERSION = 1;
var ConnectionManager = class _ConnectionManager {
  static instance = null;
  sqlite = null;
  db = null;
  dbPath;
  constructor(dbPath) {
    this.dbPath = dbPath;
  }
  /**
   * Get or create the singleton connection manager
   */
  static getInstance(dbPath) {
    if (!_ConnectionManager.instance) {
      if (!dbPath) {
        throw new DatabaseError("Database path required for initial connection");
      }
      _ConnectionManager.instance = new _ConnectionManager(dbPath);
    }
    return _ConnectionManager.instance;
  }
  /**
   * Reset the singleton (useful for testing)
   */
  static resetInstance() {
    if (_ConnectionManager.instance) {
      _ConnectionManager.instance.close();
      _ConnectionManager.instance = null;
    }
  }
  /**
   * Initialize the database connection and schema
   */
  async initialize() {
    if (this.db) {
      return;
    }
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.sqlite = new Database(this.dbPath);
      this.sqlite.pragma("journal_mode = WAL");
      this.sqlite.pragma("foreign_keys = ON");
      this.sqlite.pragma("synchronous = NORMAL");
      this.db = drizzle(this.sqlite, { schema: schema_exports });
      await this.migrate();
    } catch (error) {
      throw new DatabaseError(`Failed to initialize database: ${error}`, {
        path: this.dbPath,
        error: String(error)
      });
    }
  }
  /**
   * Run database migrations
   */
  async migrate() {
    if (!this.sqlite) {
      throw new DatabaseError("SQLite connection not initialized");
    }
    let currentVersion = 0;
    try {
      const result = this.sqlite.prepare("SELECT version FROM schema_version LIMIT 1").get();
      if (result) {
        currentVersion = result.version;
      }
    } catch {
    }
    if (currentVersion >= SCHEMA_VERSION) {
      return;
    }
    this.sqlite.exec(`
      -- Schema version tracking
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );

      -- Nodes
      CREATE TABLE IF NOT EXISTS nodes (
        node_id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        content_hash TEXT,
        metadata TEXT
      );

      -- Edges with version ranges
      CREATE TABLE IF NOT EXISTS edges (
        edge_id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        edge_type TEXT NOT NULL,
        strength REAL,
        provenance TEXT NOT NULL,
        created_at TEXT NOT NULL,
        version_start TEXT,
        version_end TEXT,
        attributes TEXT
      );

      -- Version history
      CREATE TABLE IF NOT EXISTS versions (
        version_id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        content_hash TEXT NOT NULL,
        parent_version_id TEXT,
        created_at TEXT NOT NULL,
        summary TEXT
      );

      -- Mention candidates
      CREATE TABLE IF NOT EXISTS mention_candidates (
        candidate_id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        surface_text TEXT NOT NULL,
        span_start INTEGER,
        span_end INTEGER,
        confidence REAL NOT NULL,
        reasons TEXT,
        status TEXT DEFAULT 'new'
      );

      -- Chunks for retrieval
      CREATE TABLE IF NOT EXISTS chunks (
        chunk_id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        offset_start INTEGER NOT NULL,
        offset_end INTEGER NOT NULL,
        version_id TEXT NOT NULL,
        token_count INTEGER
      );

      -- Aliases
      CREATE TABLE IF NOT EXISTS aliases (
        alias_id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        alias TEXT NOT NULL
      );

      -- Graph metrics cache
      CREATE TABLE IF NOT EXISTS graph_metrics (
        node_id TEXT PRIMARY KEY REFERENCES nodes(node_id) ON DELETE CASCADE,
        centrality_pagerank REAL,
        cluster_id TEXT,
        computed_at TEXT NOT NULL
      );

      -- Proposals
      CREATE TABLE IF NOT EXISTS proposals (
        proposal_id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        node_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        diff TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        applied_at TEXT,
        metadata TEXT
      );

      -- Unresolved links
      CREATE TABLE IF NOT EXISTS unresolved_links (
        link_id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
        target_text TEXT NOT NULL,
        span_start INTEGER,
        span_end INTEGER,
        created_at TEXT NOT NULL
      );

      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_nodes_title ON nodes(title COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
      CREATE INDEX IF NOT EXISTS idx_nodes_path ON nodes(path);
      CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
      CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
      CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(edge_type);
      CREATE INDEX IF NOT EXISTS idx_edges_source_target ON edges(source_id, target_id);
      CREATE INDEX IF NOT EXISTS idx_versions_node ON versions(node_id);
      CREATE INDEX IF NOT EXISTS idx_versions_parent ON versions(parent_version_id);
      CREATE INDEX IF NOT EXISTS idx_mentions_source ON mention_candidates(source_id);
      CREATE INDEX IF NOT EXISTS idx_mentions_target ON mention_candidates(target_id);
      CREATE INDEX IF NOT EXISTS idx_mentions_status ON mention_candidates(status);
      CREATE INDEX IF NOT EXISTS idx_chunks_node ON chunks(node_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_version ON chunks(version_id);
      CREATE INDEX IF NOT EXISTS idx_aliases_node ON aliases(node_id);
      CREATE INDEX IF NOT EXISTS idx_aliases_alias ON aliases(alias COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_proposals_node ON proposals(node_id);
      CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
      CREATE INDEX IF NOT EXISTS idx_unresolved_source ON unresolved_links(source_id);
      CREATE INDEX IF NOT EXISTS idx_unresolved_target ON unresolved_links(target_text);
    `);
    this.sqlite.exec(FTS5_SCHEMA);
    this.sqlite.exec(FTS5_TRIGGERS);
    this.sqlite.exec(`
      DELETE FROM schema_version;
      INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION});
    `);
  }
  /**
   * Get the Drizzle database instance
   */
  getDb() {
    if (!this.db) {
      throw new DatabaseError("Database not initialized. Call initialize() first.");
    }
    return this.db;
  }
  /**
   * Get the raw SQLite database instance (for FTS5 and custom queries)
   */
  getSqlite() {
    if (!this.sqlite) {
      throw new DatabaseError("Database not initialized. Call initialize() first.");
    }
    return this.sqlite;
  }
  /**
   * Close the database connection
   */
  close() {
    if (this.sqlite) {
      this.sqlite.close();
      this.sqlite = null;
      this.db = null;
    }
  }
  /**
   * Run a transaction
   */
  transaction(fn) {
    const sqlite = this.getSqlite();
    return sqlite.transaction(fn)();
  }
  /**
   * Check if the database is initialized
   */
  isInitialized() {
    return this.db !== null;
  }
  /**
   * Get database statistics
   */
  getStats() {
    const sqlite = this.getSqlite();
    const nodeCount = sqlite.prepare("SELECT COUNT(*) as count FROM nodes").get().count;
    const edgeCount = sqlite.prepare("SELECT COUNT(*) as count FROM edges").get().count;
    const chunkCount = sqlite.prepare("SELECT COUNT(*) as count FROM chunks").get().count;
    const stats = fs.statSync(this.dbPath);
    return {
      nodeCount,
      edgeCount,
      chunkCount,
      dbSizeBytes: stats.size
    };
  }
};

// src/core/types/index.ts
import { Type } from "@sinclair/typebox";
var NodeTypeSchema = Type.Union([
  Type.Literal("note"),
  Type.Literal("scene"),
  Type.Literal("character"),
  Type.Literal("location"),
  Type.Literal("object"),
  Type.Literal("event"),
  Type.Literal("concept"),
  Type.Literal("moc"),
  Type.Literal("timeline"),
  Type.Literal("draft")
]);
var NodeSchema = Type.Object({
  nodeId: Type.String(),
  type: NodeTypeSchema,
  title: Type.String(),
  path: Type.String(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
  contentHash: Type.Optional(Type.String()),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
});
var EdgeTypeSchema = Type.Union([
  Type.Literal("explicit_link"),
  Type.Literal("backlink"),
  Type.Literal("sequence"),
  Type.Literal("hierarchy"),
  Type.Literal("participation"),
  Type.Literal("pov_visible_to"),
  Type.Literal("causes"),
  Type.Literal("setup_payoff"),
  Type.Literal("semantic"),
  Type.Literal("mention"),
  Type.Literal("alias")
]);
var EdgeProvenanceSchema = Type.Union([
  Type.Literal("explicit"),
  Type.Literal("inferred"),
  Type.Literal("computed"),
  Type.Literal("user_approved")
]);
var EdgeSchema = Type.Object({
  edgeId: Type.String(),
  sourceId: Type.String(),
  targetId: Type.String(),
  edgeType: EdgeTypeSchema,
  strength: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  provenance: EdgeProvenanceSchema,
  createdAt: Type.String({ format: "date-time" }),
  versionStart: Type.Optional(Type.String()),
  versionEnd: Type.Optional(Type.String()),
  attributes: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
});
var VersionSchema = Type.Object({
  versionId: Type.String(),
  nodeId: Type.String(),
  contentHash: Type.String(),
  parentVersionId: Type.Optional(Type.String()),
  createdAt: Type.String({ format: "date-time" }),
  summary: Type.Optional(Type.String())
});
var MentionStatusSchema = Type.Union([
  Type.Literal("new"),
  Type.Literal("approved"),
  Type.Literal("rejected"),
  Type.Literal("deferred")
]);
var MentionCandidateSchema = Type.Object({
  candidateId: Type.String(),
  sourceId: Type.String(),
  targetId: Type.String(),
  surfaceText: Type.String(),
  spanStart: Type.Optional(Type.Integer()),
  spanEnd: Type.Optional(Type.Integer()),
  confidence: Type.Number({ minimum: 0, maximum: 1 }),
  reasons: Type.Optional(Type.Array(Type.String())),
  status: MentionStatusSchema
});
var ChunkSchema = Type.Object({
  chunkId: Type.String(),
  nodeId: Type.String(),
  text: Type.String(),
  offsetStart: Type.Integer(),
  offsetEnd: Type.Integer(),
  versionId: Type.String(),
  tokenCount: Type.Optional(Type.Integer())
});
var ProposalTypeSchema = Type.Union([
  Type.Literal("link_addition"),
  Type.Literal("content_edit"),
  Type.Literal("node_creation"),
  Type.Literal("node_deletion"),
  Type.Literal("metadata_update")
]);
var ProposalStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("approved"),
  Type.Literal("rejected"),
  Type.Literal("applied")
]);
var ProposalSchema = Type.Object({
  proposalId: Type.String(),
  type: ProposalTypeSchema,
  nodeId: Type.String(),
  description: Type.String(),
  diff: Type.Object({
    before: Type.Optional(Type.String()),
    after: Type.String()
  }),
  status: ProposalStatusSchema,
  createdAt: Type.String({ format: "date-time" }),
  appliedAt: Type.Optional(Type.String({ format: "date-time" })),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
});
var GraphMetricsSchema = Type.Object({
  nodeId: Type.String(),
  centralityPagerank: Type.Optional(Type.Number()),
  clusterId: Type.Optional(Type.String()),
  computedAt: Type.String({ format: "date-time" })
});
var FrontmatterSchema = Type.Object({
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
  locations: Type.Optional(Type.Array(Type.String()))
  // Allow additional fields
}, { additionalProperties: true });
var DEFAULT_CONFIG = {
  vault: {
    path: ".",
    excludePatterns: ["node_modules/**", ".git/**", ".zettelscript/**"]
  },
  database: {
    path: ".zettelscript/zettelscript.db"
  },
  embeddings: {
    provider: "openai",
    model: "text-embedding-3-small",
    dimensions: 1536
  },
  retrieval: {
    defaultMaxResults: 20,
    semanticWeight: 0.5,
    lexicalWeight: 0.3,
    graphWeight: 0.2,
    rrfK: 60,
    expansionMaxDepth: 3,
    expansionBudget: 50
  },
  manuscript: {
    enabled: false,
    validatePov: true,
    validateTimeline: true,
    validateSetupPayoff: true
  },
  graph: {
    defaultMaxDepth: 3,
    defaultBudget: 50,
    decayFactor: 0.7,
    scoreThreshold: 0.01
  },
  chunking: {
    maxTokens: 512,
    overlap: 50,
    minChunkSize: 50
  },
  discovery: {
    weights: {
      locality: 0.3,
      centrality: 0.2,
      frequency: 0.2,
      matchQuality: 0.3
    },
    confidenceThreshold: 0.3,
    ambiguityPenalty: 0.7,
    expansionMaxDepth: 4,
    expansionBudget: 100
  },
  cache: {
    defaultTtlMs: 3e5,
    // 5 minutes
    defaultMaxSize: 1e3,
    mentionTtlMs: 6e5,
    // 10 minutes
    mentionMaxSize: 500,
    mocTtlMs: 3e5,
    // 5 minutes
    mocMaxSize: 100
  },
  impact: {
    timelineRange: 5,
    maxTransitiveDepth: 3,
    maxTransitiveBudget: 50
  },
  moc: {
    scoreNormalizationBase: 100,
    hubScoreNormalization: 50,
    clusterScoreNormalization: 20,
    defaultHubThreshold: 5
  },
  versioning: {
    driftVersionWindow: 5,
    butterflyLogDefaultEntries: 50
  },
  search: {
    defaultLimit: 20,
    contextWindowChars: 50,
    diffContextLines: 3
  },
  llm: {
    provider: "none",
    model: "gpt-4"
  }
};

// src/cli/utils.ts
import * as fs2 from "fs";
import * as path2 from "path";
import { parse as parseYaml2, stringify as stringifyYaml2 } from "yaml";

// src/storage/database/repositories/node-repository.ts
import { eq, like, and, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
var NodeRepository = class {
  constructor(db) {
    this.db = db;
  }
  /**
   * Create a new node
   */
  async create(data) {
    const nodeId = nanoid();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const row = {
      nodeId,
      type: data.type,
      title: data.title,
      path: data.path,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      contentHash: data.contentHash ?? null,
      metadata: data.metadata ?? null
    };
    await this.db.insert(nodes).values(row);
    return this.rowToNode({ ...row, nodeId });
  }
  /**
   * Create or update a node by path
   */
  async upsert(data) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const nodeId = data.nodeId || nanoid();
    const existing = await this.findByPath(data.path);
    if (existing) {
      return this.update(existing.nodeId, {
        ...data,
        updatedAt: now
      });
    }
    const row = {
      nodeId,
      type: data.type,
      title: data.title,
      path: data.path,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      contentHash: data.contentHash ?? null,
      metadata: data.metadata ?? null
    };
    await this.db.insert(nodes).values(row);
    return this.rowToNode({ ...row, nodeId });
  }
  /**
   * Find a node by ID
   */
  async findById(nodeId) {
    const result = await this.db.select().from(nodes).where(eq(nodes.nodeId, nodeId)).limit(1);
    return result[0] ? this.rowToNode(result[0]) : null;
  }
  /**
   * Find a node by path
   */
  async findByPath(path16) {
    const result = await this.db.select().from(nodes).where(eq(nodes.path, path16)).limit(1);
    return result[0] ? this.rowToNode(result[0]) : null;
  }
  /**
   * Find a node by title (case-insensitive)
   */
  async findByTitle(title) {
    const result = await this.db.select().from(nodes).where(sql`${nodes.title} COLLATE NOCASE = ${title}`);
    return result.map(this.rowToNode);
  }
  /**
   * Find a node by title or alias
   */
  async findByTitleOrAlias(text2) {
    const titleMatches = await this.db.select().from(nodes).where(sql`${nodes.title} COLLATE NOCASE = ${text2}`);
    const aliasMatches = await this.db.select({ node: nodes }).from(aliases).innerJoin(nodes, eq(aliases.nodeId, nodes.nodeId)).where(sql`${aliases.alias} COLLATE NOCASE = ${text2}`);
    const nodeMap = /* @__PURE__ */ new Map();
    for (const row of titleMatches) {
      nodeMap.set(row.nodeId, row);
    }
    for (const { node } of aliasMatches) {
      nodeMap.set(node.nodeId, node);
    }
    return Array.from(nodeMap.values()).map(this.rowToNode);
  }
  /**
   * Find nodes by type
   */
  async findByType(type) {
    const result = await this.db.select().from(nodes).where(eq(nodes.type, type));
    return result.map(this.rowToNode);
  }
  /**
   * Get all nodes
   */
  async findAll() {
    const result = await this.db.select().from(nodes);
    return result.map(this.rowToNode);
  }
  /**
   * Find nodes by IDs
   */
  async findByIds(nodeIds) {
    if (nodeIds.length === 0) return [];
    const result = await this.db.select().from(nodes).where(inArray(nodes.nodeId, nodeIds));
    return result.map(this.rowToNode);
  }
  /**
   * Search nodes by title pattern
   */
  async searchByTitle(pattern) {
    const result = await this.db.select().from(nodes).where(like(nodes.title, `%${pattern}%`));
    return result.map(this.rowToNode);
  }
  /**
   * Update a node
   */
  async update(nodeId, data) {
    const updateData = {};
    if (data.type !== void 0) updateData.type = data.type;
    if (data.title !== void 0) updateData.title = data.title;
    if (data.path !== void 0) updateData.path = data.path;
    if (data.contentHash !== void 0) updateData.contentHash = data.contentHash;
    if (data.metadata !== void 0) updateData.metadata = data.metadata;
    updateData.updatedAt = data.updatedAt || (/* @__PURE__ */ new Date()).toISOString();
    await this.db.update(nodes).set(updateData).where(eq(nodes.nodeId, nodeId));
    const updated = await this.findById(nodeId);
    if (!updated) {
      throw new Error(`Node ${nodeId} not found after update`);
    }
    return updated;
  }
  /**
   * Delete a node
   */
  async delete(nodeId) {
    await this.db.delete(nodes).where(eq(nodes.nodeId, nodeId));
  }
  /**
   * Delete nodes by path pattern
   */
  async deleteByPathPattern(pattern) {
    const result = await this.db.delete(nodes).where(like(nodes.path, pattern));
    return result.changes;
  }
  /**
   * Count nodes
   */
  async count() {
    const result = await this.db.select({ count: sql`count(*)` }).from(nodes);
    return result[0]?.count ?? 0;
  }
  /**
   * Count nodes by type
   */
  async countByType() {
    const result = await this.db.select({
      type: nodes.type,
      count: sql`count(*)`
    }).from(nodes).groupBy(nodes.type);
    const counts = {};
    for (const row of result) {
      counts[row.type] = row.count;
    }
    return counts;
  }
  /**
   * Add an alias for a node
   */
  async addAlias(nodeId, alias) {
    await this.db.insert(aliases).values({
      aliasId: nanoid(),
      nodeId,
      alias
    });
  }
  /**
   * Remove an alias
   */
  async removeAlias(nodeId, alias) {
    await this.db.delete(aliases).where(and(
      eq(aliases.nodeId, nodeId),
      sql`${aliases.alias} COLLATE NOCASE = ${alias}`
    ));
  }
  /**
   * Get aliases for a node
   */
  async getAliases(nodeId) {
    const result = await this.db.select({ alias: aliases.alias }).from(aliases).where(eq(aliases.nodeId, nodeId));
    return result.map((r) => r.alias);
  }
  /**
   * Set aliases for a node (replaces existing)
   */
  async setAliases(nodeId, newAliases) {
    await this.db.delete(aliases).where(eq(aliases.nodeId, nodeId));
    if (newAliases.length > 0) {
      await this.db.insert(aliases).values(
        newAliases.map((alias) => ({
          aliasId: nanoid(),
          nodeId,
          alias
        }))
      );
    }
  }
  /**
   * Convert database row to Node type
   */
  rowToNode(row) {
    return {
      nodeId: row.nodeId,
      type: row.type,
      title: row.title,
      path: row.path,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...row.contentHash != null && { contentHash: row.contentHash },
      ...row.metadata != null && { metadata: row.metadata }
    };
  }
};

// src/storage/database/repositories/edge-repository.ts
import { eq as eq2, and as and2, or, inArray as inArray2, sql as sql2 } from "drizzle-orm";
import { nanoid as nanoid2 } from "nanoid";
var EdgeRepository = class {
  constructor(db) {
    this.db = db;
  }
  /**
   * Create a new edge
   */
  async create(data) {
    const edgeId = nanoid2();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const row = {
      edgeId,
      sourceId: data.sourceId,
      targetId: data.targetId,
      edgeType: data.edgeType,
      strength: data.strength ?? null,
      provenance: data.provenance,
      createdAt: now,
      versionStart: data.versionStart ?? null,
      versionEnd: data.versionEnd ?? null,
      attributes: data.attributes ?? null
    };
    await this.db.insert(edges).values(row);
    return this.rowToEdge({ ...row, edgeId, createdAt: now });
  }
  /**
   * Create or update an edge
   */
  async upsert(data) {
    const existing = await this.findBySourceTargetType(
      data.sourceId,
      data.targetId,
      data.edgeType
    );
    if (existing) {
      return this.update(existing.edgeId, data);
    }
    return this.create(data);
  }
  /**
   * Find an edge by ID
   */
  async findById(edgeId) {
    const result = await this.db.select().from(edges).where(eq2(edges.edgeId, edgeId)).limit(1);
    return result[0] ? this.rowToEdge(result[0]) : null;
  }
  /**
   * Find edge by source, target, and type
   */
  async findBySourceTargetType(sourceId, targetId, edgeType) {
    const result = await this.db.select().from(edges).where(and2(
      eq2(edges.sourceId, sourceId),
      eq2(edges.targetId, targetId),
      eq2(edges.edgeType, edgeType)
    )).limit(1);
    return result[0] ? this.rowToEdge(result[0]) : null;
  }
  /**
   * Find all outgoing edges from a node
   */
  async findOutgoing(nodeId, edgeTypes) {
    let query = this.db.select().from(edges).where(eq2(edges.sourceId, nodeId));
    if (edgeTypes && edgeTypes.length > 0) {
      query = this.db.select().from(edges).where(and2(
        eq2(edges.sourceId, nodeId),
        inArray2(edges.edgeType, edgeTypes)
      ));
    }
    const result = await query;
    return result.map(this.rowToEdge);
  }
  /**
   * Find all incoming edges to a node
   */
  async findIncoming(nodeId, edgeTypes) {
    let query = this.db.select().from(edges).where(eq2(edges.targetId, nodeId));
    if (edgeTypes && edgeTypes.length > 0) {
      query = this.db.select().from(edges).where(and2(
        eq2(edges.targetId, nodeId),
        inArray2(edges.edgeType, edgeTypes)
      ));
    }
    const result = await query;
    return result.map(this.rowToEdge);
  }
  /**
   * Find all edges connected to a node (both directions)
   */
  async findConnected(nodeId, edgeTypes) {
    const condition = or(
      eq2(edges.sourceId, nodeId),
      eq2(edges.targetId, nodeId)
    );
    let result;
    if (edgeTypes && edgeTypes.length > 0) {
      result = await this.db.select().from(edges).where(and2(condition, inArray2(edges.edgeType, edgeTypes)));
    } else {
      result = await this.db.select().from(edges).where(condition);
    }
    return result.map(this.rowToEdge);
  }
  /**
   * Find edges by type
   */
  async findByType(edgeType) {
    const result = await this.db.select().from(edges).where(eq2(edges.edgeType, edgeType));
    return result.map(this.rowToEdge);
  }
  /**
   * Get all edges
   */
  async findAll() {
    const result = await this.db.select().from(edges);
    return result.map(this.rowToEdge);
  }
  /**
   * Find backlinks (explicit_link edges targeting a node)
   */
  async findBacklinks(nodeId) {
    const result = await this.db.select().from(edges).where(and2(
      eq2(edges.targetId, nodeId),
      eq2(edges.edgeType, "explicit_link")
    ));
    return result.map(this.rowToEdge);
  }
  /**
   * Update an edge
   */
  async update(edgeId, data) {
    const updateData = {};
    if (data.sourceId !== void 0) updateData.sourceId = data.sourceId;
    if (data.targetId !== void 0) updateData.targetId = data.targetId;
    if (data.edgeType !== void 0) updateData.edgeType = data.edgeType;
    if (data.strength !== void 0) updateData.strength = data.strength;
    if (data.provenance !== void 0) updateData.provenance = data.provenance;
    if (data.versionStart !== void 0) updateData.versionStart = data.versionStart;
    if (data.versionEnd !== void 0) updateData.versionEnd = data.versionEnd;
    if (data.attributes !== void 0) updateData.attributes = data.attributes;
    await this.db.update(edges).set(updateData).where(eq2(edges.edgeId, edgeId));
    const updated = await this.findById(edgeId);
    if (!updated) {
      throw new Error(`Edge ${edgeId} not found after update`);
    }
    return updated;
  }
  /**
   * Delete an edge
   */
  async delete(edgeId) {
    await this.db.delete(edges).where(eq2(edges.edgeId, edgeId));
  }
  /**
   * Delete all edges for a node
   */
  async deleteForNode(nodeId) {
    const result = await this.db.delete(edges).where(or(
      eq2(edges.sourceId, nodeId),
      eq2(edges.targetId, nodeId)
    ));
    return result.changes;
  }
  /**
   * Delete edges by source and type
   */
  async deleteBySourceAndType(sourceId, edgeType) {
    const result = await this.db.delete(edges).where(and2(
      eq2(edges.sourceId, sourceId),
      eq2(edges.edgeType, edgeType)
    ));
    return result.changes;
  }
  /**
   * Count edges
   */
  async count() {
    const result = await this.db.select({ count: sql2`count(*)` }).from(edges);
    return result[0]?.count ?? 0;
  }
  /**
   * Count edges by type
   */
  async countByType() {
    const result = await this.db.select({
      type: edges.edgeType,
      count: sql2`count(*)`
    }).from(edges).groupBy(edges.edgeType);
    const counts = {};
    for (const row of result) {
      counts[row.type] = row.count;
    }
    return counts;
  }
  /**
   * Find neighbors with node info
   */
  async findNeighborsWithNodes(nodeId, edgeTypes) {
    const outgoing = await this.findOutgoing(nodeId, edgeTypes);
    const incoming = await this.findIncoming(nodeId, edgeTypes);
    const results = [];
    if (outgoing.length > 0) {
      const targetIds = outgoing.map((e) => e.targetId);
      const targetNodes = await this.db.select({
        nodeId: nodes.nodeId,
        title: nodes.title,
        type: nodes.type,
        path: nodes.path
      }).from(nodes).where(inArray2(nodes.nodeId, targetIds));
      const nodeMap = new Map(targetNodes.map((n) => [n.nodeId, n]));
      for (const edge of outgoing) {
        const node = nodeMap.get(edge.targetId);
        if (node) {
          results.push({ edge, node, direction: "outgoing" });
        }
      }
    }
    if (incoming.length > 0) {
      const sourceIds = incoming.map((e) => e.sourceId);
      const sourceNodes = await this.db.select({
        nodeId: nodes.nodeId,
        title: nodes.title,
        type: nodes.type,
        path: nodes.path
      }).from(nodes).where(inArray2(nodes.nodeId, sourceIds));
      const nodeMap = new Map(sourceNodes.map((n) => [n.nodeId, n]));
      for (const edge of incoming) {
        const node = nodeMap.get(edge.sourceId);
        if (node) {
          results.push({ edge, node, direction: "incoming" });
        }
      }
    }
    return results;
  }
  /**
   * Convert database row to Edge type
   */
  rowToEdge(row) {
    return {
      edgeId: row.edgeId,
      sourceId: row.sourceId,
      targetId: row.targetId,
      edgeType: row.edgeType,
      provenance: row.provenance,
      createdAt: row.createdAt,
      ...row.strength != null && { strength: row.strength },
      ...row.versionStart != null && { versionStart: row.versionStart },
      ...row.versionEnd != null && { versionEnd: row.versionEnd },
      ...row.attributes != null && { attributes: row.attributes }
    };
  }
};

// src/storage/database/repositories/version-repository.ts
import { eq as eq3, and as and3, sql as sql3, desc } from "drizzle-orm";
import { nanoid as nanoid3 } from "nanoid";
var VersionRepository = class {
  constructor(db) {
    this.db = db;
  }
  /**
   * Create a new version
   */
  async create(data) {
    const versionId = nanoid3();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const row = {
      versionId,
      nodeId: data.nodeId,
      contentHash: data.contentHash,
      parentVersionId: data.parentVersionId ?? null,
      createdAt: now,
      summary: data.summary ?? null
    };
    await this.db.insert(versions).values(row);
    return this.rowToVersion({ ...row, versionId, createdAt: now });
  }
  /**
   * Find a version by ID
   */
  async findById(versionId) {
    const result = await this.db.select().from(versions).where(eq3(versions.versionId, versionId)).limit(1);
    return result[0] ? this.rowToVersion(result[0]) : null;
  }
  /**
   * Find all versions for a node
   */
  async findByNodeId(nodeId) {
    const result = await this.db.select().from(versions).where(eq3(versions.nodeId, nodeId)).orderBy(desc(versions.createdAt));
    return result.map(this.rowToVersion);
  }
  /**
   * Find the latest version for a node
   */
  async findLatest(nodeId) {
    const result = await this.db.select().from(versions).where(eq3(versions.nodeId, nodeId)).orderBy(desc(versions.createdAt)).limit(1);
    return result[0] ? this.rowToVersion(result[0]) : null;
  }
  /**
   * Find version by content hash
   */
  async findByContentHash(nodeId, contentHash) {
    const result = await this.db.select().from(versions).where(and3(
      eq3(versions.nodeId, nodeId),
      eq3(versions.contentHash, contentHash)
    )).limit(1);
    return result[0] ? this.rowToVersion(result[0]) : null;
  }
  /**
   * Get version chain (all ancestors)
   */
  async getVersionChain(versionId) {
    const chain = [];
    let currentId = versionId;
    while (currentId) {
      const version = await this.findById(currentId);
      if (!version) break;
      chain.push(version);
      currentId = version.parentVersionId ?? null;
    }
    return chain;
  }
  /**
   * Get child versions
   */
  async findChildren(versionId) {
    const result = await this.db.select().from(versions).where(eq3(versions.parentVersionId, versionId));
    return result.map(this.rowToVersion);
  }
  /**
   * Update a version (mainly for summary)
   */
  async update(versionId, data) {
    await this.db.update(versions).set({ summary: data.summary ?? null }).where(eq3(versions.versionId, versionId));
    const updated = await this.findById(versionId);
    if (!updated) {
      throw new Error(`Version ${versionId} not found after update`);
    }
    return updated;
  }
  /**
   * Delete a version
   */
  async delete(versionId) {
    await this.db.delete(versions).where(eq3(versions.versionId, versionId));
  }
  /**
   * Delete all versions for a node
   */
  async deleteForNode(nodeId) {
    const result = await this.db.delete(versions).where(eq3(versions.nodeId, nodeId));
    return result.changes;
  }
  /**
   * Count versions
   */
  async count() {
    const result = await this.db.select({ count: sql3`count(*)` }).from(versions);
    return result[0]?.count ?? 0;
  }
  /**
   * Count versions per node
   */
  async countPerNode() {
    const result = await this.db.select({
      nodeId: versions.nodeId,
      count: sql3`count(*)`
    }).from(versions).groupBy(versions.nodeId);
    return new Map(result.map((r) => [r.nodeId, r.count]));
  }
  /**
   * Convert database row to Version type
   */
  rowToVersion(row) {
    return {
      versionId: row.versionId,
      nodeId: row.nodeId,
      contentHash: row.contentHash,
      createdAt: row.createdAt,
      ...row.parentVersionId != null && { parentVersionId: row.parentVersionId },
      ...row.summary != null && { summary: row.summary }
    };
  }
};

// src/storage/database/repositories/chunk-repository.ts
import { eq as eq4, sql as sql4, inArray as inArray3 } from "drizzle-orm";
import { nanoid as nanoid4 } from "nanoid";
var ChunkRepository = class {
  constructor(db, sqlite) {
    this.db = db;
    this.sqlite = sqlite;
  }
  /**
   * Create a new chunk
   */
  async create(data) {
    const chunkId = nanoid4();
    const row = {
      chunkId,
      nodeId: data.nodeId,
      text: data.text,
      offsetStart: data.offsetStart,
      offsetEnd: data.offsetEnd,
      versionId: data.versionId,
      tokenCount: data.tokenCount ?? null
    };
    await this.db.insert(chunks).values(row);
    return this.rowToChunk({ ...row, chunkId });
  }
  /**
   * Create multiple chunks
   */
  async createMany(dataArray) {
    if (dataArray.length === 0) return [];
    const rows = dataArray.map((data) => ({
      chunkId: nanoid4(),
      nodeId: data.nodeId,
      text: data.text,
      offsetStart: data.offsetStart,
      offsetEnd: data.offsetEnd,
      versionId: data.versionId,
      tokenCount: data.tokenCount ?? null
    }));
    await this.db.insert(chunks).values(rows);
    return rows.map((row) => this.rowToChunk(row));
  }
  /**
   * Find a chunk by ID
   */
  async findById(chunkId) {
    const result = await this.db.select().from(chunks).where(eq4(chunks.chunkId, chunkId)).limit(1);
    return result[0] ? this.rowToChunk(result[0]) : null;
  }
  /**
   * Find all chunks for a node
   */
  async findByNodeId(nodeId) {
    const result = await this.db.select().from(chunks).where(eq4(chunks.nodeId, nodeId)).orderBy(chunks.offsetStart);
    return result.map(this.rowToChunk);
  }
  /**
   * Find chunks by version
   */
  async findByVersionId(versionId) {
    const result = await this.db.select().from(chunks).where(eq4(chunks.versionId, versionId)).orderBy(chunks.offsetStart);
    return result.map(this.rowToChunk);
  }
  /**
   * Find chunks by IDs
   */
  async findByIds(chunkIds) {
    if (chunkIds.length === 0) return [];
    const result = await this.db.select().from(chunks).where(inArray3(chunks.chunkId, chunkIds));
    return result.map(this.rowToChunk);
  }
  /**
   * Full-text search using FTS5
   */
  searchFullText(query, limit = 20) {
    const escapedQuery = query.replace(/['"]/g, "").replace(/\*/g, "").split(/\s+/).filter((word) => word.length > 0).join(" OR ");
    if (!escapedQuery) return [];
    const stmt = this.sqlite.prepare(`
      SELECT
        chunk_id as chunkId,
        node_id as nodeId,
        text,
        rank
      FROM chunks_fts
      WHERE chunks_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);
    return stmt.all(escapedQuery, limit);
  }
  /**
   * Full-text search with BM25 ranking
   */
  searchBM25(query, limit = 20) {
    const escapedQuery = query.replace(/['"]/g, "").replace(/\*/g, "").split(/\s+/).filter((word) => word.length > 0).join(" OR ");
    if (!escapedQuery) return [];
    const stmt = this.sqlite.prepare(`
      SELECT
        chunk_id as chunkId,
        node_id as nodeId,
        text,
        bm25(chunks_fts) as score
      FROM chunks_fts
      WHERE chunks_fts MATCH ?
      ORDER BY bm25(chunks_fts)
      LIMIT ?
    `);
    return stmt.all(escapedQuery, limit);
  }
  /**
   * Update a chunk
   */
  async update(chunkId, data) {
    const updateData = {};
    if (data.nodeId !== void 0) updateData.nodeId = data.nodeId;
    if (data.text !== void 0) updateData.text = data.text;
    if (data.offsetStart !== void 0) updateData.offsetStart = data.offsetStart;
    if (data.offsetEnd !== void 0) updateData.offsetEnd = data.offsetEnd;
    if (data.versionId !== void 0) updateData.versionId = data.versionId;
    if (data.tokenCount !== void 0) updateData.tokenCount = data.tokenCount;
    await this.db.update(chunks).set(updateData).where(eq4(chunks.chunkId, chunkId));
    const updated = await this.findById(chunkId);
    if (!updated) {
      throw new Error(`Chunk ${chunkId} not found after update`);
    }
    return updated;
  }
  /**
   * Delete a chunk
   */
  async delete(chunkId) {
    await this.db.delete(chunks).where(eq4(chunks.chunkId, chunkId));
  }
  /**
   * Delete all chunks for a node
   */
  async deleteForNode(nodeId) {
    const result = await this.db.delete(chunks).where(eq4(chunks.nodeId, nodeId));
    return result.changes;
  }
  /**
   * Delete chunks by version
   */
  async deleteByVersion(versionId) {
    const result = await this.db.delete(chunks).where(eq4(chunks.versionId, versionId));
    return result.changes;
  }
  /**
   * Count chunks
   */
  async count() {
    const result = await this.db.select({ count: sql4`count(*)` }).from(chunks);
    return result[0]?.count ?? 0;
  }
  /**
   * Get total token count
   */
  async getTotalTokens() {
    const result = await this.db.select({ total: sql4`COALESCE(SUM(token_count), 0)` }).from(chunks);
    return result[0]?.total ?? 0;
  }
  /**
   * Convert database row to Chunk type
   */
  rowToChunk(row) {
    return {
      chunkId: row.chunkId,
      nodeId: row.nodeId,
      text: row.text,
      offsetStart: row.offsetStart,
      offsetEnd: row.offsetEnd,
      versionId: row.versionId,
      ...row.tokenCount != null && { tokenCount: row.tokenCount }
    };
  }
};

// src/storage/database/repositories/mention-repository.ts
import { eq as eq5, and as and4, sql as sql5 } from "drizzle-orm";
import { nanoid as nanoid5 } from "nanoid";
var MentionRepository = class {
  constructor(db) {
    this.db = db;
  }
  /**
   * Create a new mention candidate
   */
  async create(data) {
    const candidateId = nanoid5();
    const row = {
      candidateId,
      sourceId: data.sourceId,
      targetId: data.targetId,
      surfaceText: data.surfaceText,
      spanStart: data.spanStart ?? null,
      spanEnd: data.spanEnd ?? null,
      confidence: data.confidence,
      reasons: data.reasons ?? null,
      status: data.status
    };
    await this.db.insert(mentionCandidates).values(row);
    return this.rowToMention({ ...row, candidateId });
  }
  /**
   * Create multiple mention candidates
   */
  async createMany(dataArray) {
    if (dataArray.length === 0) return [];
    const rows = dataArray.map((data) => ({
      candidateId: nanoid5(),
      sourceId: data.sourceId,
      targetId: data.targetId,
      surfaceText: data.surfaceText,
      spanStart: data.spanStart ?? null,
      spanEnd: data.spanEnd ?? null,
      confidence: data.confidence,
      reasons: data.reasons ?? null,
      status: data.status
    }));
    await this.db.insert(mentionCandidates).values(rows);
    return rows.map((row) => this.rowToMention(row));
  }
  /**
   * Find a mention by ID
   */
  async findById(candidateId) {
    const result = await this.db.select().from(mentionCandidates).where(eq5(mentionCandidates.candidateId, candidateId)).limit(1);
    return result[0] ? this.rowToMention(result[0]) : null;
  }
  /**
   * Find mentions by source node
   */
  async findBySourceId(sourceId) {
    const result = await this.db.select().from(mentionCandidates).where(eq5(mentionCandidates.sourceId, sourceId));
    return result.map(this.rowToMention);
  }
  /**
   * Find mentions by target node
   */
  async findByTargetId(targetId) {
    const result = await this.db.select().from(mentionCandidates).where(eq5(mentionCandidates.targetId, targetId));
    return result.map(this.rowToMention);
  }
  /**
   * Find mentions by status
   */
  async findByStatus(status) {
    const result = await this.db.select().from(mentionCandidates).where(eq5(mentionCandidates.status, status));
    return result.map(this.rowToMention);
  }
  /**
   * Find new (pending review) mentions for a source
   */
  async findNewForSource(sourceId) {
    const result = await this.db.select().from(mentionCandidates).where(and4(
      eq5(mentionCandidates.sourceId, sourceId),
      eq5(mentionCandidates.status, "new")
    ));
    return result.map(this.rowToMention);
  }
  /**
   * Check if a mention already exists
   */
  async exists(sourceId, targetId, spanStart, spanEnd) {
    const result = await this.db.select({ count: sql5`count(*)` }).from(mentionCandidates).where(and4(
      eq5(mentionCandidates.sourceId, sourceId),
      eq5(mentionCandidates.targetId, targetId),
      eq5(mentionCandidates.spanStart, spanStart),
      eq5(mentionCandidates.spanEnd, spanEnd)
    ));
    return (result[0]?.count ?? 0) > 0;
  }
  /**
   * Update mention status
   */
  async updateStatus(candidateId, status) {
    await this.db.update(mentionCandidates).set({ status }).where(eq5(mentionCandidates.candidateId, candidateId));
    const updated = await this.findById(candidateId);
    if (!updated) {
      throw new Error(`Mention ${candidateId} not found after update`);
    }
    return updated;
  }
  /**
   * Approve a mention (converts to edge)
   */
  async approve(candidateId) {
    return this.updateStatus(candidateId, "approved");
  }
  /**
   * Reject a mention
   */
  async reject(candidateId) {
    return this.updateStatus(candidateId, "rejected");
  }
  /**
   * Defer a mention for later review
   */
  async defer(candidateId) {
    return this.updateStatus(candidateId, "deferred");
  }
  /**
   * Update confidence score
   */
  async updateConfidence(candidateId, confidence) {
    await this.db.update(mentionCandidates).set({ confidence }).where(eq5(mentionCandidates.candidateId, candidateId));
    const updated = await this.findById(candidateId);
    if (!updated) {
      throw new Error(`Mention ${candidateId} not found after update`);
    }
    return updated;
  }
  /**
   * Delete a mention
   */
  async delete(candidateId) {
    await this.db.delete(mentionCandidates).where(eq5(mentionCandidates.candidateId, candidateId));
  }
  /**
   * Delete all mentions for a source
   */
  async deleteForSource(sourceId) {
    const result = await this.db.delete(mentionCandidates).where(eq5(mentionCandidates.sourceId, sourceId));
    return result.changes;
  }
  /**
   * Delete rejected mentions
   */
  async deleteRejected() {
    const result = await this.db.delete(mentionCandidates).where(eq5(mentionCandidates.status, "rejected"));
    return result.changes;
  }
  /**
   * Count mentions
   */
  async count() {
    const result = await this.db.select({ count: sql5`count(*)` }).from(mentionCandidates);
    return result[0]?.count ?? 0;
  }
  /**
   * Count mentions by status
   */
  async countByStatus() {
    const result = await this.db.select({
      status: mentionCandidates.status,
      count: sql5`count(*)`
    }).from(mentionCandidates).groupBy(mentionCandidates.status);
    const counts = {};
    for (const row of result) {
      if (row.status) {
        counts[row.status] = row.count;
      }
    }
    return counts;
  }
  /**
   * Get top mentions by confidence
   */
  async getTopByConfidence(limit = 10) {
    const result = await this.db.select().from(mentionCandidates).where(eq5(mentionCandidates.status, "new")).orderBy(sql5`${mentionCandidates.confidence} DESC`).limit(limit);
    return result.map(this.rowToMention);
  }
  /**
   * Convert database row to MentionCandidate type
   */
  rowToMention(row) {
    return {
      candidateId: row.candidateId,
      sourceId: row.sourceId,
      targetId: row.targetId,
      surfaceText: row.surfaceText,
      confidence: row.confidence,
      status: row.status ?? "new",
      ...row.spanStart != null && { spanStart: row.spanStart },
      ...row.spanEnd != null && { spanEnd: row.spanEnd },
      ...row.reasons != null && { reasons: row.reasons }
    };
  }
};

// src/parser/markdown.ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkStringify from "remark-stringify";

// src/parser/frontmatter.ts
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
var FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
function parseFrontmatter(source, filePath) {
  const match = source.match(FRONTMATTER_REGEX);
  if (!match) {
    return {
      frontmatter: null,
      content: source,
      contentStartOffset: 0
    };
  }
  const yamlContent = match[1];
  const fullMatch = match[0];
  if (!yamlContent) {
    return {
      frontmatter: null,
      content: source,
      contentStartOffset: 0
    };
  }
  try {
    const parsed = parseYaml(yamlContent);
    return {
      frontmatter: parsed ?? null,
      content: source.slice(fullMatch.length),
      contentStartOffset: fullMatch.length
    };
  } catch (error) {
    throw new ParseError(
      `Invalid YAML frontmatter: ${error}`,
      filePath,
      void 0,
      void 0,
      { yaml: yamlContent }
    );
  }
}
function extractTitle(frontmatter, content, filePath) {
  if (frontmatter?.title) {
    return frontmatter.title;
  }
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match?.[1]) {
    return h1Match[1].trim();
  }
  const filename = filePath.split("/").pop() || filePath;
  return filename.replace(/\.md$/, "");
}
function extractNodeType(frontmatter) {
  if (frontmatter?.type) {
    return frontmatter.type;
  }
  return "note";
}
function extractAliases(frontmatter) {
  if (!frontmatter?.aliases) {
    return [];
  }
  if (Array.isArray(frontmatter.aliases)) {
    return frontmatter.aliases.filter((a) => typeof a === "string");
  }
  return [];
}

// src/parser/exclusions.ts
var PATTERNS = {
  // Fenced code blocks (``` or ~~~)
  codeBlock: /```[\s\S]*?```|~~~[\s\S]*?~~~/g,
  // Inline code
  inlineCode: /`[^`\n]+`/g,
  // URLs (http, https, ftp)
  url: /(?:https?|ftp):\/\/[^\s<>[\]()]+/g,
  // Markdown links [text](url) and ![alt](url)
  markdownLink: /!?\[[^\]]*\]\([^)]+\)/g,
  // Existing wikilinks [[...]]
  wikilink: /\[\[[^\]]+\]\]/g,
  // HTML tags
  htmlTag: /<[^>]+>/g,
  // HTML comments
  htmlComment: /<!--[\s\S]*?-->/g,
  // LaTeX math blocks
  mathBlock: /\$\$[\s\S]*?\$\$/g,
  // Inline math
  inlineMath: /\$[^$\n]+\$/g
};
function findExclusionZones(content, frontmatterOffset = 0) {
  const zones = [];
  if (frontmatterOffset > 0) {
    zones.push({
      start: 0,
      end: frontmatterOffset,
      type: "frontmatter"
    });
  }
  for (const match of content.matchAll(PATTERNS.codeBlock)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "code_block"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.inlineCode)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "inline_code"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.url)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "url"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.wikilink)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "existing_link"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.markdownLink)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "existing_link"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.htmlTag)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "html_tag"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.htmlComment)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "html_tag"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.mathBlock)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "code_block"
      });
    }
  }
  for (const match of content.matchAll(PATTERNS.inlineMath)) {
    if (match.index !== void 0) {
      zones.push({
        start: match.index + frontmatterOffset,
        end: match.index + match[0].length + frontmatterOffset,
        type: "inline_code"
      });
    }
  }
  return mergeZones(zones);
}
function mergeZones(zones) {
  if (zones.length === 0) return [];
  zones.sort((a, b) => a.start - b.start);
  const merged = [];
  let current = zones[0];
  if (!current) return [];
  for (let i = 1; i < zones.length; i++) {
    const next = zones[i];
    if (!next) continue;
    if (next.start <= current.end) {
      current = {
        start: current.start,
        end: Math.max(current.end, next.end),
        type: current.type
        // Keep the type of the first zone
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);
  return merged;
}
function overlapsExclusionZone(start, end, zones) {
  return zones.some((zone) => start < zone.end && end > zone.start);
}
function filterExcludedMatches(matches, zones) {
  return matches.filter((match) => !overlapsExclusionZone(match.start, match.end, zones));
}

// src/parser/wikilink.ts
var WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
var ID_PREFIX = "id:";
function extractWikilinks(content, contentStartOffset = 0) {
  const exclusionZones = findExclusionZones(content, contentStartOffset);
  const rawLinks = [];
  for (const match of content.matchAll(WIKILINK_REGEX)) {
    if (match.index === void 0) continue;
    const raw = match[0];
    const targetPart = match[1]?.trim() ?? "";
    const displayPart = match[2]?.trim();
    const isIdLink = targetPart.startsWith(ID_PREFIX);
    const target = isIdLink ? targetPart.slice(ID_PREFIX.length) : targetPart;
    const display = displayPart ?? target;
    const start = match.index + contentStartOffset;
    const end = start + raw.length;
    rawLinks.push({
      raw,
      target,
      display,
      isIdLink,
      start,
      end
    });
  }
  const links = filterExcludedMatches(rawLinks, exclusionZones.filter((z) => z.type !== "existing_link"));
  return { links, exclusionZones };
}
function normalizeTarget(target) {
  return target.trim().replace(/\s+/g, " ");
}
function targetsMatch(target1, target2) {
  return normalizeTarget(target1).toLowerCase() === normalizeTarget(target2).toLowerCase();
}

// src/parser/markdown.ts
function createProcessor() {
  return unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkStringify);
}
function parseMarkdown(source, filePath) {
  const { frontmatter, content, contentStartOffset } = parseFrontmatter(source, filePath);
  const title = extractTitle(frontmatter, content, filePath);
  const type = extractNodeType(frontmatter);
  const aliases2 = extractAliases(frontmatter);
  const linkResult = extractWikilinks(content, contentStartOffset);
  const processor = createProcessor();
  const ast = processor.parse(source);
  const headings = [];
  const paragraphs = [];
  function visitNode(node) {
    if (node.type === "heading" && node.position) {
      const heading = node;
      const text2 = getTextContent(heading);
      headings.push({
        level: heading.depth,
        text: text2,
        position: {
          start: node.position.start.offset ?? 0,
          end: node.position.end.offset ?? 0
        }
      });
    }
    if (node.type === "paragraph" && node.position) {
      const paragraph = node;
      const text2 = getTextContent(paragraph);
      paragraphs.push({
        text: text2,
        position: {
          start: node.position.start.offset ?? 0,
          end: node.position.end.offset ?? 0
        }
      });
    }
    if ("children" in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        visitNode(child);
      }
    }
  }
  for (const node of ast.children) {
    visitNode(node);
  }
  return {
    frontmatter,
    title,
    type,
    aliases: aliases2,
    content,
    contentStartOffset,
    links: linkResult.links,
    exclusionZones: linkResult.exclusionZones,
    headings,
    paragraphs,
    ast
  };
}
function getTextContent(node) {
  if (node.type === "text") {
    return node.value;
  }
  if ("children" in node && Array.isArray(node.children)) {
    return node.children.map((child) => getTextContent(child)).join("");
  }
  return "";
}

// src/parser/resolver.ts
var LinkResolver = class {
  constructor(options) {
    this.options = options;
  }
  cache = /* @__PURE__ */ new Map();
  /**
   * Resolve a single wikilink
   */
  async resolveLink(link) {
    if (link.isIdLink) {
      const node = await this.options.findById(link.target);
      return {
        ...link,
        resolvedNodeId: node?.nodeId ?? null,
        ambiguous: false,
        candidates: node ? [node.nodeId] : []
      };
    }
    const normalizedTarget = normalizeTarget(link.target);
    let candidates = this.cache.get(normalizedTarget.toLowerCase());
    if (!candidates) {
      candidates = await this.options.findByTitleOrAlias(normalizedTarget);
      this.cache.set(normalizedTarget.toLowerCase(), candidates);
    }
    if (candidates.length === 0) {
      return {
        ...link,
        resolvedNodeId: null,
        ambiguous: false,
        candidates: []
      };
    }
    if (candidates.length === 1) {
      return {
        ...link,
        resolvedNodeId: candidates[0]?.nodeId ?? null,
        ambiguous: false,
        candidates: [candidates[0]?.nodeId ?? ""]
      };
    }
    const exactMatch = candidates.find(
      (c) => targetsMatch(c.title, normalizedTarget)
    );
    if (exactMatch) {
      return {
        ...link,
        resolvedNodeId: exactMatch.nodeId,
        ambiguous: false,
        candidates: candidates.map((c) => c.nodeId)
      };
    }
    return {
      ...link,
      resolvedNodeId: null,
      ambiguous: true,
      candidates: candidates.map((c) => c.nodeId)
    };
  }
  /**
   * Resolve multiple wikilinks
   */
  async resolveLinks(links) {
    const resolved = [];
    const unresolved = [];
    const ambiguous = [];
    for (const link of links) {
      const result = await this.resolveLink(link);
      if (result.ambiguous) {
        ambiguous.push(link);
      } else if (result.resolvedNodeId === null) {
        unresolved.push(link);
      }
      resolved.push(result);
    }
    return { resolved, unresolved, ambiguous };
  }
  /**
   * Clear the resolution cache
   */
  clearCache() {
    this.cache.clear();
  }
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      hits: 0
      // Would need to track this separately
    };
  }
};
function createLinkResolver(nodeRepository) {
  return new LinkResolver({
    findByTitle: nodeRepository.findByTitle.bind(nodeRepository),
    findById: nodeRepository.findById.bind(nodeRepository),
    findByTitleOrAlias: nodeRepository.findByTitleOrAlias.bind(nodeRepository)
  });
}

// src/indexer/pipeline.ts
var IndexingPipeline = class {
  nodeRepo;
  edgeRepo;
  versionRepo;
  resolver = null;
  constructor(options) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
    this.versionRepo = options.versionRepository;
  }
  /**
   * Initialize the link resolver
   */
  async getResolver() {
    if (!this.resolver) {
      this.resolver = createLinkResolver(this.nodeRepo);
    }
    return this.resolver;
  }
  /**
   * Clear resolver cache (call after batch operations)
   */
  clearResolverCache() {
    if (this.resolver) {
      this.resolver.clearCache();
    }
  }
  /**
   * Index a single file
   */
  async indexFile(file) {
    const parsed = parseMarkdown(file.content, file.relativePath);
    const node = await this.upsertNode(file, parsed);
    await this.createVersionIfNeeded(node, file.contentHash);
    await this.nodeRepo.setAliases(node.nodeId, parsed.aliases);
    const { links, edges: edges2, unresolved, ambiguous } = await this.processLinks(
      node,
      parsed.links
    );
    return { node, links, edges: edges2, unresolved, ambiguous };
  }
  /**
   * Create or update a node from file info
   */
  async upsertNode(file, parsed) {
    const existing = await this.nodeRepo.findByPath(file.relativePath);
    const nodeData = {
      type: parsed.type,
      title: parsed.title,
      path: file.relativePath,
      createdAt: existing?.createdAt || file.stats.createdAt.toISOString(),
      updatedAt: file.stats.modifiedAt.toISOString(),
      contentHash: file.contentHash,
      ...parsed.frontmatter && { metadata: { ...parsed.frontmatter } }
    };
    if (existing) {
      return this.nodeRepo.update(existing.nodeId, nodeData);
    }
    return this.nodeRepo.create(nodeData);
  }
  /**
   * Create a version entry if content has changed
   */
  async createVersionIfNeeded(node, contentHash) {
    const latestVersion = await this.versionRepo.findLatest(node.nodeId);
    if (latestVersion?.contentHash === contentHash) {
      return;
    }
    await this.versionRepo.create({
      nodeId: node.nodeId,
      contentHash,
      ...latestVersion?.versionId && { parentVersionId: latestVersion.versionId }
    });
  }
  /**
   * Process wikilinks and create edges
   */
  async processLinks(sourceNode, wikilinks) {
    const resolver = await this.getResolver();
    await this.edgeRepo.deleteBySourceAndType(sourceNode.nodeId, "explicit_link");
    const links = [];
    const edges2 = [];
    const unresolved = [];
    const ambiguous = [];
    for (const wikilink2 of wikilinks) {
      const resolved = await resolver.resolveLink(wikilink2);
      links.push({
        wikilink: wikilink2,
        targetNodeId: resolved.resolvedNodeId,
        ambiguous: resolved.ambiguous
      });
      if (resolved.ambiguous) {
        ambiguous.push(wikilink2);
      } else if (resolved.resolvedNodeId === null) {
        unresolved.push(wikilink2);
      } else {
        const edge = await this.edgeRepo.create({
          sourceId: sourceNode.nodeId,
          targetId: resolved.resolvedNodeId,
          edgeType: "explicit_link",
          provenance: "explicit",
          attributes: {
            displayText: wikilink2.display,
            position: { start: wikilink2.start, end: wikilink2.end }
          }
        });
        edges2.push(edge);
      }
    }
    return { links, edges: edges2, unresolved, ambiguous };
  }
  /**
   * Two-pass batch indexing for handling circular references
   *
   * Pass 1: Create all nodes (stubs)
   * Pass 2: Process links and create edges
   */
  async batchIndex(files) {
    const startTime = Date.now();
    const indexed = [];
    const errors = [];
    const nodeMap = /* @__PURE__ */ new Map();
    for (const file of files) {
      try {
        const parsed = parseMarkdown(file.content, file.relativePath);
        const node = await this.upsertNode(file, parsed);
        await this.nodeRepo.setAliases(node.nodeId, parsed.aliases);
        nodeMap.set(file.relativePath, { node, parsed, file });
      } catch (error) {
        errors.push({
          path: file.relativePath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    this.clearResolverCache();
    let totalEdges = 0;
    let totalUnresolved = 0;
    let totalAmbiguous = 0;
    for (const { node, parsed, file } of nodeMap.values()) {
      try {
        await this.createVersionIfNeeded(node, file.contentHash);
        const { links, edges: edges2, unresolved, ambiguous } = await this.processLinks(
          node,
          parsed.links
        );
        indexed.push({ node, links, edges: edges2, unresolved, ambiguous });
        totalEdges += edges2.length;
        totalUnresolved += unresolved.length;
        totalAmbiguous += ambiguous.length;
      } catch (error) {
        errors.push({
          path: file.relativePath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    const durationMs = Date.now() - startTime;
    return {
      indexed,
      errors,
      stats: {
        totalFiles: files.length,
        successCount: indexed.length,
        errorCount: errors.length,
        nodeCount: nodeMap.size,
        edgeCount: totalEdges,
        unresolvedCount: totalUnresolved,
        ambiguousCount: totalAmbiguous,
        durationMs
      }
    };
  }
  /**
   * Remove a node and its edges
   */
  async removeNode(nodeId) {
    await this.nodeRepo.delete(nodeId);
    this.clearResolverCache();
  }
  /**
   * Remove a node by path
   */
  async removeByPath(path16) {
    const node = await this.nodeRepo.findByPath(path16);
    if (node) {
      await this.removeNode(node.nodeId);
    }
  }
  /**
   * Check if a file needs reindexing
   */
  async needsReindex(file) {
    const node = await this.nodeRepo.findByPath(file.relativePath);
    if (!node) {
      return true;
    }
    return node.contentHash !== file.contentHash;
  }
  /**
   * Get indexing statistics
   */
  async getStats() {
    const [nodeCount, edgeCount, nodesByType, edgesByType] = await Promise.all([
      this.nodeRepo.count(),
      this.edgeRepo.count(),
      this.nodeRepo.countByType(),
      this.edgeRepo.countByType()
    ]);
    return { nodeCount, edgeCount, nodesByType, edgesByType };
  }
};

// src/core/graph/engine.ts
var GraphEngine = class {
  nodeRepo;
  edgeRepo;
  config;
  constructor(options) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
    this.config = options.config ?? DEFAULT_CONFIG;
  }
  // ============================================================================
  // Node Operations
  // ============================================================================
  async getNode(nodeId) {
    return this.nodeRepo.findById(nodeId);
  }
  async getNodeByPath(path16) {
    return this.nodeRepo.findByPath(path16);
  }
  async getNodeByTitle(title) {
    return this.nodeRepo.findByTitle(title);
  }
  async getAllNodes() {
    return this.nodeRepo.findAll();
  }
  // ============================================================================
  // Edge Operations
  // ============================================================================
  async getEdge(edgeId) {
    return this.edgeRepo.findById(edgeId);
  }
  async getOutgoingEdges(nodeId, edgeTypes) {
    return this.edgeRepo.findOutgoing(nodeId, edgeTypes);
  }
  async getIncomingEdges(nodeId, edgeTypes) {
    return this.edgeRepo.findIncoming(nodeId, edgeTypes);
  }
  // ============================================================================
  // Backlinks (Spec 6.2)
  // ============================================================================
  /**
   * Get backlinks for a node
   * backlinks(node) = { edge.source_id | edge.edge_type == 'explicit_link' AND edge.target_id == node }
   */
  async getBacklinks(nodeId) {
    const edges2 = await this.edgeRepo.findBacklinks(nodeId);
    if (edges2.length === 0) return [];
    const sourceIds = edges2.map((e) => e.sourceId);
    const sourceNodes = await this.nodeRepo.findByIds(sourceIds);
    const nodeMap = new Map(sourceNodes.map((n) => [n.nodeId, n]));
    const results = [];
    for (const edge of edges2) {
      const sourceNode = nodeMap.get(edge.sourceId);
      if (sourceNode) {
        results.push({
          sourceNode,
          edge
        });
      }
    }
    return results;
  }
  /**
   * Count backlinks for a node
   */
  async countBacklinks(nodeId) {
    const edges2 = await this.edgeRepo.findBacklinks(nodeId);
    return edges2.length;
  }
  // ============================================================================
  // Neighbors
  // ============================================================================
  /**
   * Get all neighbors of a node (both directions)
   */
  async getNeighbors(nodeId, edgeTypes) {
    const neighborsWithNodes = await this.edgeRepo.findNeighborsWithNodes(nodeId, edgeTypes);
    return neighborsWithNodes.map(({ edge, node, direction }) => ({
      node: {
        nodeId: node.nodeId,
        title: node.title,
        type: node.type,
        path: node.path,
        createdAt: "",
        updatedAt: ""
      },
      edge,
      direction
    }));
  }
  /**
   * Get outgoing neighbors
   */
  async getOutgoingNeighbors(nodeId, edgeTypes) {
    const edges2 = await this.edgeRepo.findOutgoing(nodeId, edgeTypes);
    if (edges2.length === 0) return [];
    const targetIds = edges2.map((e) => e.targetId);
    return this.nodeRepo.findByIds(targetIds);
  }
  /**
   * Get incoming neighbors
   */
  async getIncomingNeighbors(nodeId, edgeTypes) {
    const edges2 = await this.edgeRepo.findIncoming(nodeId, edgeTypes);
    if (edges2.length === 0) return [];
    const sourceIds = edges2.map((e) => e.sourceId);
    return this.nodeRepo.findByIds(sourceIds);
  }
  // ============================================================================
  // Bounded Graph Traversal (Spec 7.3)
  // ============================================================================
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
  async expandGraph(options) {
    const {
      seedNodes,
      maxDepth = this.config.graph.defaultMaxDepth,
      budget = this.config.graph.defaultBudget,
      edgeTypes = ["explicit_link", "sequence", "hierarchy"],
      decayFactor = this.config.graph.decayFactor,
      includeIncoming = false
    } = options;
    if (seedNodes.length === 0) return [];
    const scores = /* @__PURE__ */ new Map();
    const paths = /* @__PURE__ */ new Map();
    const depths = /* @__PURE__ */ new Map();
    let frontier = /* @__PURE__ */ new Set();
    for (const seed of seedNodes) {
      scores.set(seed.nodeId, seed.score);
      paths.set(seed.nodeId, [seed.nodeId]);
      depths.set(seed.nodeId, 0);
      frontier.add(seed.nodeId);
    }
    const visited = new Set(frontier);
    for (let depth = 1; depth <= maxDepth; depth++) {
      if (visited.size >= budget) break;
      const newFrontier = /* @__PURE__ */ new Set();
      for (const nodeId of frontier) {
        if (visited.size >= budget) break;
        const currentScore = scores.get(nodeId) ?? 0;
        const currentPath = paths.get(nodeId) ?? [];
        const outgoing = await this.edgeRepo.findOutgoing(nodeId, edgeTypes);
        const incoming = includeIncoming ? await this.edgeRepo.findIncoming(nodeId, edgeTypes) : [];
        const allEdges = [...outgoing, ...incoming];
        for (const edge of allEdges) {
          if (visited.size >= budget) break;
          const targetId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
          const edgeWeight = edge.strength ?? 1;
          const newScore = currentScore * edgeWeight * Math.pow(decayFactor, depth);
          const existingScore = scores.get(targetId) ?? 0;
          if (newScore > existingScore) {
            scores.set(targetId, newScore);
            paths.set(targetId, [...currentPath, targetId]);
            depths.set(targetId, depth);
          }
          if (!visited.has(targetId)) {
            visited.add(targetId);
            newFrontier.add(targetId);
          }
        }
      }
      frontier = newFrontier;
      if (frontier.size === 0) break;
    }
    const results = [];
    for (const [nodeId, score] of scores) {
      results.push({
        nodeId,
        depth: depths.get(nodeId) ?? 0,
        score,
        path: paths.get(nodeId) ?? []
      });
    }
    return results.sort((a, b) => b.score - a.score);
  }
  // ============================================================================
  // Path Finding
  // ============================================================================
  /**
   * Find shortest path between two nodes (BFS)
   */
  async findShortestPath(startId, endId, edgeTypes) {
    if (startId === endId) return [startId];
    const visited = /* @__PURE__ */ new Set([startId]);
    const queue = [
      { nodeId: startId, path: [startId] }
    ];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      const edges2 = await this.edgeRepo.findOutgoing(current.nodeId, edgeTypes);
      for (const edge of edges2) {
        if (edge.targetId === endId) {
          return [...current.path, endId];
        }
        if (!visited.has(edge.targetId)) {
          visited.add(edge.targetId);
          queue.push({
            nodeId: edge.targetId,
            path: [...current.path, edge.targetId]
          });
        }
      }
    }
    return null;
  }
  /**
   * Check if two nodes are connected
   */
  async areConnected(nodeId1, nodeId2, edgeTypes, maxDepth) {
    const depth = maxDepth ?? this.config.graph.defaultMaxDepth;
    const result = await this.expandGraph({
      seedNodes: [{ nodeId: nodeId1, score: 1 }],
      maxDepth: depth,
      budget: 1e3,
      ...edgeTypes && { edgeTypes }
    });
    return result.some((r) => r.nodeId === nodeId2);
  }
  // ============================================================================
  // Subgraph Extraction
  // ============================================================================
  /**
   * Extract a subgraph around a node
   */
  async extractSubgraph(centerNodeId, radius = 2, edgeTypes) {
    const traversal = await this.expandGraph({
      seedNodes: [{ nodeId: centerNodeId, score: 1 }],
      maxDepth: radius,
      budget: 100,
      ...edgeTypes && { edgeTypes },
      includeIncoming: true
    });
    const nodeIds = traversal.map((t) => t.nodeId);
    const nodes2 = await this.nodeRepo.findByIds(nodeIds);
    const nodeIdSet = new Set(nodeIds);
    const edges2 = [];
    for (const nodeId of nodeIds) {
      const outgoing = await this.edgeRepo.findOutgoing(nodeId, edgeTypes);
      for (const edge of outgoing) {
        if (nodeIdSet.has(edge.targetId)) {
          edges2.push(edge);
        }
      }
    }
    return { nodes: nodes2, edges: edges2 };
  }
  // ============================================================================
  // Graph Statistics
  // ============================================================================
  /**
   * Calculate degree for a node
   */
  async getDegree(nodeId) {
    const incoming = await this.edgeRepo.findIncoming(nodeId);
    const outgoing = await this.edgeRepo.findOutgoing(nodeId);
    return {
      in: incoming.length,
      out: outgoing.length,
      total: incoming.length + outgoing.length
    };
  }
  /**
   * Find isolated nodes (no edges)
   */
  async findIsolatedNodes() {
    const allNodes = await this.nodeRepo.findAll();
    const isolated = [];
    for (const node of allNodes) {
      const edges2 = await this.edgeRepo.findConnected(node.nodeId);
      if (edges2.length === 0) {
        isolated.push(node);
      }
    }
    return isolated;
  }
  /**
   * Find nodes with high in-degree (potential hubs)
   */
  async findHighInDegreeNodes(threshold) {
    const minThreshold = threshold ?? this.config.moc?.defaultHubThreshold ?? 5;
    const allNodes = await this.nodeRepo.findAll();
    const results = [];
    for (const node of allNodes) {
      const incoming = await this.edgeRepo.findIncoming(node.nodeId);
      if (incoming.length >= minThreshold) {
        results.push({ node, inDegree: incoming.length });
      }
    }
    return results.sort((a, b) => b.inDegree - a.inDegree);
  }
  // ============================================================================
  // Connected Components
  // ============================================================================
  /**
   * Find connected components in the graph
   */
  async findConnectedComponents() {
    const allNodes = await this.nodeRepo.findAll();
    const visited = /* @__PURE__ */ new Set();
    const components = [];
    for (const node of allNodes) {
      if (visited.has(node.nodeId)) continue;
      const component = [];
      const queue = [node.nodeId];
      while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId)) continue;
        visited.add(currentId);
        component.push(currentId);
        const edges2 = await this.edgeRepo.findConnected(currentId);
        for (const edge of edges2) {
          const neighborId = edge.sourceId === currentId ? edge.targetId : edge.sourceId;
          if (!visited.has(neighborId)) {
            queue.push(neighborId);
          }
        }
      }
      if (component.length > 0) {
        components.push(component);
      }
    }
    return components.sort((a, b) => b.length - a.length);
  }
  /**
   * Get the component containing a specific node
   */
  async getComponentContaining(nodeId) {
    const visited = /* @__PURE__ */ new Set();
    const component = [];
    const queue = [nodeId];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || visited.has(currentId)) continue;
      visited.add(currentId);
      component.push(currentId);
      const edges2 = await this.edgeRepo.findConnected(currentId);
      for (const edge of edges2) {
        const neighborId = edge.sourceId === currentId ? edge.targetId : edge.sourceId;
        if (!visited.has(neighborId)) {
          queue.push(neighborId);
        }
      }
    }
    return component;
  }
};

// src/cli/utils.ts
var ZETTELSCRIPT_DIR = ".zettelscript";
var CONFIG_FILE = "config.yaml";
var DB_FILE = "zettelscript.db";
function findVaultRoot(startPath = process.cwd()) {
  let currentPath = path2.resolve(startPath);
  while (currentPath !== path2.dirname(currentPath)) {
    const zettelDir = path2.join(currentPath, ZETTELSCRIPT_DIR);
    if (fs2.existsSync(zettelDir)) {
      return currentPath;
    }
    currentPath = path2.dirname(currentPath);
  }
  return null;
}
function getZettelScriptDir(vaultPath) {
  return path2.join(vaultPath, ZETTELSCRIPT_DIR);
}
function getDbPath(vaultPath) {
  return path2.join(vaultPath, ZETTELSCRIPT_DIR, DB_FILE);
}
function getConfigPath(vaultPath) {
  return path2.join(vaultPath, ZETTELSCRIPT_DIR, CONFIG_FILE);
}
function loadConfig(vaultPath) {
  const configPath = getConfigPath(vaultPath);
  if (!fs2.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG, vault: { ...DEFAULT_CONFIG.vault, path: vaultPath } };
  }
  try {
    const content = fs2.readFileSync(configPath, "utf-8");
    const userConfig = parseYaml2(content);
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      vault: { ...DEFAULT_CONFIG.vault, ...userConfig.vault, path: vaultPath },
      database: { ...DEFAULT_CONFIG.database, ...userConfig.database },
      embeddings: { ...DEFAULT_CONFIG.embeddings, ...userConfig.embeddings },
      retrieval: { ...DEFAULT_CONFIG.retrieval, ...userConfig.retrieval },
      manuscript: { ...DEFAULT_CONFIG.manuscript, ...userConfig.manuscript },
      graph: { ...DEFAULT_CONFIG.graph, ...userConfig.graph },
      chunking: { ...DEFAULT_CONFIG.chunking, ...userConfig.chunking },
      discovery: {
        ...DEFAULT_CONFIG.discovery,
        ...userConfig.discovery,
        weights: { ...DEFAULT_CONFIG.discovery.weights, ...userConfig.discovery?.weights }
      },
      cache: { ...DEFAULT_CONFIG.cache, ...userConfig.cache },
      impact: { ...DEFAULT_CONFIG.impact, ...userConfig.impact }
    };
  } catch (error) {
    console.warn(`Warning: Could not parse config file: ${error}`);
    return { ...DEFAULT_CONFIG, vault: { ...DEFAULT_CONFIG.vault, path: vaultPath } };
  }
}
async function initContext(vaultPath) {
  const resolvedPath = vaultPath ? path2.resolve(vaultPath) : findVaultRoot();
  if (!resolvedPath) {
    throw new Error(
      'Not in a ZettelScript vault. Run "zettel init" to create one.'
    );
  }
  const config = loadConfig(resolvedPath);
  const dbPath = getDbPath(resolvedPath);
  const connectionManager = ConnectionManager.getInstance(dbPath);
  await connectionManager.initialize();
  const db = connectionManager.getDb();
  const sqlite = connectionManager.getSqlite();
  const nodeRepository = new NodeRepository(db);
  const edgeRepository = new EdgeRepository(db);
  const versionRepository = new VersionRepository(db);
  const chunkRepository = new ChunkRepository(db, sqlite);
  const mentionRepository = new MentionRepository(db);
  const pipeline = new IndexingPipeline({
    nodeRepository,
    edgeRepository,
    versionRepository
  });
  const graphEngine = new GraphEngine({
    nodeRepository,
    edgeRepository
  });
  return {
    vaultPath: resolvedPath,
    config,
    connectionManager,
    nodeRepository,
    edgeRepository,
    versionRepository,
    chunkRepository,
    mentionRepository,
    pipeline,
    graphEngine
  };
}
function formatDuration(ms) {
  if (ms < 1e3) {
    return `${ms}ms`;
  }
  if (ms < 6e4) {
    return `${(ms / 1e3).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 6e4);
  const seconds = (ms % 6e4 / 1e3).toFixed(1);
  return `${minutes}m ${seconds}s`;
}
var Spinner = class {
  frames = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
  frameIndex = 0;
  interval = null;
  message;
  constructor(message) {
    this.message = message;
  }
  start() {
    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stdout.write(`\r${frame} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }
  update(message) {
    this.message = message;
  }
  stop(finalMessage) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write("\r" + " ".repeat(this.message.length + 10) + "\r");
    if (finalMessage) {
      console.log(finalMessage);
    }
  }
};
function printTable(headers, rows, options = {}) {
  const { padding = 2 } = options;
  const widths = headers.map((h, i) => {
    const values = [h, ...rows.map((r) => r[i] || "")];
    return Math.max(...values.map((v) => v.length));
  });
  const headerLine = headers.map((h, i) => h.padEnd(widths[i] ?? 0)).join(" ".repeat(padding));
  console.log(headerLine);
  console.log("-".repeat(headerLine.length));
  for (const row of rows) {
    const line = row.map((cell, i) => (cell || "").padEnd(widths[i] ?? 0)).join(" ".repeat(padding));
    console.log(line);
  }
}

// src/cli/commands/init.ts
var initCommand = new Command("init").description("Initialize a ZettelScript vault in the current directory").option("-f, --force", "Overwrite existing initialization").option("--manuscript", "Enable manuscript mode with POV and timeline validation").action(async (options) => {
  const vaultPath = process.cwd();
  const zettelDir = getZettelScriptDir(vaultPath);
  if (fs3.existsSync(zettelDir) && !options.force) {
    const existingRoot = findVaultRoot(vaultPath);
    if (existingRoot) {
      console.log(`Already initialized at: ${existingRoot}`);
      console.log("Use --force to reinitialize.");
      return;
    }
  }
  console.log("Initializing ZettelScript vault...");
  try {
    fs3.mkdirSync(zettelDir, { recursive: true });
    console.log(`  Created ${path3.relative(vaultPath, zettelDir)}/`);
    const config = {
      ...DEFAULT_CONFIG,
      vault: {
        ...DEFAULT_CONFIG.vault,
        path: "."
      },
      manuscript: {
        ...DEFAULT_CONFIG.manuscript,
        enabled: options.manuscript || false
      }
    };
    const configPath = getConfigPath(vaultPath);
    fs3.writeFileSync(configPath, stringifyYaml3(config), "utf-8");
    console.log(`  Created ${path3.relative(vaultPath, configPath)}`);
    const dbPath = getDbPath(vaultPath);
    const manager = ConnectionManager.getInstance(dbPath);
    await manager.initialize();
    manager.close();
    ConnectionManager.resetInstance();
    console.log(`  Created ${path3.relative(vaultPath, dbPath)}`);
    const gitignorePath = path3.join(zettelDir, ".gitignore");
    fs3.writeFileSync(gitignorePath, "# Ignore database (regenerated from files)\nzettelscript.db\nzettelscript.db-*\n", "utf-8");
    console.log("\nZettelScript vault initialized!");
    console.log("\nNext steps:");
    console.log("  zettel index    Index all markdown files");
    console.log("  zettel watch    Watch for file changes");
    console.log("  zettel query    Query the graph");
    if (options.manuscript) {
      console.log("\nManuscript mode enabled:");
      console.log('  - Add "type: scene" to scene frontmatter');
      console.log('  - Add "pov: CharacterName" for POV tracking');
      console.log('  - Add "scene_order: N" for timeline ordering');
      console.log('  - Run "zettel validate --continuity" to check consistency');
    }
  } catch (error) {
    console.error("Failed to initialize:", error);
    process.exit(1);
  }
});

// src/cli/commands/index.ts
import { Command as Command2 } from "commander";

// src/storage/filesystem/reader.ts
import * as fs4 from "fs";
import * as path4 from "path";
import { createHash } from "crypto";

// src/core/logger.ts
var Logger = class _Logger {
  level;
  prefix;
  constructor(options = {}) {
    this.level = options.level ?? 1 /* INFO */;
    this.prefix = options.prefix ?? "";
  }
  /**
   * Set the log level
   */
  setLevel(level) {
    this.level = level;
  }
  /**
   * Get the current log level
   */
  getLevel() {
    return this.level;
  }
  /**
   * Format a log message with optional prefix
   */
  format(message) {
    return this.prefix ? `[${this.prefix}] ${message}` : message;
  }
  /**
   * Log a debug message
   */
  debug(message, ...args) {
    if (this.level <= 0 /* DEBUG */) {
      console.debug(this.format(message), ...args);
    }
  }
  /**
   * Log an info message
   */
  info(message, ...args) {
    if (this.level <= 1 /* INFO */) {
      console.log(this.format(message), ...args);
    }
  }
  /**
   * Log a warning message
   */
  warn(message, ...args) {
    if (this.level <= 2 /* WARN */) {
      console.warn(this.format(message), ...args);
    }
  }
  /**
   * Log an error message
   */
  error(message, ...args) {
    if (this.level <= 3 /* ERROR */) {
      console.error(this.format(message), ...args);
    }
  }
  /**
   * Create a child logger with a prefix
   */
  child(prefix) {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new _Logger({ level: this.level, prefix: childPrefix });
  }
};
var defaultLogger = new Logger();
function getLogger() {
  return defaultLogger;
}

// src/storage/filesystem/reader.ts
var DEFAULT_EXTENSIONS = [".md", ".markdown"];
var DEFAULT_EXCLUDE = [
  "node_modules",
  ".git",
  ".zettelscript",
  ".obsidian",
  ".vscode",
  ".idea"
];
function hashContent(content) {
  return createHash("sha256").update(content).digest("hex");
}
async function readFile(filePath, basePath) {
  try {
    const absolutePath = path4.isAbsolute(filePath) ? filePath : path4.join(basePath, filePath);
    const relativePath = path4.relative(basePath, absolutePath);
    const content = await fs4.promises.readFile(absolutePath, "utf-8");
    const stats = await fs4.promises.stat(absolutePath);
    return {
      path: absolutePath,
      relativePath,
      content,
      contentHash: hashContent(content),
      stats: {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      }
    };
  } catch (error) {
    throw new FileSystemError(`Failed to read file: ${error}`, filePath);
  }
}
function shouldExclude(relativePath, excludePatterns) {
  for (const pattern of excludePatterns) {
    if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
      );
      if (regex.test(relativePath)) return true;
    } else {
      if (relativePath === pattern || relativePath.startsWith(pattern + "/") || relativePath.startsWith(pattern + "\\")) {
        return true;
      }
      const segments = relativePath.split(/[/\\]/);
      if (segments.some((s) => s === pattern)) return true;
    }
  }
  return false;
}
async function* walkDirectory(basePath, options = {}) {
  const {
    extensions = DEFAULT_EXTENSIONS,
    excludePatterns = DEFAULT_EXCLUDE,
    maxDepth = Infinity
  } = options;
  const logger = getLogger().child("filesystem");
  async function* walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await fs4.promises.readdir(dir, { withFileTypes: true });
    } catch (error) {
      logger.error(`Error reading directory ${dir}: ${error}`);
      return;
    }
    for (const entry of entries) {
      const fullPath = path4.join(dir, entry.name);
      const relativePath = path4.relative(basePath, fullPath);
      if (shouldExclude(relativePath, excludePatterns)) continue;
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) {
        yield* walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const ext = path4.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          try {
            yield await readFile(fullPath, basePath);
          } catch (error) {
            logger.error(`Error reading file ${fullPath}: ${error}`);
          }
        }
      }
    }
  }
  yield* walk(basePath, 0);
}
async function getMarkdownFiles(basePath, options = {}) {
  const files = [];
  for await (const file of walkDirectory(basePath, options)) {
    files.push(file);
  }
  return files;
}

// src/indexer/batch.ts
async function fullIndex(pipeline, basePath, options = {}) {
  const { onProgress, clearExisting = false, ...walkOptions } = options;
  const files = await getMarkdownFiles(basePath, walkOptions);
  if (onProgress) {
    let current = 0;
    const total = files.length;
    const originalIndex = pipeline.indexFile.bind(pipeline);
    pipeline.indexFile = async (file) => {
      current++;
      onProgress(current, total, file.relativePath);
      return originalIndex(file);
    };
  }
  return pipeline.batchIndex(files);
}

// src/cli/commands/index.ts
var indexCommand = new Command2("index").description("Index all markdown files in the vault").option("-v, --verbose", "Show detailed output").option("--stats", "Show indexing statistics").action(async (options) => {
  try {
    const ctx = await initContext();
    console.log(`Indexing vault: ${ctx.vaultPath}`);
    const spinner = new Spinner("Scanning files...");
    spinner.start();
    let lastProgress = 0;
    const result = await fullIndex(ctx.pipeline, ctx.vaultPath, {
      excludePatterns: ctx.config.vault.excludePatterns,
      onProgress: (current, total, path16) => {
        if (current > lastProgress) {
          lastProgress = current;
          spinner.update(`Indexing ${current}/${total}: ${path16}`);
        }
      }
    });
    spinner.stop();
    console.log("\nIndexing complete:");
    console.log(`  Files processed: ${result.stats.totalFiles}`);
    console.log(`  Nodes created:   ${result.stats.nodeCount}`);
    console.log(`  Edges created:   ${result.stats.edgeCount}`);
    console.log(`  Unresolved:      ${result.stats.unresolvedCount}`);
    console.log(`  Ambiguous:       ${result.stats.ambiguousCount}`);
    console.log(`  Duration:        ${formatDuration(result.stats.durationMs)}`);
    if (result.errors.length > 0) {
      console.log(`
Errors (${result.errors.length}):`);
      for (const err of result.errors.slice(0, 10)) {
        console.log(`  ${err.path}: ${err.error}`);
      }
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more`);
      }
    }
    if (options.verbose) {
      const allUnresolved = result.indexed.flatMap(
        (r) => r.unresolved.map((u) => ({ path: r.node.path, link: u.target }))
      );
      if (allUnresolved.length > 0) {
        console.log(`
Unresolved links (${allUnresolved.length}):`);
        for (const u of allUnresolved.slice(0, 20)) {
          console.log(`  ${u.path}: [[${u.link}]]`);
        }
        if (allUnresolved.length > 20) {
          console.log(`  ... and ${allUnresolved.length - 20} more`);
        }
      }
      const allAmbiguous = result.indexed.flatMap(
        (r) => r.ambiguous.map((a) => ({ path: r.node.path, link: a.target }))
      );
      if (allAmbiguous.length > 0) {
        console.log(`
Ambiguous links (${allAmbiguous.length}):`);
        for (const a of allAmbiguous.slice(0, 20)) {
          console.log(`  ${a.path}: [[${a.link}]]`);
        }
        if (allAmbiguous.length > 20) {
          console.log(`  ... and ${allAmbiguous.length - 20} more`);
        }
      }
    }
    if (options.stats) {
      const stats = await ctx.pipeline.getStats();
      console.log("\nGraph statistics:");
      console.log("  Nodes by type:");
      for (const [type, count] of Object.entries(stats.nodesByType)) {
        console.log(`    ${type}: ${count}`);
      }
      console.log("  Edges by type:");
      for (const [type, count] of Object.entries(stats.edgesByType)) {
        console.log(`    ${type}: ${count}`);
      }
    }
    ctx.connectionManager.close();
  } catch (error) {
    console.error("Index failed:", error);
    process.exit(1);
  }
});

// src/cli/commands/watch.ts
import { Command as Command3 } from "commander";

// src/indexer/incremental.ts
import { EventEmitter as EventEmitter2 } from "events";

// src/storage/filesystem/watcher.ts
import { watch } from "chokidar";
import * as path5 from "path";
import { EventEmitter } from "events";
var DEFAULT_EXTENSIONS2 = [".md", ".markdown"];
var DEFAULT_EXCLUDE2 = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.zettelscript/**",
  "**/.obsidian/**",
  "**/.vscode/**",
  "**/.*"
];
var FileWatcher = class extends EventEmitter {
  watcher = null;
  basePath;
  options;
  debounceTimers = /* @__PURE__ */ new Map();
  pendingEvents = /* @__PURE__ */ new Map();
  constructor(options) {
    super();
    this.basePath = options.basePath;
    this.options = {
      extensions: DEFAULT_EXTENSIONS2,
      excludePatterns: DEFAULT_EXCLUDE2,
      debounceMs: 100,
      awaitWriteFinish: true,
      ...options
    };
  }
  /**
   * Start watching
   */
  start() {
    if (this.watcher) {
      return;
    }
    const patterns = this.options.extensions.map(
      (ext) => path5.join(this.basePath, "**", `*${ext}`)
    );
    this.watcher = watch(patterns, {
      ...this.options.excludePatterns != null && { ignored: this.options.excludePatterns },
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: this.options.awaitWriteFinish ? { stabilityThreshold: 100, pollInterval: 50 } : false,
      usePolling: false
    });
    this.watcher.on("add", (filePath) => this.handleEvent("add", filePath)).on("change", (filePath) => this.handleEvent("change", filePath)).on("unlink", (filePath) => this.handleEvent("unlink", filePath)).on("error", (error) => this.emit("error", error)).on("ready", () => this.emit("ready"));
  }
  /**
   * Stop watching
   */
  async stop() {
    if (!this.watcher) {
      return;
    }
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.pendingEvents.clear();
    await this.watcher.close();
    this.watcher = null;
  }
  /**
   * Handle a file event with debouncing
   */
  handleEvent(type, filePath) {
    const relativePath = path5.relative(this.basePath, filePath);
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    const event = { type, path: filePath, relativePath };
    const pending = this.pendingEvents.get(filePath);
    if (pending?.type === "add" && type === "change") {
      event.type = "add";
    }
    this.pendingEvents.set(filePath, event);
    const timer = setTimeout(() => {
      const finalEvent = this.pendingEvents.get(filePath);
      if (finalEvent) {
        this.pendingEvents.delete(filePath);
        this.debounceTimers.delete(filePath);
        this.emit("file", finalEvent);
        this.emit(finalEvent.type, finalEvent);
      }
    }, this.options.debounceMs);
    this.debounceTimers.set(filePath, timer);
  }
  /**
   * Check if watching
   */
  isWatching() {
    return this.watcher !== null;
  }
  /**
   * Get watched paths
   */
  getWatched() {
    if (!this.watcher) {
      return {};
    }
    return this.watcher.getWatched();
  }
};

// src/indexer/incremental.ts
var IncrementalIndexer = class extends EventEmitter2 {
  watcher;
  pipeline;
  basePath;
  processing = /* @__PURE__ */ new Set();
  constructor(options) {
    super();
    this.basePath = options.basePath;
    this.pipeline = options.pipeline;
    this.watcher = new FileWatcher({
      ...options,
      basePath: this.basePath
    });
    this.watcher.on("file", this.handleFileEvent.bind(this));
    this.watcher.on("error", (error) => this.emit("error", error));
    this.watcher.on("ready", () => this.emit("ready"));
  }
  /**
   * Start watching and indexing
   */
  start() {
    this.watcher.start();
  }
  /**
   * Stop watching
   */
  async stop() {
    await this.watcher.stop();
  }
  /**
   * Handle a file event
   */
  async handleFileEvent(event) {
    if (this.processing.has(event.path)) {
      return;
    }
    this.processing.add(event.path);
    try {
      switch (event.type) {
        case "add":
        case "change":
          await this.handleAddOrChange(event);
          break;
        case "unlink":
          await this.handleUnlink(event);
          break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit("event", {
        type: "error",
        path: event.relativePath,
        error: errorMessage
      });
    } finally {
      this.processing.delete(event.path);
    }
  }
  /**
   * Handle file add or change
   */
  async handleAddOrChange(event) {
    const file = await readFile(event.path, this.basePath);
    const result = await this.pipeline.indexFile(file);
    this.emit("event", {
      type: "indexed",
      path: event.relativePath,
      result
    });
    this.pipeline.clearResolverCache();
  }
  /**
   * Handle file deletion
   */
  async handleUnlink(event) {
    await this.pipeline.removeByPath(event.relativePath);
    this.emit("event", {
      type: "removed",
      path: event.relativePath
    });
    this.pipeline.clearResolverCache();
  }
  /**
   * Check if watching
   */
  isWatching() {
    return this.watcher.isWatching();
  }
};
function createIncrementalIndexer(basePath, pipeline, options = {}) {
  return new IncrementalIndexer({
    ...options,
    basePath,
    pipeline
  });
}

// src/cli/commands/watch.ts
var watchCommand = new Command3("watch").description("Watch for file changes and incrementally index").option("-v, --verbose", "Show detailed output").action(async (options) => {
  try {
    const ctx = await initContext();
    console.log(`Watching vault: ${ctx.vaultPath}`);
    console.log("Press Ctrl+C to stop.\n");
    const indexer = createIncrementalIndexer(ctx.vaultPath, ctx.pipeline, {
      excludePatterns: ctx.config.vault.excludePatterns.map((p) => `**/${p}`)
    });
    indexer.on("ready", () => {
      console.log("Watcher ready. Listening for changes...\n");
    });
    indexer.on("event", (event) => {
      const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
      switch (event.type) {
        case "indexed":
          console.log(`[${timestamp}] Indexed: ${event.path}`);
          if (options.verbose && event.result) {
            const { edges: edges2, unresolved, ambiguous } = event.result;
            if (edges2.length > 0) {
              console.log(`  Links: ${edges2.length}`);
            }
            if (unresolved.length > 0) {
              console.log(`  Unresolved: ${unresolved.map((u) => u.target).join(", ")}`);
            }
            if (ambiguous.length > 0) {
              console.log(`  Ambiguous: ${ambiguous.map((a) => a.target).join(", ")}`);
            }
          }
          break;
        case "removed":
          console.log(`[${timestamp}] Removed: ${event.path}`);
          break;
        case "error":
          console.log(`[${timestamp}] Error: ${event.path}`);
          console.log(`  ${event.error}`);
          break;
      }
    });
    indexer.on("error", (error) => {
      console.error("Watcher error:", error.message);
    });
    indexer.start();
    const shutdown = async () => {
      console.log("\nStopping watcher...");
      await indexer.stop();
      ctx.connectionManager.close();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Watch failed:", error);
    process.exit(1);
  }
});

// src/cli/commands/query.ts
import { Command as Command4 } from "commander";

// src/core/validation.ts
function parseIntSafe(value, defaultValue) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}
function parseFloatSafe(value, defaultValue) {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

// src/cli/commands/query.ts
var queryCommand = new Command4("query").description("Query the knowledge graph");
queryCommand.command("backlinks <node>").description("Show incoming links to a node").option("-l, --limit <n>", "Maximum results", "20").action(async (nodeIdentifier, options) => {
  try {
    const ctx = await initContext();
    const limit = parseIntSafe(options.limit, ctx.config.search.defaultLimit);
    let node = await ctx.nodeRepository.findByPath(nodeIdentifier);
    if (!node) {
      const nodes2 = await ctx.nodeRepository.findByTitle(nodeIdentifier);
      node = nodes2[0] ?? null;
    }
    if (!node) {
      const nodes2 = await ctx.nodeRepository.findByTitleOrAlias(nodeIdentifier);
      node = nodes2[0] ?? null;
    }
    if (!node) {
      console.log(`Node not found: ${nodeIdentifier}`);
      ctx.connectionManager.close();
      return;
    }
    console.log(`Backlinks to: ${node.title} (${node.path})
`);
    const backlinks = await ctx.graphEngine.getBacklinks(node.nodeId);
    if (backlinks.length === 0) {
      console.log("No backlinks found.");
    } else {
      const rows = backlinks.slice(0, limit).map((bl) => [
        bl.sourceNode.title,
        bl.sourceNode.type,
        bl.sourceNode.path
      ]);
      printTable(["Title", "Type", "Path"], rows);
      if (backlinks.length > limit) {
        console.log(`
... and ${backlinks.length - limit} more`);
      }
    }
    ctx.connectionManager.close();
  } catch (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }
});
queryCommand.command("neighbors <node>").description("Show connected nodes").option("-l, --limit <n>", "Maximum results", "20").option("-d, --direction <dir>", "Filter direction (in/out/both)", "both").action(async (nodeIdentifier, options) => {
  try {
    const ctx = await initContext();
    const limit = parseIntSafe(options.limit, ctx.config.search.defaultLimit);
    let node = await ctx.nodeRepository.findByPath(nodeIdentifier);
    if (!node) {
      const nodes2 = await ctx.nodeRepository.findByTitle(nodeIdentifier);
      node = nodes2[0] ?? null;
    }
    if (!node) {
      const nodes2 = await ctx.nodeRepository.findByTitleOrAlias(nodeIdentifier);
      node = nodes2[0] ?? null;
    }
    if (!node) {
      console.log(`Node not found: ${nodeIdentifier}`);
      ctx.connectionManager.close();
      return;
    }
    console.log(`Neighbors of: ${node.title} (${node.path})
`);
    const neighbors = await ctx.graphEngine.getNeighbors(node.nodeId);
    const filtered = neighbors.filter((n) => {
      if (options.direction === "in") return n.direction === "incoming";
      if (options.direction === "out") return n.direction === "outgoing";
      return true;
    });
    if (filtered.length === 0) {
      console.log("No neighbors found.");
    } else {
      const rows = filtered.slice(0, limit).map((n) => [
        n.direction === "incoming" ? "\u2190" : "\u2192",
        n.node.title,
        n.node.type,
        n.edge.edgeType
      ]);
      printTable(["Dir", "Title", "Type", "Edge Type"], rows);
      if (filtered.length > limit) {
        console.log(`
... and ${filtered.length - limit} more`);
      }
    }
    ctx.connectionManager.close();
  } catch (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }
});
queryCommand.command("path <from> <to>").description("Find shortest path between nodes").action(async (fromIdentifier, toIdentifier) => {
  try {
    const ctx = await initContext();
    let fromNode = await ctx.nodeRepository.findByPath(fromIdentifier);
    if (!fromNode) {
      const nodes2 = await ctx.nodeRepository.findByTitle(fromIdentifier);
      fromNode = nodes2[0] ?? null;
    }
    if (!fromNode) {
      console.log(`Node not found: ${fromIdentifier}`);
      ctx.connectionManager.close();
      return;
    }
    let toNode = await ctx.nodeRepository.findByPath(toIdentifier);
    if (!toNode) {
      const nodes2 = await ctx.nodeRepository.findByTitle(toIdentifier);
      toNode = nodes2[0] ?? null;
    }
    if (!toNode) {
      console.log(`Node not found: ${toIdentifier}`);
      ctx.connectionManager.close();
      return;
    }
    console.log(`Path from "${fromNode.title}" to "${toNode.title}":
`);
    const path16 = await ctx.graphEngine.findShortestPath(fromNode.nodeId, toNode.nodeId);
    if (!path16) {
      console.log("No path found.");
    } else {
      const pathNodes = await ctx.nodeRepository.findByIds(path16);
      const nodeMap = new Map(pathNodes.map((n) => [n.nodeId, n]));
      for (let i = 0; i < path16.length; i++) {
        const nodeId = path16[i];
        if (nodeId) {
          const node = nodeMap.get(nodeId);
          const prefix = i === 0 ? "\u2192" : i === path16.length - 1 ? "\u25C9" : "\u2193";
          console.log(`  ${prefix} ${node?.title || nodeId}`);
        }
      }
      console.log(`
Path length: ${path16.length - 1} hops`);
    }
    ctx.connectionManager.close();
  } catch (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }
});
queryCommand.command("stats").description("Show graph statistics").action(async () => {
  try {
    const ctx = await initContext();
    const stats = await ctx.pipeline.getStats();
    const dbStats = ctx.connectionManager.getStats();
    console.log("Graph Statistics\n");
    console.log(`Total nodes:  ${stats.nodeCount}`);
    console.log(`Total edges:  ${stats.edgeCount}`);
    console.log(`Total chunks: ${dbStats.chunkCount}`);
    console.log(`DB size:      ${(dbStats.dbSizeBytes / 1024).toFixed(1)}KB`);
    console.log("\nNodes by type:");
    for (const [type, count] of Object.entries(stats.nodesByType).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${type}: ${count}`);
    }
    console.log("\nEdges by type:");
    for (const [type, count] of Object.entries(stats.edgesByType).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${type}: ${count}`);
    }
    const components = await ctx.graphEngine.findConnectedComponents();
    const isolatedCount = components.filter((c) => c.length === 1).length;
    if (isolatedCount > 0) {
      console.log(`
Isolated nodes: ${isolatedCount}`);
    }
    ctx.connectionManager.close();
  } catch (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }
});
queryCommand.command("orphans").description("Find nodes with no links").option("-l, --limit <n>", "Maximum results", "20").action(async (options) => {
  try {
    const ctx = await initContext();
    const limit = parseIntSafe(options.limit, ctx.config.search.defaultLimit);
    const isolated = await ctx.graphEngine.findIsolatedNodes();
    if (isolated.length === 0) {
      console.log("No orphan nodes found.");
    } else {
      console.log(`Orphan nodes (${isolated.length}):
`);
      const rows = isolated.slice(0, limit).map((n) => [
        n.title,
        n.type,
        n.path
      ]);
      printTable(["Title", "Type", "Path"], rows);
      if (isolated.length > limit) {
        console.log(`
... and ${isolated.length - limit} more`);
      }
    }
    ctx.connectionManager.close();
  } catch (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }
});
queryCommand.command("hubs").description("Find highly-connected nodes").option("-l, --limit <n>", "Maximum results", "10").option("-t, --threshold <n>", "Minimum connections", "5").action(async (options) => {
  try {
    const ctx = await initContext();
    const limit = parseIntSafe(options.limit, 10);
    const threshold = parseIntSafe(options.threshold, ctx.config.moc.defaultHubThreshold);
    const hubs = await ctx.graphEngine.findHighInDegreeNodes(threshold);
    if (hubs.length === 0) {
      console.log(`No nodes with ${threshold}+ incoming links.`);
    } else {
      console.log(`Hub nodes (${hubs.length}):
`);
      const rows = hubs.slice(0, limit).map((h) => [
        h.node.title,
        h.node.type,
        h.inDegree.toString()
      ]);
      printTable(["Title", "Type", "Incoming Links"], rows);
      if (hubs.length > limit) {
        console.log(`
... and ${hubs.length - limit} more`);
      }
    }
    ctx.connectionManager.close();
  } catch (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }
});

// src/cli/commands/validate.ts
import { Command as Command5 } from "commander";

// src/validation/link-validator.ts
var LinkValidator = class {
  nodeRepo;
  edgeRepo;
  constructor(options) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
  }
  /**
   * Validate all links in the graph
   */
  async validate() {
    const broken = [];
    const ambiguous = [];
    let valid = 0;
    const nodes2 = await this.nodeRepo.findAll();
    const nodeMap = new Map(nodes2.map((n) => [n.nodeId, n]));
    const edges2 = await this.edgeRepo.findByType("explicit_link");
    for (const edge of edges2) {
      const sourceNode = nodeMap.get(edge.sourceId);
      const targetNode = nodeMap.get(edge.targetId);
      if (!sourceNode) {
        continue;
      }
      if (!targetNode) {
        const attributes = edge.attributes;
        broken.push({
          sourceId: edge.sourceId,
          sourcePath: sourceNode.path,
          targetText: attributes?.displayText || edge.targetId,
          ...attributes?.position?.start != null && { spanStart: attributes.position.start },
          ...attributes?.position?.end != null && { spanEnd: attributes.position.end }
        });
      } else {
        valid++;
      }
    }
    return {
      broken,
      ambiguous,
      valid,
      total: edges2.length
    };
  }
  /**
   * Validate links for a specific node
   */
  async validateNode(nodeId) {
    const broken = [];
    let valid = 0;
    const node = await this.nodeRepo.findById(nodeId);
    if (!node) {
      return { broken, valid: 0 };
    }
    const edges2 = await this.edgeRepo.findOutgoing(nodeId, ["explicit_link"]);
    for (const edge of edges2) {
      const targetNode = await this.nodeRepo.findById(edge.targetId);
      if (!targetNode) {
        const attributes = edge.attributes;
        broken.push({
          sourceId: nodeId,
          sourcePath: node.path,
          targetText: attributes?.displayText || edge.targetId,
          ...attributes?.position?.start != null && { spanStart: attributes.position.start },
          ...attributes?.position?.end != null && { spanEnd: attributes.position.end }
        });
      } else {
        valid++;
      }
    }
    return { broken, valid };
  }
  /**
   * Find all nodes that link to a given node
   */
  async findLinkers(targetNodeId) {
    const edges2 = await this.edgeRepo.findBacklinks(targetNodeId);
    const sourceIds = edges2.map((e) => e.sourceId);
    return this.nodeRepo.findByIds(sourceIds);
  }
  /**
   * Check if a link would create a cycle
   */
  async wouldCreateCycle(sourceId, targetId, maxDepth = 10) {
    const visited = /* @__PURE__ */ new Set([targetId]);
    let frontier = [targetId];
    for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
      const nextFrontier = [];
      for (const nodeId of frontier) {
        const outgoing = await this.edgeRepo.findOutgoing(nodeId, ["explicit_link"]);
        for (const edge of outgoing) {
          if (edge.targetId === sourceId) {
            return true;
          }
          if (!visited.has(edge.targetId)) {
            visited.add(edge.targetId);
            nextFrontier.push(edge.targetId);
          }
        }
      }
      frontier = nextFrontier;
    }
    return false;
  }
  /**
   * Get link statistics
   */
  async getStats() {
    const nodes2 = await this.nodeRepo.findAll();
    const edges2 = await this.edgeRepo.findByType("explicit_link");
    const outgoingCount = /* @__PURE__ */ new Map();
    const incomingCount = /* @__PURE__ */ new Map();
    for (const edge of edges2) {
      outgoingCount.set(edge.sourceId, (outgoingCount.get(edge.sourceId) || 0) + 1);
      incomingCount.set(edge.targetId, (incomingCount.get(edge.targetId) || 0) + 1);
    }
    let nodesWithNoLinks = 0;
    let nodesWithNoIncoming = 0;
    let nodesWithNoOutgoing = 0;
    for (const node of nodes2) {
      const out = outgoingCount.get(node.nodeId) || 0;
      const inc = incomingCount.get(node.nodeId) || 0;
      if (out === 0 && inc === 0) nodesWithNoLinks++;
      if (inc === 0) nodesWithNoIncoming++;
      if (out === 0) nodesWithNoOutgoing++;
    }
    return {
      totalNodes: nodes2.length,
      totalLinks: edges2.length,
      avgLinksPerNode: nodes2.length > 0 ? edges2.length / nodes2.length : 0,
      nodesWithNoLinks,
      nodesWithNoIncoming,
      nodesWithNoOutgoing
    };
  }
};

// src/validation/schema-validator.ts
import Ajv from "ajv";
import { Type as Type2 } from "@sinclair/typebox";
var BaseFrontmatterSchema = Type2.Object({
  id: Type2.Optional(Type2.String()),
  title: Type2.Optional(Type2.String()),
  type: Type2.Optional(Type2.Union([
    Type2.Literal("note"),
    Type2.Literal("scene"),
    Type2.Literal("character"),
    Type2.Literal("location"),
    Type2.Literal("object"),
    Type2.Literal("event"),
    Type2.Literal("concept"),
    Type2.Literal("moc"),
    Type2.Literal("timeline"),
    Type2.Literal("draft")
  ])),
  aliases: Type2.Optional(Type2.Array(Type2.String())),
  tags: Type2.Optional(Type2.Array(Type2.String())),
  created: Type2.Optional(Type2.String()),
  updated: Type2.Optional(Type2.String())
}, { additionalProperties: true });
var SceneFrontmatterSchema = Type2.Object({
  type: Type2.Literal("scene"),
  pov: Type2.Optional(Type2.String()),
  scene_order: Type2.Optional(Type2.Number()),
  timeline_position: Type2.Optional(Type2.String()),
  characters: Type2.Optional(Type2.Array(Type2.String())),
  locations: Type2.Optional(Type2.Array(Type2.String()))
}, { additionalProperties: true });
var CharacterFrontmatterSchema = Type2.Object({
  type: Type2.Literal("character"),
  aliases: Type2.Optional(Type2.Array(Type2.String())),
  description: Type2.Optional(Type2.String()),
  traits: Type2.Optional(Type2.Array(Type2.String()))
}, { additionalProperties: true });
var SchemaValidator = class {
  nodeRepo;
  ajv;
  validators;
  constructor(options) {
    this.nodeRepo = options.nodeRepository;
    this.ajv = new Ajv({ allErrors: true, strict: false });
    this.validators = /* @__PURE__ */ new Map();
    this.validators.set("base", this.ajv.compile(BaseFrontmatterSchema));
    this.validators.set("scene", this.ajv.compile(SceneFrontmatterSchema));
    this.validators.set("character", this.ajv.compile(CharacterFrontmatterSchema));
    if (options.customSchemas) {
      for (const [type, schema] of Object.entries(options.customSchemas)) {
        this.validators.set(type, this.ajv.compile(schema));
      }
    }
  }
  /**
   * Validate all nodes
   */
  async validate() {
    const errors = [];
    const warnings = [];
    let valid = 0;
    const nodes2 = await this.nodeRepo.findAll();
    for (const node of nodes2) {
      const result = this.validateNode(node);
      if (result.errors.length === 0) {
        valid++;
      }
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }
    return {
      errors,
      warnings,
      valid,
      total: nodes2.length
    };
  }
  /**
   * Validate a single node's frontmatter
   */
  validateNode(node) {
    const errors = [];
    const warnings = [];
    const metadata = node.metadata;
    if (!metadata) {
      return { errors, warnings };
    }
    const baseValidator = this.validators.get("base");
    if (baseValidator && !baseValidator(metadata)) {
      for (const err of baseValidator.errors || []) {
        errors.push({
          nodeId: node.nodeId,
          path: node.path,
          field: err.instancePath || "root",
          message: err.message || "Validation failed",
          value: err.data
        });
      }
    }
    const typeValidator = this.validators.get(node.type);
    if (typeValidator && metadata.type === node.type) {
      if (!typeValidator(metadata)) {
        for (const err of typeValidator.errors || []) {
          errors.push({
            nodeId: node.nodeId,
            path: node.path,
            field: err.instancePath || "root",
            message: err.message || "Validation failed",
            value: err.data
          });
        }
      }
    }
    if (node.type === "scene") {
      if (!metadata.pov) {
        warnings.push({
          nodeId: node.nodeId,
          path: node.path,
          field: "pov",
          message: "Scene missing POV character"
        });
      }
      if (metadata.scene_order === void 0) {
        warnings.push({
          nodeId: node.nodeId,
          path: node.path,
          field: "scene_order",
          message: "Scene missing scene_order for timeline tracking"
        });
      }
    }
    if (node.type === "character") {
      if (!metadata.aliases || metadata.aliases.length === 0) {
        warnings.push({
          nodeId: node.nodeId,
          path: node.path,
          field: "aliases",
          message: "Character has no aliases defined"
        });
      }
    }
    return { errors, warnings };
  }
  /**
   * Add a custom schema for a type
   */
  addSchema(type, schema) {
    this.validators.set(type, this.ajv.compile(schema));
  }
  /**
   * Get validation summary by type
   */
  async getSummary() {
    const nodes2 = await this.nodeRepo.findAll();
    const summary = {};
    for (const node of nodes2) {
      if (!summary[node.type]) {
        summary[node.type] = { total: 0, valid: 0, errors: 0 };
      }
      const typeStats = summary[node.type];
      if (typeStats) {
        typeStats.total++;
        const result = this.validateNode(node);
        if (result.errors.length === 0) {
          typeStats.valid++;
        } else {
          typeStats.errors++;
        }
      }
    }
    return summary;
  }
};

// src/validation/continuity-checker.ts
var ContinuityChecker = class {
  nodeRepo;
  edgeRepo;
  config;
  constructor(options) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
    this.config = options.config;
  }
  /**
   * Run all continuity checks
   */
  async check() {
    const issues = [];
    const scenes = await this.nodeRepo.findByType("scene");
    if (scenes.length === 0) {
      return {
        issues: [],
        stats: {
          scenesChecked: 0,
          povIssues: 0,
          timelineIssues: 0,
          setupPayoffIssues: 0,
          knowledgeIssues: 0
        }
      };
    }
    const sceneInfos = scenes.map((s) => this.extractSceneInfo(s));
    if (this.config.validatePov) {
      const povIssues = await this.checkPovConsistency(scenes, sceneInfos);
      issues.push(...povIssues);
    }
    if (this.config.validateTimeline) {
      const timelineIssues = await this.checkTimelineConsistency(scenes, sceneInfos);
      issues.push(...timelineIssues);
    }
    if (this.config.validateSetupPayoff) {
      const setupPayoffIssues = await this.checkSetupPayoff(scenes);
      issues.push(...setupPayoffIssues);
    }
    return {
      issues,
      stats: {
        scenesChecked: scenes.length,
        povIssues: issues.filter((i) => i.type === "pov_leakage").length,
        timelineIssues: issues.filter((i) => i.type === "timeline_inconsistency").length,
        setupPayoffIssues: issues.filter((i) => i.type === "missing_setup" || i.type === "orphaned_payoff").length,
        knowledgeIssues: issues.filter((i) => i.type === "character_knowledge").length
      }
    };
  }
  /**
   * Extract scene info from node metadata
   */
  extractSceneInfo(node) {
    const metadata = node.metadata;
    return {
      nodeId: node.nodeId,
      sceneOrder: metadata?.scene_order ?? Infinity,
      ...metadata?.timeline_position != null && { timelinePosition: metadata.timeline_position },
      ...metadata?.pov != null && { pov: metadata.pov },
      characters: metadata?.characters ?? [],
      locations: metadata?.locations ?? []
    };
  }
  /**
   * Check POV consistency - ensure POV character knows information they reveal
   */
  async checkPovConsistency(scenes, sceneInfos) {
    const issues = [];
    const sortedScenes = [...sceneInfos].sort((a, b) => a.sceneOrder - b.sceneOrder);
    const characterKnowledge = /* @__PURE__ */ new Map();
    for (const scene of sortedScenes) {
      const sceneNode = scenes.find((s) => s.nodeId === scene.nodeId);
      if (!sceneNode) continue;
      if (!scene.pov) {
        issues.push({
          type: "pov_leakage",
          severity: "warning",
          nodeId: scene.nodeId,
          description: "Scene has no POV character defined",
          suggestion: 'Add "pov: CharacterName" to frontmatter'
        });
        continue;
      }
      const outgoing = await this.edgeRepo.findOutgoing(scene.nodeId);
      for (const edge of outgoing) {
        const targetNode = await this.nodeRepo.findById(edge.targetId);
        if (!targetNode) continue;
        if (targetNode.type === "character" && targetNode.title !== scene.pov) {
          if (!scene.characters.includes(targetNode.title)) {
            issues.push({
              type: "pov_leakage",
              severity: "info",
              nodeId: scene.nodeId,
              description: `POV (${scene.pov}) references ${targetNode.title} who is not listed in scene characters`,
              suggestion: `Add "${targetNode.title}" to characters list if they are present`
            });
          }
        }
      }
      for (const char of scene.characters) {
        if (!characterKnowledge.has(char)) {
          characterKnowledge.set(char, /* @__PURE__ */ new Set());
        }
        characterKnowledge.get(char)?.add(scene.nodeId);
      }
    }
    return issues;
  }
  /**
   * Check timeline consistency - ensure scene_order is sequential and logical
   */
  async checkTimelineConsistency(scenes, sceneInfos) {
    const issues = [];
    const withoutOrder = sceneInfos.filter((s) => s.sceneOrder === Infinity);
    for (const scene of withoutOrder) {
      const sceneNode = scenes.find((s) => s.nodeId === scene.nodeId);
      issues.push({
        type: "timeline_inconsistency",
        severity: "warning",
        nodeId: scene.nodeId,
        description: `Scene "${sceneNode?.title}" has no scene_order`,
        suggestion: 'Add "scene_order: N" to frontmatter for timeline tracking'
      });
    }
    const orderCounts = /* @__PURE__ */ new Map();
    for (const scene of sceneInfos) {
      if (scene.sceneOrder !== Infinity) {
        const existing = orderCounts.get(scene.sceneOrder) || [];
        existing.push(scene.nodeId);
        orderCounts.set(scene.sceneOrder, existing);
      }
    }
    for (const [order, nodeIds] of orderCounts) {
      if (nodeIds.length > 1) {
        for (const nodeId of nodeIds) {
          const sceneNode = scenes.find((s) => s.nodeId === nodeId);
          issues.push({
            type: "timeline_inconsistency",
            severity: "error",
            nodeId,
            description: `Scene "${sceneNode?.title}" has duplicate scene_order ${order}`,
            suggestion: "Ensure each scene has a unique scene_order"
          });
        }
      }
    }
    const orderedScenes = sceneInfos.filter((s) => s.sceneOrder !== Infinity).sort((a, b) => a.sceneOrder - b.sceneOrder);
    for (let i = 1; i < orderedScenes.length; i++) {
      const prev = orderedScenes[i - 1];
      const curr = orderedScenes[i];
      if (prev && curr) {
        const gap = curr.sceneOrder - prev.sceneOrder;
        if (gap > 10) {
          issues.push({
            type: "timeline_inconsistency",
            severity: "info",
            nodeId: curr.nodeId,
            description: `Large gap (${gap}) in scene_order between scenes`,
            suggestion: "Consider renumbering scenes for clarity"
          });
        }
      }
    }
    return issues;
  }
  /**
   * Check setup/payoff consistency using edges
   */
  async checkSetupPayoff(_scenes) {
    const issues = [];
    const setupPayoffEdges = await this.edgeRepo.findByType("setup_payoff");
    const setups = /* @__PURE__ */ new Set();
    const payoffs = /* @__PURE__ */ new Set();
    for (const edge of setupPayoffEdges) {
      setups.add(edge.sourceId);
      payoffs.add(edge.targetId);
    }
    for (const setupId of setups) {
      const hasPayoff = setupPayoffEdges.some((e) => e.sourceId === setupId);
      if (!hasPayoff) {
        const node = await this.nodeRepo.findById(setupId);
        if (node) {
          issues.push({
            type: "orphaned_payoff",
            severity: "warning",
            nodeId: setupId,
            description: `Setup in "${node.title}" has no linked payoff`,
            suggestion: "Ensure this setup is resolved later in the narrative"
          });
        }
      }
    }
    for (const payoffId of payoffs) {
      const hasSetup = setupPayoffEdges.some((e) => e.targetId === payoffId);
      if (!hasSetup) {
        const node = await this.nodeRepo.findById(payoffId);
        if (node) {
          issues.push({
            type: "missing_setup",
            severity: "warning",
            nodeId: payoffId,
            description: `Payoff in "${node.title}" has no linked setup`,
            suggestion: "Ensure this payoff is properly foreshadowed earlier"
          });
        }
      }
    }
    return issues;
  }
  /**
   * Check if a character could know about something at a given scene
   */
  async canCharacterKnow(characterName, informationNodeId, atSceneOrder) {
    const scenes = await this.nodeRepo.findByType("scene");
    for (const scene of scenes) {
      const metadata = scene.metadata;
      const sceneOrder = metadata?.scene_order ?? Infinity;
      if (sceneOrder > atSceneOrder) continue;
      const characters = metadata?.characters ?? [];
      if (!characters.includes(characterName)) continue;
      const edges2 = await this.edgeRepo.findOutgoing(scene.nodeId);
      if (edges2.some((e) => e.targetId === informationNodeId)) {
        return true;
      }
    }
    return false;
  }
};

// src/cli/commands/validate.ts
var validateCommand = new Command5("validate").description("Validate the vault").option("--links", "Check for broken and ambiguous links").option("--schema", "Validate frontmatter schema").option("--continuity", "Check manuscript continuity (POV, timeline)").option("--all", "Run all validations").option("-v, --verbose", "Show detailed output").action(async (options) => {
  try {
    const ctx = await initContext();
    const runAll = options.all || !options.links && !options.schema && !options.continuity;
    let hasErrors = false;
    if (runAll || options.links) {
      console.log("Checking links...\n");
      const linkValidator = new LinkValidator({
        nodeRepository: ctx.nodeRepository,
        edgeRepository: ctx.edgeRepository
      });
      const linkResult = await linkValidator.validate();
      if (linkResult.broken.length === 0 && linkResult.ambiguous.length === 0) {
        console.log("  \u2713 All links valid\n");
      } else {
        if (linkResult.broken.length > 0) {
          hasErrors = true;
          console.log(`  \u2717 Broken links: ${linkResult.broken.length}`);
          if (options.verbose) {
            for (const b of linkResult.broken.slice(0, 10)) {
              console.log(`    ${b.sourcePath}: [[${b.targetText}]]`);
            }
            if (linkResult.broken.length > 10) {
              console.log(`    ... and ${linkResult.broken.length - 10} more`);
            }
          }
        }
        if (linkResult.ambiguous.length > 0) {
          console.log(`  ! Ambiguous links: ${linkResult.ambiguous.length}`);
          if (options.verbose) {
            for (const a of linkResult.ambiguous.slice(0, 10)) {
              console.log(`    ${a.sourcePath}: [[${a.targetText}]] \u2192 ${a.candidates.length} matches`);
            }
          }
        }
        console.log("");
      }
    }
    if (runAll || options.schema) {
      console.log("Validating schema...\n");
      const schemaValidator = new SchemaValidator({
        nodeRepository: ctx.nodeRepository
      });
      const schemaResult = await schemaValidator.validate();
      if (schemaResult.errors.length === 0) {
        console.log("  \u2713 All frontmatter valid\n");
      } else {
        hasErrors = true;
        console.log(`  \u2717 Schema errors: ${schemaResult.errors.length}`);
        if (options.verbose) {
          for (const e of schemaResult.errors.slice(0, 10)) {
            console.log(`    ${e.path}: ${e.message}`);
          }
          if (schemaResult.errors.length > 10) {
            console.log(`    ... and ${schemaResult.errors.length - 10} more`);
          }
        }
        console.log("");
      }
    }
    if ((runAll || options.continuity) && ctx.config.manuscript.enabled) {
      console.log("Checking continuity...\n");
      const continuityChecker = new ContinuityChecker({
        nodeRepository: ctx.nodeRepository,
        edgeRepository: ctx.edgeRepository,
        config: ctx.config.manuscript
      });
      const continuityResult = await continuityChecker.check();
      const errors = continuityResult.issues.filter((i) => i.severity === "error");
      const warnings = continuityResult.issues.filter((i) => i.severity === "warning");
      if (errors.length === 0 && warnings.length === 0) {
        console.log("  \u2713 No continuity issues\n");
      } else {
        if (errors.length > 0) {
          hasErrors = true;
          console.log(`  \u2717 Continuity errors: ${errors.length}`);
          if (options.verbose) {
            for (const e of errors.slice(0, 10)) {
              console.log(`    ${e.nodeId}: ${e.description}`);
              if (e.suggestion) {
                console.log(`      Suggestion: ${e.suggestion}`);
              }
            }
          }
        }
        if (warnings.length > 0) {
          console.log(`  ! Continuity warnings: ${warnings.length}`);
          if (options.verbose) {
            for (const w of warnings.slice(0, 10)) {
              console.log(`    ${w.nodeId}: ${w.description}`);
            }
          }
        }
        console.log("");
      }
    } else if ((runAll || options.continuity) && !ctx.config.manuscript.enabled) {
      console.log("Continuity checking skipped (manuscript mode not enabled).\n");
      console.log("Enable with: zettel init --manuscript\n");
    }
    if (hasErrors) {
      console.log("Validation completed with errors.");
      process.exitCode = 1;
    } else {
      console.log("Validation passed.");
    }
    ctx.connectionManager.close();
  } catch (error) {
    console.error("Validation failed:", error);
    process.exit(1);
  }
});

// src/cli/commands/discover.ts
import { Command as Command6 } from "commander";

// src/discovery/mention-detector.ts
import * as fs5 from "fs";
import * as path6 from "path";
var MentionDetector = class {
  nodeRepo;
  vaultPath;
  titleIndex = /* @__PURE__ */ new Map();
  aliasIndex = /* @__PURE__ */ new Map();
  constructor(options) {
    this.nodeRepo = options.nodeRepository;
    this.vaultPath = options.vaultPath || process.cwd();
  }
  /**
   * Build the title/alias index for fast matching
   */
  async buildIndex() {
    this.titleIndex.clear();
    this.aliasIndex.clear();
    const nodes2 = await this.nodeRepo.findAll();
    for (const node of nodes2) {
      const titleLower = node.title.toLowerCase();
      if (!this.titleIndex.has(titleLower)) {
        this.titleIndex.set(titleLower, []);
      }
      this.titleIndex.get(titleLower)?.push({ nodeId: node.nodeId, title: node.title });
      const aliases2 = await this.nodeRepo.getAliases(node.nodeId);
      for (const alias of aliases2) {
        const aliasLower = alias.toLowerCase();
        if (!this.aliasIndex.has(aliasLower)) {
          this.aliasIndex.set(aliasLower, []);
        }
        this.aliasIndex.get(aliasLower)?.push({
          nodeId: node.nodeId,
          title: node.title,
          alias
        });
      }
    }
  }
  /**
   * Detect mentions in a specific node
   */
  async detectInNode(nodeId) {
    if (this.titleIndex.size === 0) {
      await this.buildIndex();
    }
    const node = await this.nodeRepo.findById(nodeId);
    if (!node) return [];
    const filePath = path6.join(this.vaultPath, node.path);
    try {
      if (!fs5.existsSync(filePath)) {
        throw new FileSystemError(`File not found: ${filePath}`, filePath);
      }
      const content = fs5.readFileSync(filePath, "utf-8");
      return this.detectInContent(content, nodeId, node.path);
    } catch (error) {
      if (error instanceof FileSystemError) {
        throw error;
      }
      throw new FileSystemError(
        `Failed to read file for mention detection: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );
    }
  }
  /**
   * Detect mentions in content
   */
  detectInContent(content, sourceNodeId, sourcePath) {
    let contentStartOffset;
    try {
      const parsed = parseFrontmatter(content, sourcePath);
      contentStartOffset = parsed.contentStartOffset;
    } catch (error) {
      throw new ParseError(
        `Failed to parse frontmatter: ${error instanceof Error ? error.message : String(error)}`,
        sourcePath
      );
    }
    const exclusionZones = findExclusionZones(content, 0);
    const allMatches = [];
    for (const [titleLower, nodes2] of this.titleIndex) {
      if (titleLower.length < 2) continue;
      const isSourceNode = nodes2.some((n) => n.nodeId === sourceNodeId);
      if (isSourceNode) continue;
      const pattern = this.buildBoundaryPattern(titleLower);
      if (!pattern) continue;
      const regex = new RegExp(pattern, "gi");
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (match.index === void 0) continue;
        const start = match.index;
        const end = start + match[0].length;
        if (this.isInExclusionZone(start, end, exclusionZones)) continue;
        if (start < contentStartOffset) continue;
        for (const nodeInfo of nodes2) {
          allMatches.push({
            targetId: nodeInfo.nodeId,
            targetTitle: nodeInfo.title,
            surfaceText: match[0],
            spanStart: start,
            spanEnd: end,
            matchType: "title",
            start,
            end
          });
        }
      }
    }
    for (const [aliasLower, nodes2] of this.aliasIndex) {
      if (aliasLower.length < 2) continue;
      const isSourceNode = nodes2.some((n) => n.nodeId === sourceNodeId);
      if (isSourceNode) continue;
      const pattern = this.buildBoundaryPattern(aliasLower);
      if (!pattern) continue;
      const regex = new RegExp(pattern, "gi");
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (match.index === void 0) continue;
        const start = match.index;
        const end = start + match[0].length;
        if (this.isInExclusionZone(start, end, exclusionZones)) continue;
        if (start < contentStartOffset) continue;
        for (const nodeInfo of nodes2) {
          allMatches.push({
            targetId: nodeInfo.nodeId,
            targetTitle: nodeInfo.title,
            surfaceText: match[0],
            spanStart: start,
            spanEnd: end,
            matchType: "alias",
            start,
            end
          });
        }
      }
    }
    return this.deduplicateMatches(allMatches);
  }
  /**
   * Build a boundary-aware regex pattern
   */
  buildBoundaryPattern(text2) {
    const escaped = text2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return `(?<![\\w])${escaped}(?![\\w])`;
  }
  /**
   * Check if a range is in an exclusion zone
   */
  isInExclusionZone(start, end, zones) {
    return zones.some((zone) => start < zone.end && end > zone.start);
  }
  /**
   * Deduplicate overlapping matches, preferring longer matches
   */
  deduplicateMatches(matches) {
    if (matches.length === 0) return [];
    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.end - b.start - (a.end - a.start);
    });
    const result = [];
    let lastEnd = -1;
    for (const match of matches) {
      if (match.start < lastEnd) continue;
      result.push({
        targetId: match.targetId,
        targetTitle: match.targetTitle,
        surfaceText: match.surfaceText,
        spanStart: match.spanStart,
        spanEnd: match.spanEnd,
        matchType: match.matchType
      });
      lastEnd = match.end;
    }
    return result;
  }
  /**
   * Clear the index (call when nodes change)
   */
  clearIndex() {
    this.titleIndex.clear();
    this.aliasIndex.clear();
  }
};

// src/discovery/mention-ranker.ts
var MentionRanker = class {
  edgeRepo;
  graphEngine;
  config;
  // Weighting factors from config
  weights;
  ambiguityPenalty;
  confidenceThreshold;
  expansionMaxDepth;
  expansionBudget;
  constructor(options) {
    this.edgeRepo = options.edgeRepository;
    this.graphEngine = options.graphEngine;
    this.config = options.config ?? DEFAULT_CONFIG;
    this.weights = { ...this.config.discovery.weights };
    this.ambiguityPenalty = this.config.discovery.ambiguityPenalty;
    this.confidenceThreshold = this.config.discovery.confidenceThreshold;
    this.expansionMaxDepth = this.config.discovery.expansionMaxDepth;
    this.expansionBudget = this.config.discovery.expansionBudget;
  }
  /**
   * Rank a list of detected mentions
   */
  async rank(mentions, sourceNodeId) {
    if (mentions.length === 0) return [];
    const targetIds = [...new Set(mentions.map((m) => m.targetId))];
    const centralityScores = await this.calculateCentrality(targetIds);
    const localityScores = sourceNodeId ? await this.calculateLocality(sourceNodeId, targetIds) : /* @__PURE__ */ new Map();
    const frequencyScores = await this.calculateFrequency(targetIds);
    const ranked = [];
    for (const mention of mentions) {
      const reasons = [];
      let score = 0;
      const matchQualityScore = this.calculateMatchQuality(mention);
      score += matchQualityScore * this.weights.matchQuality;
      if (matchQualityScore > 0.7) {
        reasons.push("exact_match");
      }
      const localityScore = localityScores.get(mention.targetId) ?? 0.5;
      score += localityScore * this.weights.locality;
      if (localityScore > 0.7) {
        reasons.push("nearby_in_graph");
      }
      const centralityScore = centralityScores.get(mention.targetId) ?? 0.5;
      score += centralityScore * this.weights.centrality;
      if (centralityScore > 0.7) {
        reasons.push("important_node");
      }
      const frequencyScore = frequencyScores.get(mention.targetId) ?? 0.5;
      score += frequencyScore * this.weights.frequency;
      if (frequencyScore > 0.7) {
        reasons.push("frequently_linked");
      }
      const ambiguousTargets = mentions.filter(
        (m) => m.surfaceText.toLowerCase() === mention.surfaceText.toLowerCase() && m.targetId !== mention.targetId
      );
      if (ambiguousTargets.length > 0) {
        score *= this.ambiguityPenalty;
        reasons.push("ambiguous");
      }
      ranked.push({
        ...mention,
        confidence: Math.min(1, Math.max(0, score)),
        reasons
      });
    }
    return ranked.sort((a, b) => b.confidence - a.confidence);
  }
  /**
   * Calculate match quality based on how well the surface text matches
   */
  calculateMatchQuality(mention) {
    const surface = mention.surfaceText.toLowerCase();
    const target = mention.targetTitle.toLowerCase();
    if (mention.surfaceText === mention.targetTitle) {
      return 1;
    }
    if (surface === target) {
      return 0.95;
    }
    if (mention.matchType === "alias") {
      return 0.85;
    }
    return 0.7;
  }
  /**
   * Calculate centrality scores (based on incoming link count)
   */
  async calculateCentrality(nodeIds) {
    const scores = /* @__PURE__ */ new Map();
    let maxInDegree = 1;
    const inDegrees = /* @__PURE__ */ new Map();
    for (const nodeId of nodeIds) {
      const incoming = await this.edgeRepo.findIncoming(nodeId);
      const inDegree = incoming.length;
      inDegrees.set(nodeId, inDegree);
      maxInDegree = Math.max(maxInDegree, inDegree);
    }
    for (const nodeId of nodeIds) {
      const inDegree = inDegrees.get(nodeId) ?? 0;
      scores.set(nodeId, Math.log(inDegree + 1) / Math.log(maxInDegree + 1));
    }
    return scores;
  }
  /**
   * Calculate locality scores (graph distance from source)
   */
  async calculateLocality(sourceNodeId, targetNodeIds) {
    const scores = /* @__PURE__ */ new Map();
    const expansion = await this.graphEngine.expandGraph({
      seedNodes: [{ nodeId: sourceNodeId, score: 1 }],
      maxDepth: this.expansionMaxDepth,
      budget: this.expansionBudget,
      includeIncoming: true
    });
    const distanceMap = new Map(expansion.map((e) => [e.nodeId, e.depth]));
    for (const targetId of targetNodeIds) {
      const distance = distanceMap.get(targetId);
      if (distance === void 0) {
        scores.set(targetId, 0.1);
      } else if (distance === 0) {
        scores.set(targetId, 0);
      } else {
        scores.set(targetId, 1 / distance);
      }
    }
    return scores;
  }
  /**
   * Calculate frequency scores (how often target is linked to)
   */
  async calculateFrequency(nodeIds) {
    const scores = /* @__PURE__ */ new Map();
    let maxLinks = 1;
    const linkCounts = /* @__PURE__ */ new Map();
    for (const nodeId of nodeIds) {
      const backlinks = await this.edgeRepo.findBacklinks(nodeId);
      const count = backlinks.length;
      linkCounts.set(nodeId, count);
      maxLinks = Math.max(maxLinks, count);
    }
    for (const nodeId of nodeIds) {
      const count = linkCounts.get(nodeId) ?? 0;
      scores.set(nodeId, count / maxLinks);
    }
    return scores;
  }
  /**
   * Filter mentions below a confidence threshold
   */
  filterByThreshold(mentions, threshold) {
    const thresh = threshold ?? this.confidenceThreshold;
    return mentions.filter((m) => m.confidence >= thresh);
  }
  /**
   * Group mentions by target
   */
  groupByTarget(mentions) {
    const groups = /* @__PURE__ */ new Map();
    for (const mention of mentions) {
      const existing = groups.get(mention.targetId) || [];
      existing.push(mention);
      groups.set(mention.targetId, existing);
    }
    return groups;
  }
};

// src/cli/interactive-approver.ts
import * as readline from "readline";
var InteractiveApprover = class {
  edgeRepo;
  sourceNodeId;
  rl = null;
  constructor(options) {
    this.edgeRepo = options.edgeRepository;
    this.sourceNodeId = options.sourceNodeId;
  }
  /**
   * Check if running in a TTY environment
   */
  isTTY() {
    return process.stdin.isTTY === true && process.stdout.isTTY === true;
  }
  /**
   * Approve a single mention interactively
   */
  async approveMention(mention) {
    if (!this.isTTY()) {
      console.warn("Not running in interactive mode (non-TTY). Use --batch flag instead.");
      return "skip";
    }
    console.log(`
  "${mention.surfaceText}" -> ${mention.targetTitle}`);
    console.log(`  Confidence: ${(mention.confidence * 100).toFixed(0)}%`);
    if (mention.reasons && mention.reasons.length > 0) {
      console.log(`  Reasons: ${mention.reasons.join(", ")}`);
    }
    const action = await this.promptAction();
    return action;
  }
  /**
   * Approve multiple mentions interactively
   */
  async approveAll(mentions) {
    const results = [];
    let approveRemaining = false;
    for (const mention of mentions) {
      if (approveRemaining) {
        await this.createMentionEdge(mention);
        results.push({ mention, action: "approve" });
        continue;
      }
      const action = await this.approveMention(mention);
      switch (action) {
        case "approve":
          await this.createMentionEdge(mention);
          results.push({ mention, action: "approve" });
          break;
        case "approveAll":
          await this.createMentionEdge(mention);
          results.push({ mention, action: "approve" });
          approveRemaining = true;
          break;
        case "reject":
          results.push({ mention, action: "reject" });
          break;
        case "defer":
          results.push({ mention, action: "defer" });
          break;
        case "skip":
          results.push({ mention, action: "skip" });
          break;
        case "quit":
          results.push({ mention, action: "quit" });
          this.close();
          return results;
      }
    }
    this.close();
    return results;
  }
  /**
   * Prompt user for action with retry limit
   */
  async promptAction() {
    const maxRetries = 10;
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const answer = await this.question("  Approve? (y)es/(n)o/(d)efer/(a)ll/(s)kip/(q)uit: ");
        const action = this.parseAnswer(answer);
        if (action) return action;
        console.log("  Invalid input. Use y/n/d/a/s/q");
        retries++;
      } catch (error) {
        this.close();
        throw error;
      }
    }
    return "skip";
  }
  /**
   * Parse user answer into an action
   */
  parseAnswer(answer) {
    const normalized = answer.toLowerCase().trim();
    switch (normalized) {
      case "y":
      case "yes":
        return "approve";
      case "n":
      case "no":
        return "reject";
      case "d":
      case "defer":
        return "defer";
      case "a":
      case "all":
        return "approveAll";
      case "s":
      case "skip":
        return "skip";
      case "q":
      case "quit":
        return "quit";
      default:
        return null;
    }
  }
  /**
   * Promisified readline question
   */
  question(prompt) {
    return new Promise((resolve4, reject) => {
      if (!this.rl) {
        this.rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        this.rl.on("close", () => {
        });
        this.rl.on("error", (err) => {
          reject(err);
        });
      }
      this.rl.question(prompt, (answer) => {
        resolve4(answer);
      });
    });
  }
  /**
   * Create a mention edge in the database
   */
  async createMentionEdge(mention) {
    try {
      await this.edgeRepo.create({
        sourceId: this.sourceNodeId,
        targetId: mention.targetId,
        edgeType: "mention",
        provenance: "user_approved",
        strength: mention.confidence,
        attributes: {
          surfaceText: mention.surfaceText,
          spanStart: mention.spanStart,
          spanEnd: mention.spanEnd,
          approvedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to create mention edge: ${error instanceof Error ? error.message : String(error)}`,
        {
          sourceId: this.sourceNodeId,
          targetId: mention.targetId
        }
      );
    }
  }
  /**
   * Close the readline interface
   */
  close() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
};
async function batchApproveMentions(mentions, sourceNodeId, edgeRepo, action) {
  const results = [];
  for (const mention of mentions) {
    if (action === "approve") {
      await edgeRepo.create({
        sourceId: sourceNodeId,
        targetId: mention.targetId,
        edgeType: "mention",
        provenance: "user_approved",
        strength: mention.confidence,
        attributes: {
          surfaceText: mention.surfaceText,
          spanStart: mention.spanStart,
          spanEnd: mention.spanEnd,
          approvedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    }
    results.push({ mention, action });
  }
  return results;
}

// src/cli/commands/discover.ts
var discoverCommand = new Command6("discover").description("Find unlinked mentions").option("-n, --node <id>", "Check specific node").option("--all", "Check all nodes").option("-l, --limit <n>", "Maximum mentions per node", "10").option("-t, --threshold <n>", "Minimum confidence threshold", "0.3").option("--approve", "Interactive approval mode").option("--batch <action>", "Batch action: approve, reject, or defer").action(async (options) => {
  try {
    const ctx = await initContext();
    const limit = parseIntSafe(options.limit, ctx.config.search.defaultLimit);
    const threshold = parseFloatSafe(options.threshold, ctx.config.discovery.confidenceThreshold);
    const detector = new MentionDetector({
      nodeRepository: ctx.nodeRepository,
      vaultPath: ctx.vaultPath
    });
    const ranker = new MentionRanker({
      edgeRepository: ctx.edgeRepository,
      graphEngine: ctx.graphEngine
    });
    let nodesToCheck = [];
    if (options.node) {
      let node = await ctx.nodeRepository.findByPath(options.node);
      if (!node) {
        const nodes2 = await ctx.nodeRepository.findByTitle(options.node);
        node = nodes2[0] ?? null;
      }
      if (!node) {
        console.log(`Node not found: ${options.node}`);
        ctx.connectionManager.close();
        return;
      }
      nodesToCheck = [{ nodeId: node.nodeId, path: node.path, title: node.title }];
    } else if (options.all) {
      const allNodes = await ctx.nodeRepository.findAll();
      nodesToCheck = allNodes.map((n) => ({ nodeId: n.nodeId, path: n.path, title: n.title }));
    } else {
      console.log("Specify --node <id> or --all to discover mentions.");
      ctx.connectionManager.close();
      return;
    }
    let totalMentions = 0;
    for (const { nodeId, path: path16, title } of nodesToCheck) {
      const mentions = await detector.detectInNode(nodeId);
      if (mentions.length === 0) continue;
      const ranked = await ranker.rank(mentions);
      const filtered = ranked.filter((m) => m.confidence >= threshold);
      if (filtered.length === 0) continue;
      console.log(`
${title} (${path16}):`);
      const display = filtered.slice(0, limit);
      const rows = display.map((m) => [
        m.surfaceText,
        m.targetTitle || m.targetId,
        (m.confidence * 100).toFixed(0) + "%",
        m.reasons?.join(", ") || ""
      ]);
      printTable(["Text", "Target", "Confidence", "Reasons"], rows);
      if (filtered.length > limit) {
        console.log(`  ... and ${filtered.length - limit} more`);
      }
      totalMentions += filtered.length;
      if (display.length > 0) {
        if (options.batch) {
          const action = options.batch.toLowerCase();
          if (!["approve", "reject", "defer"].includes(action)) {
            console.error(`Invalid batch action: ${action}. Use: approve, reject, or defer`);
            ctx.connectionManager.close();
            return;
          }
          const results = await batchApproveMentions(
            filtered,
            nodeId,
            ctx.edgeRepository,
            action
          );
          const approvedCount = results.filter((r) => r.action === "approve").length;
          if (approvedCount > 0) {
            console.log(`  Batch ${action}: ${approvedCount} mention(s)`);
          }
        } else if (options.approve) {
          const approver = new InteractiveApprover({
            edgeRepository: ctx.edgeRepository,
            sourceNodeId: nodeId
          });
          if (!approver.isTTY()) {
            console.warn("\nNot running in interactive mode (non-TTY). Use --batch flag for non-interactive approval.");
          } else {
            console.log("\nInteractive approval mode:");
            const results = await approver.approveAll(display);
            const approved = results.filter((r) => r.action === "approve").length;
            const rejected = results.filter((r) => r.action === "reject").length;
            const deferred = results.filter((r) => r.action === "defer").length;
            if (approved > 0 || rejected > 0 || deferred > 0) {
              console.log(`
Approved: ${approved}, Rejected: ${rejected}, Deferred: ${deferred}`);
            }
            if (results.some((r) => r.action === "quit")) {
              console.log("Approval cancelled.");
              ctx.connectionManager.close();
              return;
            }
          }
        }
      }
    }
    if (totalMentions === 0) {
      console.log("No unlinked mentions found.");
    } else {
      console.log(`
Total mentions found: ${totalMentions}`);
    }
    ctx.connectionManager.close();
  } catch (error) {
    console.error("Discovery failed:", error);
    process.exit(1);
  }
});

// src/cli/commands/retrieve.ts
import { Command as Command7 } from "commander";

// src/retrieval/expansion/graph-expander.ts
var GraphExpander = class {
  edgeRepo;
  config;
  constructor(options) {
    if ("edgeRepository" in options) {
      this.edgeRepo = options.edgeRepository;
      this.config = options.config ?? DEFAULT_CONFIG;
    } else {
      this.edgeRepo = options;
      this.config = DEFAULT_CONFIG;
    }
  }
  /**
   * Expand from seed nodes with bounded traversal
   */
  async expand(seeds, options) {
    const {
      maxDepth,
      budget,
      edgeTypes,
      decayFactor,
      includeIncoming,
      scoreThreshold = this.config.graph.scoreThreshold
    } = options;
    if (seeds.length === 0) return [];
    const accumulated = /* @__PURE__ */ new Map();
    let frontier = /* @__PURE__ */ new Set();
    for (const seed of seeds) {
      accumulated.set(seed.nodeId, {
        nodeId: seed.nodeId,
        depth: 0,
        score: seed.score,
        path: [seed.nodeId],
        edgeType: null
      });
      frontier.add(seed.nodeId);
    }
    for (let depth = 1; depth <= maxDepth; depth++) {
      if (accumulated.size >= budget) break;
      if (frontier.size === 0) break;
      const newFrontier = /* @__PURE__ */ new Set();
      for (const nodeId of frontier) {
        if (accumulated.size >= budget) break;
        const current = accumulated.get(nodeId);
        if (!current) continue;
        const edges2 = await this.getEdges(nodeId, edgeTypes, includeIncoming);
        for (const edge of edges2) {
          if (accumulated.size >= budget) break;
          const targetId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
          const edgeWeight = edge.strength ?? 1;
          const newScore = current.score * edgeWeight * Math.pow(decayFactor, depth);
          if (newScore < scoreThreshold) continue;
          const existing = accumulated.get(targetId);
          if (!existing || newScore > existing.score) {
            accumulated.set(targetId, {
              nodeId: targetId,
              depth,
              score: newScore,
              path: [...current.path, targetId],
              edgeType: edge.edgeType
            });
            if (!existing) {
              newFrontier.add(targetId);
            }
          }
        }
      }
      frontier = newFrontier;
    }
    return Array.from(accumulated.values()).sort((a, b) => b.score - a.score);
  }
  /**
   * Get edges for a node
   */
  async getEdges(nodeId, edgeTypes, includeIncoming) {
    const outgoing = await this.edgeRepo.findOutgoing(nodeId, edgeTypes);
    if (!includeIncoming) {
      return outgoing;
    }
    const incoming = await this.edgeRepo.findIncoming(nodeId, edgeTypes);
    return [...outgoing, ...incoming];
  }
  /**
   * Expand with prioritized edge types
   * Some edge types are more valuable for retrieval
   */
  async expandPrioritized(seeds, options, edgeWeights) {
    const {
      maxDepth,
      budget,
      edgeTypes,
      decayFactor,
      includeIncoming,
      scoreThreshold = this.config.graph.scoreThreshold
    } = options;
    if (seeds.length === 0) return [];
    const accumulated = /* @__PURE__ */ new Map();
    let frontier = /* @__PURE__ */ new Set();
    for (const seed of seeds) {
      accumulated.set(seed.nodeId, {
        nodeId: seed.nodeId,
        depth: 0,
        score: seed.score,
        path: [seed.nodeId],
        edgeType: null
      });
      frontier.add(seed.nodeId);
    }
    for (let depth = 1; depth <= maxDepth; depth++) {
      if (accumulated.size >= budget) break;
      if (frontier.size === 0) break;
      const newFrontier = /* @__PURE__ */ new Set();
      for (const nodeId of frontier) {
        if (accumulated.size >= budget) break;
        const current = accumulated.get(nodeId);
        if (!current) continue;
        const edges2 = await this.getEdges(nodeId, edgeTypes, includeIncoming);
        for (const edge of edges2) {
          if (accumulated.size >= budget) break;
          const targetId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
          const typeWeight = edgeWeights[edge.edgeType] ?? 1;
          const edgeWeight = (edge.strength ?? 1) * typeWeight;
          const newScore = current.score * edgeWeight * Math.pow(decayFactor, depth);
          if (newScore < scoreThreshold) continue;
          const existing = accumulated.get(targetId);
          if (!existing || newScore > existing.score) {
            accumulated.set(targetId, {
              nodeId: targetId,
              depth,
              score: newScore,
              path: [...current.path, targetId],
              edgeType: edge.edgeType
            });
            if (!existing) {
              newFrontier.add(targetId);
            }
          }
        }
      }
      frontier = newFrontier;
    }
    return Array.from(accumulated.values()).sort((a, b) => b.score - a.score);
  }
  /**
   * Get expansion statistics
   */
  getExpansionStats(results) {
    if (results.length === 0) {
      return {
        totalNodes: 0,
        maxDepth: 0,
        avgScore: 0,
        edgeTypeCounts: {}
      };
    }
    const edgeTypeCounts = {};
    let totalScore = 0;
    let maxDepth = 0;
    for (const result of results) {
      totalScore += result.score;
      maxDepth = Math.max(maxDepth, result.depth);
      if (result.edgeType) {
        edgeTypeCounts[result.edgeType] = (edgeTypeCounts[result.edgeType] || 0) + 1;
      }
    }
    return {
      totalNodes: results.length,
      maxDepth,
      avgScore: totalScore / results.length,
      edgeTypeCounts
    };
  }
};

// src/retrieval/fusion/rrf.ts
function reciprocalRankFusion(resultLists, options = {}) {
  const k = options.k ?? 60;
  const weights = options.weights ?? {};
  const scores = /* @__PURE__ */ new Map();
  for (const [source, items] of resultLists) {
    const weight = weights[source] ?? 1;
    for (let rank = 0; rank < items.length; rank++) {
      const item = items[rank];
      if (!item) continue;
      const rrfScore = weight * (1 / (k + rank + 1));
      const existing = scores.get(item.id);
      if (existing) {
        existing.score += rrfScore;
        existing.sources.add(source);
        existing.ranks.set(source, rank + 1);
      } else {
        scores.set(item.id, {
          score: rrfScore,
          sources: /* @__PURE__ */ new Set([source]),
          ranks: /* @__PURE__ */ new Map([[source, rank + 1]])
        });
      }
    }
  }
  const results = [];
  for (const [id, data] of scores) {
    results.push({
      id,
      score: data.score,
      sources: Array.from(data.sources),
      ranks: data.ranks
    });
  }
  return results.sort((a, b) => b.score - a.score);
}

// src/retrieval/context/assembler.ts
var ContextAssembler = class {
  nodeRepo;
  chunkRepo;
  expander;
  config;
  constructor(options) {
    this.nodeRepo = options.nodeRepository;
    this.chunkRepo = options.chunkRepository;
    this.expander = new GraphExpander(options.edgeRepository);
    this.config = options.config;
  }
  /**
   * Main retrieval function
   */
  async retrieve(query) {
    const maxResults = query.maxResults ?? this.config.defaultMaxResults;
    const lexicalResults = await this.lexicalSearch(query.text, maxResults * 2);
    const filteredLexical = await this.applyFilters(lexicalResults, query.filters);
    const seedNodes = this.extractSeeds(filteredLexical);
    const expansionOptions = {
      maxDepth: query.expansion?.maxDepth ?? this.config.expansionMaxDepth,
      budget: query.expansion?.budget ?? this.config.expansionBudget,
      edgeTypes: query.expansion?.edgeTypes ?? ["explicit_link", "sequence", "hierarchy"],
      decayFactor: query.expansion?.decayFactor ?? 0.7,
      includeIncoming: true
    };
    const expandedNodes = await this.expander.expand(seedNodes, expansionOptions);
    const graphChunks = await this.fetchChunksForNodes(expandedNodes);
    const fusedChunks = this.fuseResults(filteredLexical, graphChunks, maxResults);
    const context = await this.assembleContext(fusedChunks);
    const provenance = this.buildProvenance(fusedChunks);
    return {
      chunks: fusedChunks.map((sc) => ({
        chunk: sc.chunk,
        node: sc.node,
        score: sc.score,
        matchType: sc.matchType
      })),
      context,
      provenance
    };
  }
  /**
   * Lexical search using FTS5
   */
  async lexicalSearch(query, limit) {
    const ftsResults = this.chunkRepo.searchBM25(query, limit);
    if (ftsResults.length === 0) {
      return [];
    }
    const chunkIds = ftsResults.map((r) => r.chunkId);
    const chunks2 = await this.chunkRepo.findByIds(chunkIds);
    const chunkMap = new Map(chunks2.map((c) => [c.chunkId, c]));
    const nodeIds = [...new Set(ftsResults.map((r) => r.nodeId))];
    const nodes2 = await this.nodeRepo.findByIds(nodeIds);
    const nodeMap = new Map(nodes2.map((n) => [n.nodeId, n]));
    const results = [];
    const maxScore = Math.max(...ftsResults.map((r) => Math.abs(r.score)));
    for (const fts of ftsResults) {
      const chunk = chunkMap.get(fts.chunkId);
      const node = nodeMap.get(fts.nodeId);
      if (chunk && node) {
        results.push({
          chunk,
          node,
          score: maxScore > 0 ? Math.abs(fts.score) / maxScore : 0.5,
          matchType: "lexical"
        });
      }
    }
    return results;
  }
  /**
   * Apply query filters
   */
  async applyFilters(chunks2, filters) {
    if (!filters) return chunks2;
    return chunks2.filter((sc) => {
      if (filters.nodeTypes && !filters.nodeTypes.includes(sc.node.type)) {
        return false;
      }
      if (filters.excludeNodeIds?.includes(sc.node.nodeId)) {
        return false;
      }
      if (filters.dateRange) {
        const nodeDate = new Date(sc.node.updatedAt);
        if (filters.dateRange.start && nodeDate < new Date(filters.dateRange.start)) {
          return false;
        }
        if (filters.dateRange.end && nodeDate > new Date(filters.dateRange.end)) {
          return false;
        }
      }
      return true;
    });
  }
  /**
   * Extract seed nodes from initial results
   */
  extractSeeds(chunks2) {
    const nodeScores = /* @__PURE__ */ new Map();
    for (const sc of chunks2) {
      const current = nodeScores.get(sc.node.nodeId) ?? 0;
      nodeScores.set(sc.node.nodeId, Math.max(current, sc.score));
    }
    return Array.from(nodeScores.entries()).map(([nodeId, score]) => ({ nodeId, score })).sort((a, b) => b.score - a.score).slice(0, 10);
  }
  /**
   * Fetch chunks for expanded nodes
   */
  async fetchChunksForNodes(expanded) {
    const results = [];
    for (const exp of expanded) {
      if (exp.depth === 0) continue;
      const chunks2 = await this.chunkRepo.findByNodeId(exp.nodeId);
      const node = await this.nodeRepo.findById(exp.nodeId);
      if (!node) continue;
      for (const chunk of chunks2) {
        results.push({
          chunk,
          node,
          score: exp.score,
          matchType: "graph"
        });
      }
    }
    return results;
  }
  /**
   * Fuse lexical and graph results using RRF
   */
  fuseResults(lexical, graph, maxResults) {
    const lexicalItems = lexical.map((sc) => ({
      id: sc.chunk.chunkId,
      score: sc.score,
      source: "lexical"
    }));
    const graphItems = graph.map((sc) => ({
      id: sc.chunk.chunkId,
      score: sc.score,
      source: "graph"
    }));
    const chunkLookup = /* @__PURE__ */ new Map();
    for (const sc of [...lexical, ...graph]) {
      const existing = chunkLookup.get(sc.chunk.chunkId);
      if (!existing || sc.score > existing.score) {
        chunkLookup.set(sc.chunk.chunkId, sc);
      }
    }
    const resultLists = /* @__PURE__ */ new Map([
      ["lexical", lexicalItems],
      ["graph", graphItems]
    ]);
    const fused = reciprocalRankFusion(resultLists, {
      k: this.config.rrfK,
      weights: {
        lexical: this.config.lexicalWeight,
        graph: this.config.graphWeight
      }
    });
    const results = [];
    for (const f of fused.slice(0, maxResults)) {
      const sc = chunkLookup.get(f.id);
      if (sc) {
        results.push({
          ...sc,
          score: f.score,
          matchType: f.sources.length > 1 ? "lexical" : f.sources[0]
        });
      }
    }
    return results;
  }
  /**
   * Assemble context string from chunks
   */
  async assembleContext(chunks2) {
    if (chunks2.length === 0) {
      return "";
    }
    const nodeChunks = /* @__PURE__ */ new Map();
    for (const sc of chunks2) {
      const existing = nodeChunks.get(sc.node.nodeId) ?? [];
      existing.push(sc);
      nodeChunks.set(sc.node.nodeId, existing);
    }
    const sections = [];
    for (const [, nodeChunkList] of nodeChunks) {
      const node = nodeChunkList[0]?.node;
      if (!node) continue;
      nodeChunkList.sort((a, b) => a.chunk.offsetStart - b.chunk.offsetStart);
      const chunkTexts = nodeChunkList.map((sc) => sc.chunk.text);
      const combinedText = chunkTexts.join("\n\n");
      sections.push(`## ${node.title}

${combinedText}`);
    }
    return sections.join("\n\n---\n\n");
  }
  /**
   * Build provenance information
   */
  buildProvenance(chunks2) {
    const nodeContributions = /* @__PURE__ */ new Map();
    for (const sc of chunks2) {
      const existing = nodeContributions.get(sc.node.nodeId);
      if (existing) {
        existing.score += sc.score;
      } else {
        nodeContributions.set(sc.node.nodeId, {
          path: sc.node.path,
          score: sc.score
        });
      }
    }
    const totalScore = Array.from(nodeContributions.values()).reduce((sum, n) => sum + n.score, 0);
    return Array.from(nodeContributions.entries()).map(([nodeId, data]) => ({
      nodeId,
      path: data.path,
      contribution: totalScore > 0 ? data.score / totalScore : 0
    })).sort((a, b) => b.contribution - a.contribution);
  }
};

// src/cli/commands/retrieve.ts
var retrieveCommand = new Command7("retrieve").description("GraphRAG retrieval for a query").argument("<query>", "The query to retrieve context for").option("-n, --max-results <n>", "Maximum results", "10").option("-d, --depth <n>", "Graph expansion depth", "2").option("-b, --budget <n>", "Node expansion budget", "30").option("--no-semantic", "Disable semantic search").option("--no-lexical", "Disable lexical search").option("--no-graph", "Disable graph expansion").option("-t, --type <types>", "Filter by node types (comma-separated)").option("-v, --verbose", "Show detailed provenance").action(async (queryText, options) => {
  try {
    const ctx = await initContext();
    if (!ctx.config.embeddings.apiKey && ctx.config.embeddings.provider === "openai") {
      console.log("Note: OpenAI API key not configured. Semantic search disabled.");
      console.log("Set OPENAI_API_KEY or configure in .zettelscript/config.yaml\n");
    }
    const query = {
      text: queryText,
      maxResults: parseInt(options.maxResults, 10),
      expansion: {
        maxDepth: parseInt(options.depth, 10),
        budget: parseInt(options.budget, 10)
      }
    };
    if (options.type) {
      query.filters = {
        nodeTypes: options.type.split(",").map((t) => t.trim())
      };
    }
    console.log(`Retrieving: "${queryText}"
`);
    const assembler = new ContextAssembler({
      nodeRepository: ctx.nodeRepository,
      edgeRepository: ctx.edgeRepository,
      chunkRepository: ctx.chunkRepository,
      graphEngine: ctx.graphEngine,
      config: ctx.config.retrieval
    });
    const result = await assembler.retrieve(query);
    if (result.chunks.length === 0) {
      console.log("No relevant content found.");
      console.log("\nTips:");
      console.log('  - Run "zettel index" to index your vault');
      console.log("  - Try broader search terms");
      console.log('  - Use "zettel query stats" to check indexed content');
    } else {
      console.log("=== Retrieved Context ===\n");
      console.log(result.context);
      console.log("\n=== End Context ===\n");
      if (options.verbose && result.provenance.length > 0) {
        console.log("Sources:");
        for (const p of result.provenance) {
          const contribution = (p.contribution * 100).toFixed(0);
          console.log(`  [${contribution}%] ${p.path}`);
        }
      } else {
        console.log(`Sources: ${result.provenance.length} nodes`);
      }
      const matchTypes = /* @__PURE__ */ new Map();
      for (const chunk of result.chunks) {
        matchTypes.set(chunk.matchType, (matchTypes.get(chunk.matchType) || 0) + 1);
      }
      console.log("\nMatch breakdown:");
      for (const [type, count] of matchTypes) {
        console.log(`  ${type}: ${count}`);
      }
    }
    ctx.connectionManager.close();
  } catch (error) {
    console.error("Retrieval failed:", error);
    process.exit(1);
  }
});

// src/cli/commands/rewrite.ts
import { Command as Command8 } from "commander";

// src/engine/manuscript/impact-analyzer.ts
var ImpactAnalyzer = class {
  nodeRepo;
  edgeRepo;
  graphEngine;
  config;
  constructor(options) {
    this.nodeRepo = options.nodeRepository;
    this.edgeRepo = options.edgeRepository;
    this.graphEngine = options.graphEngine;
    this.config = options.config ?? DEFAULT_CONFIG;
  }
  /**
   * Analyze the impact of modifying a scene
   */
  async analyze(sceneNodeId) {
    const scene = await this.nodeRepo.findById(sceneNodeId);
    if (!scene) {
      return {
        directImpact: [],
        transitiveImpact: [],
        povImpact: [],
        timelineImpact: [],
        characterImpact: []
      };
    }
    const metadata = scene.metadata;
    const directImpact = await this.getDirectImpact(sceneNodeId);
    const transitiveImpact = await this.getTransitiveImpact(sceneNodeId, directImpact);
    const povImpact = metadata?.pov ? await this.getPovImpact(metadata.pov, sceneNodeId) : [];
    const timelineImpact = metadata?.scene_order !== void 0 ? await this.getTimelineImpact(metadata.scene_order, sceneNodeId) : [];
    const characterImpact = await this.getCharacterImpact(sceneNodeId, metadata);
    return {
      directImpact,
      transitiveImpact,
      povImpact,
      timelineImpact,
      characterImpact
    };
  }
  /**
   * Get directly linked nodes
   */
  async getDirectImpact(nodeId) {
    const outgoing = await this.edgeRepo.findOutgoing(nodeId);
    const incoming = await this.edgeRepo.findIncoming(nodeId);
    const impacted = /* @__PURE__ */ new Set();
    for (const edge of outgoing) {
      impacted.add(edge.targetId);
    }
    for (const edge of incoming) {
      impacted.add(edge.sourceId);
    }
    return Array.from(impacted);
  }
  /**
   * Get transitively impacted nodes via graph expansion
   */
  async getTransitiveImpact(nodeId, directImpact) {
    const expansion = await this.graphEngine.expandGraph({
      seedNodes: [{ nodeId, score: 1 }],
      maxDepth: this.config.impact.maxTransitiveDepth,
      budget: this.config.impact.maxTransitiveBudget,
      includeIncoming: true
    });
    const directSet = new Set(directImpact);
    directSet.add(nodeId);
    return expansion.filter((e) => e.depth > 1 && !directSet.has(e.nodeId)).map((e) => e.nodeId);
  }
  /**
   * Get scenes with the same POV character
   */
  async getPovImpact(povCharacter, excludeNodeId) {
    const scenes = await this.nodeRepo.findByType("scene");
    return scenes.filter((s) => {
      const meta = s.metadata;
      return meta?.pov === povCharacter && s.nodeId !== excludeNodeId;
    }).map((s) => s.nodeId);
  }
  /**
   * Get adjacent scenes in the timeline
   */
  async getTimelineImpact(sceneOrder, excludeNodeId) {
    const scenes = await this.nodeRepo.findByType("scene");
    const range = this.config.impact.timelineRange;
    return scenes.filter((s) => {
      const meta = s.metadata;
      const order = meta?.scene_order;
      if (order === void 0 || s.nodeId === excludeNodeId) return false;
      return Math.abs(order - sceneOrder) <= range;
    }).map((s) => s.nodeId);
  }
  /**
   * Get characters whose knowledge might be affected
   */
  async getCharacterImpact(sceneNodeId, metadata) {
    const characters = /* @__PURE__ */ new Set();
    if (metadata?.pov) {
      characters.add(metadata.pov);
    }
    if (metadata?.characters) {
      for (const char of metadata.characters) {
        characters.add(char);
      }
    }
    const links = await this.edgeRepo.findOutgoing(sceneNodeId);
    for (const link of links) {
      const targetNode = await this.nodeRepo.findById(link.targetId);
      if (targetNode?.type === "character") {
        characters.add(targetNode.title);
      }
    }
    return Array.from(characters);
  }
  /**
   * Get detailed impact report
   */
  async getDetailedReport(sceneNodeId) {
    const impact = await this.analyze(sceneNodeId);
    const totalAffected = (/* @__PURE__ */ new Set([
      ...impact.directImpact,
      ...impact.transitiveImpact,
      ...impact.povImpact,
      ...impact.timelineImpact
    ])).size;
    let riskLevel = "low";
    if (totalAffected > 20 || impact.characterImpact.length > 5) {
      riskLevel = "high";
    } else if (totalAffected > 10 || impact.characterImpact.length > 3) {
      riskLevel = "medium";
    }
    const recommendations = [];
    if (impact.povImpact.length > 3) {
      recommendations.push("Review other scenes with the same POV for consistency");
    }
    if (impact.timelineImpact.length > 5) {
      recommendations.push("Check timeline continuity with adjacent scenes");
    }
    if (impact.characterImpact.length > 0) {
      recommendations.push(`Verify character knowledge for: ${impact.characterImpact.slice(0, 3).join(", ")}`);
    }
    if (impact.transitiveImpact.length > 10) {
      recommendations.push("Large transitive impact - consider breaking change into smaller edits");
    }
    return {
      impact,
      summary: {
        totalAffected,
        directCount: impact.directImpact.length,
        transitiveCount: impact.transitiveImpact.length,
        characterCount: impact.characterImpact.length,
        riskLevel
      },
      recommendations
    };
  }
};

// src/engine/manuscript/rewrite-orchestrator.ts
import * as fs6 from "fs";
import * as path7 from "path";
var RewriteOrchestrator = class {
  nodeRepo;
  impact;
  vaultPath;
  config;
  constructor(options) {
    this.nodeRepo = options.nodeRepository;
    this.impact = options.impact;
    this.vaultPath = options.vaultPath || process.cwd();
    this.config = options.config ?? DEFAULT_CONFIG;
  }
  /**
   * Gather all context needed for a rewrite
   */
  async gatherContext(sceneNodeId, goal) {
    const scene = await this.nodeRepo.findById(sceneNodeId);
    if (!scene) {
      throw new Error(`Scene not found: ${sceneNodeId}`);
    }
    const sceneContent = await this.readNodeContent(scene);
    const sceneMetadata = scene.metadata;
    const characterContext = await this.gatherCharacterContext(sceneNodeId, sceneMetadata);
    const timelineContext = await this.gatherTimelineContext(sceneMetadata?.scene_order);
    const relatedContent = await this.gatherRelatedContent(sceneNodeId);
    const constraints = this.buildConstraints(sceneMetadata);
    return {
      sceneContent,
      sceneMetadata,
      goal,
      characterContext,
      timelineContext,
      relatedContent,
      constraints
    };
  }
  /**
   * Read content from a node's file
   */
  async readNodeContent(node) {
    const filePath = path7.join(this.vaultPath, node.path);
    try {
      return fs6.readFileSync(filePath, "utf-8");
    } catch {
      return "";
    }
  }
  /**
   * Gather context about characters in the scene
   */
  async gatherCharacterContext(_sceneNodeId, sceneMetadata) {
    const context = [];
    const characterNames = /* @__PURE__ */ new Set();
    if (sceneMetadata?.pov) {
      characterNames.add(sceneMetadata.pov);
    }
    if (sceneMetadata?.characters) {
      for (const char of sceneMetadata.characters) {
        characterNames.add(char);
      }
    }
    for (const charName of this.impact.characterImpact) {
      characterNames.add(charName);
    }
    for (const charName of characterNames) {
      const nodes2 = await this.nodeRepo.findByTitle(charName);
      const charNode = nodes2.find((n) => n.type === "character");
      if (charNode) {
        const charMeta = charNode.metadata;
        const content = await this.readNodeContent(charNode);
        const firstPara = content.split("\n\n")[1]?.trim() || charMeta?.description || "";
        context.push({
          name: charNode.title,
          description: firstPara.slice(0, 500),
          role: sceneMetadata?.pov === charName ? "POV" : "present"
        });
      }
    }
    return context;
  }
  /**
   * Gather context about adjacent scenes in timeline
   */
  async gatherTimelineContext(sceneOrder) {
    if (sceneOrder === void 0) return [];
    const context = [];
    const scenes = await this.nodeRepo.findByType("scene");
    const range = Math.ceil(this.config.impact.timelineRange / 2);
    const adjacentScenes = scenes.filter((s) => {
      const meta = s.metadata;
      const order = meta?.scene_order;
      return order !== void 0 && Math.abs(order - sceneOrder) <= range && order !== sceneOrder;
    }).sort((a, b) => {
      const orderA = a.metadata?.scene_order ?? 0;
      const orderB = b.metadata?.scene_order ?? 0;
      return orderA - orderB;
    });
    for (const scene of adjacentScenes) {
      const meta = scene.metadata;
      const content = await this.readNodeContent(scene);
      const parts = content.split("---");
      const body = parts.length > 2 ? parts.slice(2).join("---") : content;
      const summary = body.trim().split("\n\n")[0]?.slice(0, 300) || "";
      context.push({
        title: scene.title,
        order: meta?.scene_order ?? 0,
        summary
      });
    }
    return context;
  }
  /**
   * Gather related content from direct links
   */
  async gatherRelatedContent(_sceneNodeId) {
    const content = [];
    const directIds = this.impact.directImpact;
    const nodes2 = await this.nodeRepo.findByIds(directIds);
    for (const node of nodes2.slice(0, 10)) {
      if (node.type === "character") continue;
      const nodeContent = await this.readNodeContent(node);
      const excerpt = nodeContent.trim().slice(0, 300);
      content.push({
        title: node.title,
        type: node.type,
        excerpt
      });
    }
    return content;
  }
  /**
   * Build constraints based on metadata and impact
   */
  buildConstraints(sceneMetadata) {
    const constraints = [];
    if (sceneMetadata?.pov) {
      constraints.push(`Maintain POV: ${sceneMetadata.pov} - only reveal information they would know`);
    }
    if (sceneMetadata?.scene_order !== void 0) {
      constraints.push(`Timeline position: Scene ${sceneMetadata.scene_order} - maintain continuity with adjacent scenes`);
    }
    if (sceneMetadata?.locations?.length) {
      constraints.push(`Location: ${sceneMetadata.locations.join(", ")}`);
    }
    if (this.impact.characterImpact.length > 0) {
      constraints.push(`Characters to consider: ${this.impact.characterImpact.join(", ")}`);
    }
    if (this.impact.povImpact.length > 5) {
      constraints.push("This POV appears in many scenes - maintain character voice consistency");
    }
    return constraints;
  }
  /**
   * Format context for LLM prompt
   */
  formatContextForPrompt(context) {
    const sections = [];
    sections.push(`## Rewrite Goal

${context.goal}`);
    if (context.constraints.length > 0) {
      sections.push(`## Constraints

${context.constraints.map((c) => `- ${c}`).join("\n")}`);
    }
    if (context.characterContext.length > 0) {
      const charSection = context.characterContext.map(
        (c) => `### ${c.name} (${c.role})

${c.description}`
      ).join("\n\n");
      sections.push(`## Characters

${charSection}`);
    }
    if (context.timelineContext.length > 0) {
      const timelineSection = context.timelineContext.map(
        (t) => `### Scene ${t.order}: ${t.title}

${t.summary}`
      ).join("\n\n");
      sections.push(`## Timeline Context

${timelineSection}`);
    }
    if (context.relatedContent.length > 0) {
      const relatedSection = context.relatedContent.map(
        (r) => `### ${r.title} (${r.type})

${r.excerpt}`
      ).join("\n\n");
      sections.push(`## Related Content

${relatedSection}`);
    }
    sections.push(`## Current Scene Content

${context.sceneContent}`);
    return sections.join("\n\n---\n\n");
  }
  /**
   * Get a summary of the rewrite context
   */
  getContextSummary(context) {
    return {
      characterCount: context.characterContext.length,
      timelineSceneCount: context.timelineContext.length,
      relatedContentCount: context.relatedContent.length,
      constraintCount: context.constraints.length,
      totalContextLength: JSON.stringify(context).length
    };
  }
};

// src/llm/provider.ts
var OpenAILLMProvider = class {
  name = "openai";
  apiKey;
  baseUrl;
  model;
  defaultMaxTokens;
  defaultTemperature;
  constructor(config) {
    if (!config.apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
    this.model = config.model;
    this.defaultMaxTokens = config.maxTokens ?? 2048;
    this.defaultTemperature = config.temperature ?? 0.7;
  }
  async complete(prompt, options) {
    const maxTokens = options?.maxTokens ?? this.defaultMaxTokens;
    const temperature = options?.temperature ?? this.defaultTemperature;
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: maxTokens,
        temperature
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "";
  }
};
var OllamaLLMProvider = class {
  name = "ollama";
  baseUrl;
  model;
  defaultMaxTokens;
  defaultTemperature;
  constructor(config) {
    this.baseUrl = config.baseUrl ?? "http://localhost:11434";
    this.model = config.model;
    this.defaultMaxTokens = config.maxTokens ?? 2048;
    this.defaultTemperature = config.temperature ?? 0.7;
  }
  async complete(prompt, options) {
    const temperature = options?.temperature ?? this.defaultTemperature;
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature,
          num_predict: options?.maxTokens ?? this.defaultMaxTokens
        }
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }
    const data = await response.json();
    return data.response ?? "";
  }
};
function createLLMProvider(config) {
  if (config.provider === "none") {
    return null;
  }
  switch (config.provider) {
    case "openai":
      if (!config.apiKey) {
        return null;
      }
      return new OpenAILLMProvider(config);
    case "ollama":
      return new OllamaLLMProvider(config);
    default:
      return null;
  }
}

// src/llm/prompts.ts
function buildRewritePrompt(context) {
  const parts = [];
  parts.push("You are a creative writing assistant helping to rewrite a scene from a manuscript.");
  parts.push("");
  parts.push("## Current Scene");
  parts.push(`Title: ${context.sceneTitle}`);
  if (context.povCharacter) {
    parts.push(`POV Character: ${context.povCharacter}`);
  }
  parts.push("");
  parts.push("Content:");
  parts.push("```");
  parts.push(context.sceneContent);
  parts.push("```");
  parts.push("");
  parts.push(`## Rewrite Goal`);
  parts.push(context.goal);
  parts.push("");
  if (context.characterContext.length > 0) {
    parts.push("## Character Context");
    for (const char of context.characterContext) {
      parts.push(`### ${char.name}`);
      parts.push(char.details);
      parts.push("");
    }
  }
  if (context.timelineContext.length > 0) {
    parts.push("## Timeline Context");
    for (const scene of context.timelineContext) {
      parts.push(`- ${scene.title} (${scene.position})`);
    }
    parts.push("");
  }
  if (context.relatedContent.length > 0) {
    parts.push("## Related Scenes");
    for (const related of context.relatedContent.slice(0, 5)) {
      parts.push(`### ${related.title}`);
      parts.push(related.excerpt);
      parts.push("");
    }
  }
  parts.push("## Instructions");
  parts.push("Based on the context above, provide specific suggestions for how to rewrite this scene to achieve the stated goal.");
  parts.push("");
  parts.push("Please provide:");
  parts.push("1. A brief analysis of how the current scene could be improved");
  parts.push("2. Specific suggestions for changes (what to add, remove, or modify)");
  parts.push("3. An example of a rewritten opening paragraph or key section");
  parts.push("");
  parts.push("Maintain consistency with the established characters, timeline, and POV.");
  return parts.join("\n");
}

// src/cli/commands/rewrite.ts
var rewriteCommand = new Command8("rewrite").description("Analyze and orchestrate scene rewrites").argument("<scene>", "The scene to rewrite (path or title)").option("-g, --goal <goal>", "Rewrite goal description").option("--analyze-only", "Only show impact analysis, do not generate rewrite").option("--dry-run", "Show what would change without applying").option("-v, --verbose", "Show detailed output").action(async (sceneIdentifier, options) => {
  try {
    const ctx = await initContext();
    if (!ctx.config.manuscript.enabled) {
      console.log("Manuscript mode not enabled.");
      console.log("Enable with: zettel init --manuscript");
      ctx.connectionManager.close();
      return;
    }
    let scene = await ctx.nodeRepository.findByPath(sceneIdentifier);
    if (!scene) {
      const nodes2 = await ctx.nodeRepository.findByTitle(sceneIdentifier);
      scene = nodes2.find((n) => n.type === "scene") ?? nodes2[0] ?? null;
    }
    if (!scene) {
      console.log(`Scene not found: ${sceneIdentifier}`);
      ctx.connectionManager.close();
      return;
    }
    if (scene.type !== "scene") {
      console.log(`Warning: Node "${scene.title}" is type "${scene.type}", not "scene".`);
    }
    console.log(`Scene: ${scene.title} (${scene.path})
`);
    const analyzer = new ImpactAnalyzer({
      nodeRepository: ctx.nodeRepository,
      edgeRepository: ctx.edgeRepository,
      graphEngine: ctx.graphEngine
    });
    console.log("Analyzing impact...\n");
    const impact = await analyzer.analyze(scene.nodeId);
    console.log("Impact Analysis:");
    console.log(`  Direct dependencies:    ${impact.directImpact.length}`);
    console.log(`  Transitive impact:      ${impact.transitiveImpact.length}`);
    console.log(`  POV-related scenes:     ${impact.povImpact.length}`);
    console.log(`  Timeline-adjacent:      ${impact.timelineImpact.length}`);
    console.log(`  Affected characters:    ${impact.characterImpact.length}`);
    if (options.verbose) {
      if (impact.directImpact.length > 0) {
        console.log("\nDirect dependencies:");
        const directNodes = await ctx.nodeRepository.findByIds(impact.directImpact);
        for (const n of directNodes.slice(0, 10)) {
          console.log(`  - ${n.title}`);
        }
      }
      if (impact.povImpact.length > 0) {
        console.log("\nPOV-related scenes:");
        const povNodes = await ctx.nodeRepository.findByIds(impact.povImpact);
        for (const n of povNodes.slice(0, 10)) {
          console.log(`  - ${n.title}`);
        }
      }
      if (impact.characterImpact.length > 0) {
        console.log("\nAffected characters:");
        for (const c of impact.characterImpact.slice(0, 10)) {
          console.log(`  - ${c}`);
        }
      }
    }
    if (options.analyzeOnly) {
      ctx.connectionManager.close();
      return;
    }
    if (!options.goal) {
      console.log('\nSpecify a rewrite goal with --goal "<goal>"');
      console.log('Example: zettel rewrite "Chapter 1" --goal "Add more tension"');
      ctx.connectionManager.close();
      return;
    }
    console.log(`
Rewrite goal: ${options.goal}
`);
    const orchestrator = new RewriteOrchestrator({
      nodeRepository: ctx.nodeRepository,
      impact
    });
    console.log("Gathering context for rewrite...\n");
    const context = await orchestrator.gatherContext(scene.nodeId, options.goal);
    console.log("Context includes:");
    console.log(`  - Scene content: ${context.sceneContent.length} chars`);
    console.log(`  - Character context: ${context.characterContext.length} items`);
    console.log(`  - Timeline context: ${context.timelineContext.length} items`);
    console.log(`  - Related content: ${context.relatedContent.length} items`);
    if (options.dryRun) {
      console.log("\n[Dry run] Would send to LLM for rewrite suggestions.");
      console.log("Context would include the above information.");
      ctx.connectionManager.close();
      return;
    }
    const llmProvider = createLLMProvider(ctx.config.llm);
    if (!llmProvider) {
      console.log("\nLLM not configured. Add to config.yaml:");
      console.log("  llm:");
      console.log("    provider: openai  # or ollama");
      console.log("    model: gpt-4");
      console.log("    apiKey: your-api-key  # for openai");
      console.log("\nManual rewrite context has been gathered and displayed above.");
      ctx.connectionManager.close();
      return;
    }
    const povChar = context.sceneMetadata?.pov;
    const rewriteContext = {
      sceneTitle: scene.title,
      sceneContent: context.sceneContent,
      goal: options.goal,
      characterContext: context.characterContext.map((c) => ({
        name: c.name,
        details: c.description
      })),
      timelineContext: context.timelineContext.map((t) => ({
        title: t.title,
        position: String(t.order)
      })),
      relatedContent: context.relatedContent.map((r) => ({
        title: r.title,
        excerpt: r.excerpt
      })),
      ...povChar && { povCharacter: povChar }
    };
    console.log("\nGenerating rewrite suggestions...\n");
    try {
      const prompt = buildRewritePrompt(rewriteContext);
      const suggestions = await llmProvider.complete(prompt);
      console.log("Rewrite Suggestions:");
      console.log("=".repeat(50));
      console.log(suggestions);
      console.log("=".repeat(50));
    } catch (error) {
      console.error("LLM request failed:", error instanceof Error ? error.message : error);
      console.log("\nManual rewrite context has been gathered and displayed above.");
    }
    ctx.connectionManager.close();
  } catch (error) {
    console.error("Rewrite failed:", error);
    process.exit(1);
  }
});

// src/cli/commands/extract.ts
import { Command as Command9 } from "commander";
import * as fs7 from "fs";
import * as path8 from "path";

// src/extraction/entity-extractor.ts
var EXTRACTION_PROMPT = `You are an entity extractor for fiction manuscripts. Analyze the following text and extract all named entities.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "characters": [
    {"name": "Full Name", "aliases": ["nickname", "title"], "description": "brief description"}
  ],
  "locations": [
    {"name": "Location Name", "aliases": [], "description": "brief description"}
  ],
  "objects": [
    {"name": "Object Name", "aliases": [], "description": "why it's significant"}
  ],
  "events": [
    {"name": "Event Name", "aliases": [], "description": "what happened"}
  ]
}

Rules:
- Characters include people, animals, personified objects (like stuffed animals with names)
- Locations include rooms, buildings, cities, any named place
- Objects include significant items mentioned multiple times or plot-relevant
- For aliases, include nicknames, titles, pronouns-as-names ("Mom" vs "mother")
- Keep descriptions to one sentence
- Only include entities that are NAMED or clearly identifiable
- Do NOT include generic references ("the door" unless it's "the basement door" as a specific thing)

TEXT TO ANALYZE:
`;
var EntityExtractor = class {
  llm;
  chunkSize;
  overlapSize;
  constructor(options) {
    this.llm = options.llmProvider;
    this.chunkSize = options.chunkSize ?? 8e3;
    this.overlapSize = options.overlapSize ?? 500;
  }
  /**
   * Extract entities from a full manuscript
   */
  async extractFromText(text2, onProgress) {
    const chunks2 = this.chunkText(text2);
    const allEntities = /* @__PURE__ */ new Map();
    for (let i = 0; i < chunks2.length; i++) {
      const chunk = chunks2[i];
      if (!chunk) continue;
      if (onProgress) onProgress(i + 1, chunks2.length);
      const chunkEntities = await this.extractEntitiesFromChunk(chunk.text);
      for (const entity of chunkEntities) {
        const key = this.normalizeEntityKey(entity.name);
        const existing = allEntities.get(key);
        if (existing) {
          existing.aliases = [.../* @__PURE__ */ new Set([...existing.aliases, ...entity.aliases])];
          existing.mentions += 1;
          if (entity.description.length > existing.description.length) {
            existing.description = entity.description;
          }
        } else {
          allEntities.set(key, { ...entity, mentions: 1 });
        }
      }
    }
    const scenes = await this.extractScenes(text2, chunks2);
    return {
      entities: Array.from(allEntities.values()).sort((a, b) => b.mentions - a.mentions),
      scenes
    };
  }
  chunkText(text2) {
    const chunks2 = [];
    let start = 0;
    while (start < text2.length) {
      let end = start + this.chunkSize;
      if (end < text2.length) {
        const breakPoint = text2.lastIndexOf("\n\n", end);
        if (breakPoint > start + this.chunkSize / 2) {
          end = breakPoint;
        }
      } else {
        end = text2.length;
      }
      chunks2.push({
        text: text2.slice(start, end),
        start,
        end
      });
      start = end - this.overlapSize;
      if (start < 0) start = 0;
      if (end >= text2.length) break;
    }
    return chunks2;
  }
  async extractEntitiesFromChunk(text2) {
    const prompt = EXTRACTION_PROMPT + text2;
    try {
      const response = await this.llm.complete(prompt, { temperature: 0.1 });
      const parsed = this.parseJSON(response);
      const entities = [];
      if (Array.isArray(parsed.characters)) {
        for (const c of parsed.characters) {
          if (c.name) {
            entities.push({
              name: c.name,
              type: "character",
              aliases: Array.isArray(c.aliases) ? c.aliases : [],
              description: c.description || "",
              mentions: 1
            });
          }
        }
      }
      if (Array.isArray(parsed.locations)) {
        for (const l of parsed.locations) {
          if (l.name) {
            entities.push({
              name: l.name,
              type: "location",
              aliases: Array.isArray(l.aliases) ? l.aliases : [],
              description: l.description || "",
              mentions: 1
            });
          }
        }
      }
      if (Array.isArray(parsed.objects)) {
        for (const o of parsed.objects) {
          if (o.name) {
            entities.push({
              name: o.name,
              type: "object",
              aliases: Array.isArray(o.aliases) ? o.aliases : [],
              description: o.description || "",
              mentions: 1
            });
          }
        }
      }
      if (Array.isArray(parsed.events)) {
        for (const e of parsed.events) {
          if (e.name) {
            entities.push({
              name: e.name,
              type: "event",
              aliases: Array.isArray(e.aliases) ? e.aliases : [],
              description: e.description || "",
              mentions: 1
            });
          }
        }
      }
      return entities;
    } catch (error) {
      console.error("Entity extraction failed for chunk:", error);
      return [];
    }
  }
  async extractScenes(_fullText, chunks2) {
    const scenes = [];
    const chapterRegex = /^#+\s*(Chapter|Scene|Part)\s*\d*[:\s]*.*/gmi;
    for (const chunk of chunks2) {
      const matches = chunk.text.matchAll(chapterRegex);
      for (const match of matches) {
        if (match.index !== void 0) {
          scenes.push({
            title: match[0].replace(/^#+\s*/, "").trim(),
            summary: "",
            startOffset: chunk.start + match.index,
            endOffset: chunk.start + match.index + 1e3,
            // Approximate
            entities: []
          });
        }
      }
    }
    return scenes;
  }
  normalizeEntityKey(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  parseJSON(text2) {
    let jsonText = text2.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      jsonText = jsonText.slice(start, end + 1);
    }
    try {
      return JSON.parse(jsonText);
    } catch {
      console.error("Failed to parse JSON:", jsonText.slice(0, 200));
      return {};
    }
  }
};

// src/cli/commands/extract.ts
import { nanoid as nanoid6 } from "nanoid";
import { stringify as stringifyYaml4 } from "yaml";
var extractCommand = new Command9("extract").description("Extract entities (characters, locations, etc.) from prose").option("-f, --file <path>", "Extract from specific file").option("--all", "Extract from all markdown files").option("-m, --model <model>", "Ollama model to use", "llama3.2:3b").option("--dry-run", "Show what would be extracted without creating files").option("-o, --output <dir>", "Output directory for entity files").option("-v, --verbose", "Show detailed output").action(async (options) => {
  try {
    const ctx = await initContext();
    let filesToProcess = [];
    if (options.file) {
      const filePath = path8.isAbsolute(options.file) ? options.file : path8.join(ctx.vaultPath, options.file);
      if (!fs7.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }
      filesToProcess = [filePath];
    } else if (options.all) {
      const findMarkdown = (dir) => {
        const results = [];
        const entries = fs7.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path8.join(dir, entry.name);
          if (ctx.config.vault.excludePatterns.some((p) => {
            const pattern = p.replace("**/", "").replace("/**", "");
            return entry.name === pattern || fullPath.includes(pattern);
          })) {
            continue;
          }
          if (entry.isDirectory()) {
            results.push(...findMarkdown(fullPath));
          } else if (entry.name.endsWith(".md")) {
            results.push(fullPath);
          }
        }
        return results;
      };
      filesToProcess = findMarkdown(ctx.vaultPath);
    } else {
      console.log("Specify --file <path> or --all to extract entities.");
      console.log("\nExamples:");
      console.log("  zettel extract --file book1.md");
      console.log("  zettel extract --all");
      ctx.connectionManager.close();
      return;
    }
    if (filesToProcess.length === 0) {
      console.log("No markdown files found.");
      ctx.connectionManager.close();
      return;
    }
    console.log(`Processing ${filesToProcess.length} file(s)...
`);
    const llmProvider = new OllamaLLMProvider({
      provider: "ollama",
      model: options.model,
      baseUrl: "http://localhost:11434"
    });
    const extractor = new EntityExtractor({
      llmProvider,
      chunkSize: 6e3
      // Smaller chunks for 3b model
    });
    const allEntities = /* @__PURE__ */ new Map();
    const entityToFiles = /* @__PURE__ */ new Map();
    for (const filePath of filesToProcess) {
      const relativePath = path8.relative(ctx.vaultPath, filePath);
      console.log(`
Extracting from: ${relativePath}`);
      const content = fs7.readFileSync(filePath, "utf-8");
      if (content.length < 100) {
        console.log("  Skipped (too small)");
        continue;
      }
      const spinner = new Spinner("Analyzing...");
      spinner.start();
      const result = await extractor.extractFromText(content, (current, total) => {
        spinner.update(`Chunk ${current}/${total}`);
      });
      spinner.stop();
      for (const entity of result.entities) {
        const key = entity.name.toLowerCase();
        const existing = allEntities.get(key);
        if (existing) {
          existing.mentions += entity.mentions;
          existing.aliases = [.../* @__PURE__ */ new Set([...existing.aliases, ...entity.aliases])];
          if (entity.description.length > existing.description.length) {
            existing.description = entity.description;
          }
        } else {
          allEntities.set(key, { ...entity });
        }
        if (!entityToFiles.has(key)) {
          entityToFiles.set(key, /* @__PURE__ */ new Set());
        }
        entityToFiles.get(key).add(relativePath);
      }
      if (options.verbose) {
        console.log(`  Found ${result.entities.length} entities`);
        for (const e of result.entities.slice(0, 10)) {
          console.log(`    - ${e.name} (${e.type})`);
        }
        if (result.entities.length > 10) {
          console.log(`    ... and ${result.entities.length - 10} more`);
        }
      }
    }
    const sortedEntities = Array.from(allEntities.values()).sort((a, b) => b.mentions - a.mentions);
    console.log("\n" + "=".repeat(50));
    console.log("Extracted Entities");
    console.log("=".repeat(50) + "\n");
    const byType = /* @__PURE__ */ new Map();
    for (const entity of sortedEntities) {
      const list = byType.get(entity.type) || [];
      list.push(entity);
      byType.set(entity.type, list);
    }
    for (const [type, entities] of byType) {
      console.log(`
${type.toUpperCase()}S (${entities.length}):`);
      const rows = entities.slice(0, 15).map((e) => [
        e.name,
        e.aliases.slice(0, 3).join(", ") || "-",
        e.mentions.toString(),
        e.description.slice(0, 50) + (e.description.length > 50 ? "..." : "")
      ]);
      printTable(["Name", "Aliases", "Refs", "Description"], rows);
      if (entities.length > 15) {
        console.log(`  ... and ${entities.length - 15} more`);
      }
    }
    console.log(`
Total: ${sortedEntities.length} entities`);
    if (!options.dryRun && sortedEntities.length > 0) {
      const outputDir = options.output ? path8.isAbsolute(options.output) ? options.output : path8.join(ctx.vaultPath, options.output) : path8.join(ctx.vaultPath, "entities");
      console.log(`
Creating entity files in: ${path8.relative(ctx.vaultPath, outputDir)}/`);
      const dirs = ["characters", "locations", "objects", "events"];
      for (const dir of dirs) {
        fs7.mkdirSync(path8.join(outputDir, dir), { recursive: true });
      }
      let created = 0;
      for (const entity of sortedEntities) {
        if (entity.mentions < 2) continue;
        const typeDir = entity.type === "character" ? "characters" : entity.type === "location" ? "locations" : entity.type === "object" ? "objects" : "events";
        const fileName = entity.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".md";
        const filePath = path8.join(outputDir, typeDir, fileName);
        if (fs7.existsSync(filePath)) {
          if (options.verbose) {
            console.log(`  Skipped (exists): ${typeDir}/${fileName}`);
          }
          continue;
        }
        const frontmatter = {
          id: nanoid6(),
          title: entity.name,
          type: entity.type
        };
        if (entity.aliases.length > 0) {
          frontmatter.aliases = entity.aliases;
        }
        const content = `---
${stringifyYaml4(frontmatter).trim()}
---

# ${entity.name}

${entity.description}

## Appearances

${Array.from(entityToFiles.get(entity.name.toLowerCase()) || []).map((f) => `- [[${path8.basename(f, ".md")}]]`).join("\n")}
`;
        fs7.writeFileSync(filePath, content, "utf-8");
        created++;
        if (options.verbose) {
          console.log(`  Created: ${typeDir}/${fileName}`);
        }
      }
      console.log(`
Created ${created} entity files.`);
      console.log("\nNext steps:");
      console.log("  zettel index     # Re-index to include new entities");
      console.log("  zettel discover --all  # Find unlinked mentions");
    }
    ctx.connectionManager.close();
  } catch (error) {
    console.error("Extraction failed:", error);
    process.exit(1);
  }
});

// src/cli/commands/generate.ts
import { Command as Command10 } from "commander";
import * as path12 from "path";

// src/generators/types.ts
function getLockLevel(entity) {
  if (entity.locked) {
    return "CRITICAL";
  }
  const sig = entity.significance?.toLowerCase() || "";
  if (sig.includes("critical") || sig.includes("essential")) {
    return "HIGH";
  }
  if (sig.includes("important") || sig.includes("significant")) {
    return "MEDIUM";
  }
  return "LOW";
}
var DIMENSIONAL_KEYWORDS = ["dimension", "portal", "void", "realm", "prison", "core", "barrier"];
var LIMINAL_KEYWORDS = ["threshold", "between", "transition", "edge", "boundary"];
var REAL_WORLD_KEYWORDS = ["house", "basement", "bedroom", "hospital", "street", "school", "lab"];
function classifyRealm(location) {
  if (location.realm) {
    return location.realm;
  }
  const locType = location.type?.toLowerCase() || "";
  if (locType.includes("dimensional") || locType === "dimensional_location") {
    return "dimensional";
  }
  if (locType.includes("real") || locType === "real_world_location") {
    return "real_world";
  }
  const name = location.name.toLowerCase();
  const desc2 = (location.description || "").toLowerCase();
  const combined = `${name} ${desc2}`;
  for (const keyword of DIMENSIONAL_KEYWORDS) {
    if (combined.includes(keyword)) {
      return "dimensional";
    }
  }
  for (const keyword of LIMINAL_KEYWORDS) {
    if (combined.includes(keyword)) {
      return "liminal";
    }
  }
  for (const keyword of REAL_WORLD_KEYWORDS) {
    if (combined.includes(keyword)) {
      return "real_world";
    }
  }
  return "unknown";
}

// src/generators/utils.ts
import * as fs8 from "fs";
import * as path9 from "path";
import { stringify as stringifyYaml5 } from "yaml";
function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ").trim().replace(/\s/g, "-").replace(/[^\w\-().]/g, "").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}
function generateNotePath(outputDir, subdir, name, extension = ".md") {
  const safeFilename = sanitizeFilename(name);
  return path9.join(outputDir, subdir, `${safeFilename}${extension}`);
}
function buildFrontmatter(data) {
  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== void 0 && v !== null)
  );
  if (Object.keys(cleaned).length === 0) {
    return "";
  }
  return `---
${stringifyYaml5(cleaned)}---

`;
}
function buildNote(frontmatter, content) {
  const fm = buildFrontmatter(frontmatter);
  return `${fm}${content}`;
}
function loadJson(filePath) {
  const content = fs8.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}
function parseKBJson(kbPath) {
  return loadJson(kbPath);
}
function parseArcLedger(arcLedgerPath) {
  return loadJson(arcLedgerPath);
}
function parseWorldRules(worldRulesPath) {
  return loadJson(worldRulesPath);
}
function findKBFiles(projectDir) {
  const result = {};
  const kbPaths = [
    path9.join(projectDir, ".narrative-project", "kb", "kb.json"),
    path9.join(projectDir, "kb", "kb.json"),
    path9.join(projectDir, "kb.json")
  ];
  const arcLedgerPaths = [
    path9.join(projectDir, ".narrative-project", "kb", "arc-ledger.json"),
    path9.join(projectDir, "kb", "arc-ledger.json"),
    path9.join(projectDir, "arc-ledger.json")
  ];
  const worldRulesPaths = [
    path9.join(projectDir, ".narrative-project", "kb", "world-rules.json"),
    path9.join(projectDir, "kb", "world-rules.json"),
    path9.join(projectDir, "world-rules.json")
  ];
  for (const p of kbPaths) {
    if (fs8.existsSync(p)) {
      result.kb = p;
      break;
    }
  }
  for (const p of arcLedgerPaths) {
    if (fs8.existsSync(p)) {
      result.arcLedger = p;
      break;
    }
  }
  for (const p of worldRulesPaths) {
    if (fs8.existsSync(p)) {
      result.worldRules = p;
      break;
    }
  }
  return result;
}
var EntityTracker = class {
  seen = /* @__PURE__ */ new Map();
  // lowercase -> canonical
  /**
   * Check if an entity has been seen
   */
  has(name) {
    return this.seen.has(name.toLowerCase());
  }
  /**
   * Add an entity to the tracker
   * Returns false if already present
   */
  add(name) {
    const lower = name.toLowerCase();
    if (this.seen.has(lower)) {
      return false;
    }
    this.seen.set(lower, name);
    return true;
  }
  /**
   * Get the canonical name for an entity
   */
  getCanonical(name) {
    return this.seen.get(name.toLowerCase());
  }
  /**
   * Get all tracked entities
   */
  getAll() {
    return Array.from(this.seen.values());
  }
};
async function writeNoteFile(filePath, content, options = {}) {
  if (options.dryRun) {
    console.log(`[DRY RUN] Would create: ${filePath}`);
    return true;
  }
  if (!options.force && fs8.existsSync(filePath)) {
    return false;
  }
  const dir = path9.dirname(filePath);
  await fs8.promises.mkdir(dir, { recursive: true });
  await fs8.promises.writeFile(filePath, content, "utf-8");
  return true;
}
function wikilink(target, display) {
  if (display && display !== target) {
    return `[[${target}|${display}]]`;
  }
  return `[[${target}]]`;
}
function formatList(items) {
  if (!items || items.length === 0) {
    return void 0;
  }
  return items;
}
function formatChapters(chapters) {
  if (!chapters || chapters.length === 0) {
    return "Unknown";
  }
  return chapters.join(", ");
}
function section(title, level = 2) {
  const hashes = "#".repeat(level);
  return `${hashes} ${title}

`;
}
function blockquote(text2) {
  return text2.split("\n").map((line) => `> ${line}`).join("\n");
}
function kvPair(key, value) {
  if (value === void 0 || value === null) {
    return "";
  }
  if (Array.isArray(value)) {
    return `**${key}:** ${value.join(", ")}`;
  }
  return `**${key}:** ${value}`;
}

// src/generators/relationships.ts
var DEFAULT_CO_OCCURRENCE_THRESHOLD = 2;
function normalizeName(s) {
  return s.toLowerCase().replace(/\s+/g, " ").replace(/[_-]+/g, " ").trim();
}
function getEventFilename(event) {
  const chapterStr = event.chapter.toString().padStart(2, "0");
  const eventNum = event.id.replace(/[^0-9]/g, "").padStart(3, "0");
  return `Event-${chapterStr}-${eventNum}`;
}
var RelationshipEngine = class {
  kb;
  entityIndex;
  nameToId;
  coOccurrenceThreshold;
  constructor(kb, coOccurrenceThreshold) {
    this.kb = kb;
    this.coOccurrenceThreshold = coOccurrenceThreshold ?? DEFAULT_CO_OCCURRENCE_THRESHOLD;
    this.entityIndex = /* @__PURE__ */ new Map();
    this.nameToId = /* @__PURE__ */ new Map();
    this.buildEntityIndex();
  }
  /**
   * Build an index of all entities for quick lookup
   */
  buildEntityIndex() {
    for (const char of this.kb.characters) {
      const info = {
        id: char.id,
        name: char.canonical_name,
        type: "character",
        chapters: char.chapters_present || [],
        linkTarget: char.canonical_name
      };
      this.entityIndex.set(char.id, info);
      this.nameToId.set(normalizeName(char.canonical_name), char.id);
      if (char.aliases) {
        for (const alias of char.aliases) {
          this.nameToId.set(normalizeName(alias), char.id);
        }
      }
    }
    if (this.kb.name_normalization) {
      for (const nn of this.kb.name_normalization) {
        const canonId = this.nameToId.get(normalizeName(nn.canonical));
        if (!canonId) continue;
        for (const variant of nn.variants || []) {
          this.nameToId.set(normalizeName(variant), canonId);
        }
      }
    }
    for (const loc of this.kb.locations) {
      const info = {
        id: loc.id,
        name: loc.name,
        type: "location",
        chapters: loc.chapters_seen || [],
        linkTarget: loc.name
      };
      this.entityIndex.set(loc.id, info);
      this.nameToId.set(normalizeName(loc.name), loc.id);
    }
    for (const obj of this.kb.objects) {
      const info = {
        id: obj.id,
        name: obj.name,
        type: "object",
        chapters: [],
        // Objects don't have chapter info directly - derived later
        linkTarget: obj.name
      };
      this.entityIndex.set(obj.id, info);
      this.nameToId.set(normalizeName(obj.name), obj.id);
    }
    for (const event of this.kb.timeline) {
      const info = {
        id: event.id,
        name: event.description,
        type: "event",
        chapters: [event.chapter],
        linkTarget: getEventFilename(event),
        linkDisplay: event.description
      };
      this.entityIndex.set(event.id, info);
    }
  }
  /**
   * Resolve a name or ID to an entity info
   */
  resolveEntity(nameOrId) {
    if (this.entityIndex.has(nameOrId)) {
      return this.entityIndex.get(nameOrId);
    }
    const id = this.nameToId.get(normalizeName(nameOrId));
    if (id) {
      return this.entityIndex.get(id);
    }
    return void 0;
  }
  /**
   * Get all relationships for a given entity
   */
  getRelationshipsFor(entityId) {
    const relationships = [];
    const seen = /* @__PURE__ */ new Set();
    const explicit = this.getExplicitRelationships(entityId);
    for (const rel of explicit) {
      const key = `${rel.targetId}:${rel.relationshipType}`;
      if (!seen.has(key)) {
        seen.add(key);
        relationships.push(rel);
      }
    }
    const inferred = this.getInferredRelationships(entityId);
    for (const rel of inferred) {
      const key = `${rel.targetId}:${rel.relationshipType}`;
      if (!seen.has(key)) {
        seen.add(key);
        relationships.push(rel);
      }
    }
    const coOccurrence = this.getCoOccurrenceRelationships(entityId);
    for (const rel of coOccurrence) {
      const hasExisting = relationships.some((r) => r.targetId === rel.targetId);
      if (!hasExisting) {
        relationships.push(rel);
      }
    }
    return relationships;
  }
  /**
   * Extract explicit relationships from kb.relationships[]
   */
  getExplicitRelationships(entityId) {
    const relationships = [];
    if (!this.kb.relationships) {
      return relationships;
    }
    for (const rel of this.kb.relationships) {
      let targetId = null;
      let type = rel.type;
      if (rel.sourceId === entityId) {
        targetId = rel.targetId;
      } else if (rel.targetId === entityId) {
        targetId = rel.sourceId;
        type = this.reverseRelationshipType(rel.type);
      }
      if (targetId) {
        const targetInfo = this.resolveEntity(targetId);
        if (targetInfo) {
          relationships.push({
            targetId: targetInfo.id,
            targetName: targetInfo.name,
            targetType: targetInfo.type,
            relationshipType: type,
            description: rel.description,
            chapters: rel.chapters,
            source: "explicit",
            linkTarget: targetInfo.linkTarget,
            linkDisplay: targetInfo.linkDisplay
          });
        }
      }
    }
    return relationships;
  }
  /**
   * Reverse a relationship type for bidirectional lookup
   */
  reverseRelationshipType(type) {
    switch (type) {
      case "owns":
      case "holds":
        return "holds";
      // object is held by
      case "formerly_held":
        return "formerly_held";
      case "mentor":
        return "mentor";
      // mentee relationship
      case "contains":
        return "contains";
      // contained by
      case "occurred_at":
        return "occurred_at";
      default:
        return type;
    }
  }
  /**
   * Infer relationships from entity fields
   */
  getInferredRelationships(entityId) {
    const relationships = [];
    const entity = this.entityIndex.get(entityId);
    if (!entity) {
      return relationships;
    }
    if (entity.type === "character") {
      const char = this.kb.characters.find((c) => c.id === entityId);
      if (char?.equipment) {
        for (const equipName of char.equipment) {
          const objInfo = this.resolveEntity(equipName);
          if (objInfo) {
            relationships.push({
              targetId: objInfo.id,
              targetName: objInfo.name,
              targetType: "object",
              relationshipType: "owns",
              source: "inferred",
              linkTarget: objInfo.linkTarget,
              linkDisplay: objInfo.linkDisplay
            });
          }
        }
      }
      for (const obj of this.kb.objects) {
        if (obj.holder) {
          const holderInfo = this.resolveEntity(obj.holder);
          if (holderInfo?.id === entityId) {
            const objEntityInfo = this.entityIndex.get(obj.id);
            relationships.push({
              targetId: obj.id,
              targetName: obj.name,
              targetType: "object",
              relationshipType: "owns",
              source: "inferred",
              linkTarget: objEntityInfo?.linkTarget || obj.name,
              linkDisplay: objEntityInfo?.linkDisplay
            });
          }
        }
      }
      for (const event of this.kb.timeline) {
        if (char?.chapters_present?.includes(event.chapter)) {
          const eventInfo = this.entityIndex.get(event.id);
          if (eventInfo) {
            relationships.push({
              targetId: event.id,
              targetName: event.description,
              targetType: "event",
              relationshipType: "participated",
              chapters: [event.chapter],
              source: "inferred",
              linkTarget: eventInfo.linkTarget,
              linkDisplay: eventInfo.linkDisplay
            });
          }
        }
      }
    }
    if (entity.type === "object") {
      const obj = this.kb.objects.find((o) => o.id === entityId);
      if (obj?.holder) {
        const charInfo = this.resolveEntity(obj.holder);
        if (charInfo) {
          relationships.push({
            targetId: charInfo.id,
            targetName: charInfo.name,
            targetType: "character",
            relationshipType: "holds",
            source: "inferred",
            linkTarget: charInfo.linkTarget,
            linkDisplay: charInfo.linkDisplay
          });
        }
      }
      if (obj?.holders) {
        for (const holderName of obj.holders) {
          if (obj.holder && normalizeName(holderName) === normalizeName(obj.holder)) continue;
          const charInfo = this.resolveEntity(holderName);
          if (charInfo) {
            relationships.push({
              targetId: charInfo.id,
              targetName: charInfo.name,
              targetType: "character",
              relationshipType: "formerly_held",
              source: "inferred",
              linkTarget: charInfo.linkTarget,
              linkDisplay: charInfo.linkDisplay
            });
          }
        }
      }
    }
    if (entity.type === "event") {
      const event = this.kb.timeline.find((e) => e.id === entityId);
      if (event) {
        for (const loc of this.kb.locations) {
          if (loc.chapters_seen?.includes(event.chapter)) {
            const locInfo = this.entityIndex.get(loc.id);
            if (locInfo) {
              relationships.push({
                targetId: loc.id,
                targetName: loc.name,
                targetType: "location",
                relationshipType: "occurred_at",
                chapters: [event.chapter],
                source: "inferred",
                linkTarget: locInfo.linkTarget,
                linkDisplay: locInfo.linkDisplay
              });
            }
          }
        }
        for (const char of this.kb.characters) {
          if (char.chapters_present?.includes(event.chapter)) {
            const charInfo = this.entityIndex.get(char.id);
            if (charInfo) {
              relationships.push({
                targetId: char.id,
                targetName: char.canonical_name,
                targetType: "character",
                relationshipType: "participated",
                chapters: [event.chapter],
                source: "inferred",
                linkTarget: charInfo.linkTarget,
                linkDisplay: charInfo.linkDisplay
              });
            }
          }
        }
      }
    }
    if (entity.type === "location") {
      const loc = this.kb.locations.find((l) => l.id === entityId);
      if (loc?.chapters_seen) {
        for (const event of this.kb.timeline) {
          if (loc.chapters_seen.includes(event.chapter)) {
            const eventInfo = this.entityIndex.get(event.id);
            if (eventInfo) {
              relationships.push({
                targetId: event.id,
                targetName: event.description,
                targetType: "event",
                relationshipType: "occurred_at",
                chapters: [event.chapter],
                source: "inferred",
                linkTarget: eventInfo.linkTarget,
                linkDisplay: eventInfo.linkDisplay
              });
            }
          }
        }
      }
    }
    return relationships;
  }
  /**
   * Compute co-occurrence relationships based on shared chapters
   */
  getCoOccurrenceRelationships(entityId) {
    const relationships = [];
    const entity = this.entityIndex.get(entityId);
    if (!entity || entity.chapters.length === 0) {
      return relationships;
    }
    const entityChapters = new Set(entity.chapters);
    for (const [otherId, otherInfo] of this.entityIndex) {
      if (otherId === entityId) continue;
      let otherChapters = otherInfo.chapters;
      if (otherInfo.type === "object" && otherChapters.length === 0) {
        otherChapters = this.deriveObjectChapters(otherId);
      }
      if (otherChapters.length === 0) continue;
      const sharedChapters = otherChapters.filter((ch) => entityChapters.has(ch));
      if (sharedChapters.length >= this.coOccurrenceThreshold) {
        relationships.push({
          targetId: otherInfo.id,
          targetName: otherInfo.name,
          targetType: otherInfo.type,
          relationshipType: "co_occurrence",
          chapters: sharedChapters.sort((a, b) => a - b),
          source: "co_occurrence",
          linkTarget: otherInfo.linkTarget,
          linkDisplay: otherInfo.linkDisplay
        });
      }
    }
    return relationships;
  }
  /**
   * Derive chapter presence for an object from holder relationships
   */
  deriveObjectChapters(objectId) {
    const chapters = /* @__PURE__ */ new Set();
    const obj = this.kb.objects.find((o) => o.id === objectId);
    if (!obj) return [];
    if (obj.holder) {
      const holderInfo = this.resolveEntity(obj.holder);
      if (holderInfo) {
        for (const ch of holderInfo.chapters) {
          chapters.add(ch);
        }
      }
    }
    if (obj.holders) {
      for (const holderName of obj.holders) {
        const holderInfo = this.resolveEntity(holderName);
        if (holderInfo) {
          for (const ch of holderInfo.chapters) {
            chapters.add(ch);
          }
        }
      }
    }
    return Array.from(chapters).sort((a, b) => a - b);
  }
  /**
   * Group relationships by entity type
   */
  groupByEntityType(relationships) {
    const grouped = /* @__PURE__ */ new Map();
    for (const rel of relationships) {
      const existing = grouped.get(rel.targetType) || [];
      existing.push(rel);
      grouped.set(rel.targetType, existing);
    }
    return grouped;
  }
  /**
   * Group relationships by relationship kind
   */
  groupByType(relationships) {
    const grouped = /* @__PURE__ */ new Map();
    for (const rel of relationships) {
      const existing = grouped.get(rel.relationshipType) || [];
      existing.push(rel);
      grouped.set(rel.relationshipType, existing);
    }
    return grouped;
  }
};

// src/generators/related-entities.ts
function formatChapterList(chapters) {
  if (!chapters || chapters.length === 0) {
    return "";
  }
  const ranges = [];
  let rangeStart = chapters[0];
  let rangeEnd = chapters[0];
  for (let i = 1; i <= chapters.length; i++) {
    if (i < chapters.length && chapters[i] === rangeEnd + 1) {
      rangeEnd = chapters[i];
    } else {
      if (rangeStart === rangeEnd) {
        ranges.push(String(rangeStart));
      } else if (rangeEnd === rangeStart + 1) {
        ranges.push(`${rangeStart}, ${rangeEnd}`);
      } else {
        ranges.push(`${rangeStart}-${rangeEnd}`);
      }
      if (i < chapters.length) {
        rangeStart = chapters[i];
        rangeEnd = chapters[i];
      }
    }
  }
  return `Ch. ${ranges.join(", ")}`;
}
function formatRelationshipType(type) {
  switch (type) {
    case "ally":
      return "ally";
    case "enemy":
      return "enemy";
    case "family":
      return "family";
    case "mentor":
      return "mentor";
    case "rival":
      return "rival";
    case "visits":
      return "visits";
    case "resides":
      return "residence";
    case "owns":
      return "owns";
    case "holds":
      return "held by";
    case "formerly_held":
      return "formerly held by";
    case "participated":
      return "participated";
    case "witnessed":
      return "witnessed";
    case "contains":
      return "contains";
    case "occurred_at":
      return "occurred at";
    case "co_occurrence":
      return "appears with";
    case "associated":
      return "associated";
    default:
      return type;
  }
}
function getEntityTypeSectionName(type) {
  switch (type) {
    case "character":
      return "Characters";
    case "location":
      return "Locations";
    case "object":
      return "Objects";
    case "event":
      return "Events";
    default:
      return "Other";
  }
}
function buildRelationshipLine(rel) {
  const link = rel.linkDisplay ? wikilink(rel.linkTarget || rel.targetName, rel.linkDisplay) : wikilink(rel.linkTarget || rel.targetName);
  const relType = formatRelationshipType(rel.relationshipType);
  const chapters = formatChapterList(rel.chapters);
  let line = `- ${link}`;
  if (rel.relationshipType !== "co_occurrence") {
    line += ` - ${relType}`;
  }
  if (chapters) {
    line += ` (${chapters})`;
  }
  return line;
}
function buildRelatedEntitiesSection(relationships) {
  if (relationships.length === 0) {
    return "";
  }
  const parts = [];
  parts.push(section("Related Entities"));
  const grouped = /* @__PURE__ */ new Map();
  for (const rel of relationships) {
    const existing = grouped.get(rel.targetType) || [];
    existing.push(rel);
    grouped.set(rel.targetType, existing);
  }
  const typeOrder = ["character", "location", "object", "event"];
  for (const entityType of typeOrder) {
    const rels = grouped.get(entityType);
    if (!rels || rels.length === 0) continue;
    rels.sort((a, b) => {
      const sourceOrder = { explicit: 0, inferred: 1, co_occurrence: 2 };
      const sourceCompare = sourceOrder[a.source] - sourceOrder[b.source];
      if (sourceCompare !== 0) return sourceCompare;
      return a.targetName.localeCompare(b.targetName);
    });
    parts.push(section(getEntityTypeSectionName(entityType), 3));
    for (const rel of rels) {
      parts.push(buildRelationshipLine(rel) + "\n");
    }
    parts.push("\n");
  }
  return parts.join("");
}
function shouldIncludeRelatedEntities(includeRelatedEntities) {
  return includeRelatedEntities !== false;
}

// src/generators/characters.ts
var CHARACTERS_SUBDIR = "Characters";
function buildCharacterFrontmatter(char) {
  return {
    id: char.id,
    type: "character",
    title: char.canonical_name,
    aliases: formatList(char.aliases),
    role: char.role,
    tags: buildTags(char),
    first_appearance: char.first_appearance,
    last_appearance: char.last_appearance,
    chapters: formatList(char.chapters_present?.map(String)),
    age: char.age,
    arc_type: char.arc?.type,
    arc_status: char.arc?.resolution?.status
  };
}
function buildTags(char) {
  const tags = ["character"];
  const role = char.role.toLowerCase();
  if (role.includes("protagonist")) {
    tags.push("protagonist");
  } else if (role.includes("antagonist")) {
    tags.push("antagonist");
  } else if (role.includes("supporting")) {
    tags.push("supporting-character");
  } else if (role.includes("mentor")) {
    tags.push("mentor");
  } else if (role.includes("minor")) {
    tags.push("minor-character");
  }
  if (char.arc?.resolution?.status) {
    const status = char.arc.resolution.status.toLowerCase();
    if (status === "resolved") {
      tags.push("arc-resolved");
    } else if (status === "destroyed") {
      tags.push("arc-destroyed");
    } else if (status === "setup") {
      tags.push("arc-setup");
    }
  }
  return tags;
}
function buildCharacterContent(char, relationshipEngine, includeRelated) {
  const parts = [];
  parts.push(`# ${char.canonical_name}

`);
  parts.push(section("Overview"));
  const overview = [];
  overview.push(kvPair("Role", char.role));
  if (char.age) {
    overview.push(kvPair("Age", char.age));
  }
  if (char.chapters_present) {
    overview.push(kvPair("Chapters", formatChapters(char.chapters_present)));
  }
  if (char.relationship_to_protagonist) {
    overview.push(kvPair("Relationship", char.relationship_to_protagonist));
  }
  parts.push(overview.filter(Boolean).join("\n") + "\n\n");
  if (char.aliases && char.aliases.length > 0) {
    parts.push(section("Aliases", 3));
    parts.push(char.aliases.map((a) => `- ${a}`).join("\n") + "\n\n");
  }
  if (char.physical && Object.keys(char.physical).length > 0) {
    parts.push(section("Physical Description"));
    for (const [key, value] of Object.entries(char.physical)) {
      if (Array.isArray(value)) {
        parts.push(`**${key}:**
`);
        parts.push(value.map((v) => `- ${v}`).join("\n") + "\n\n");
      } else if (value) {
        parts.push(`- **${key}:** ${value}
`);
      }
    }
    parts.push("\n");
  }
  if (char.personality && char.personality.length > 0) {
    parts.push(section("Personality"));
    parts.push(char.personality.map((p) => `- ${p}`).join("\n") + "\n\n");
  }
  if (char.abilities && Object.keys(char.abilities).length > 0) {
    parts.push(section("Abilities"));
    for (const [name, details] of Object.entries(char.abilities)) {
      if (typeof details === "object" && details !== null) {
        const d = details;
        parts.push(`### ${name}
`);
        if (d.status) {
          parts.push(`- **Status:** ${d.status}
`);
        }
        if (d.notes) {
          parts.push(`- **Notes:** ${d.notes}
`);
        }
        parts.push("\n");
      } else {
        parts.push(`- **${name}:** ${details}
`);
      }
    }
    parts.push("\n");
  }
  if (char.equipment && char.equipment.length > 0) {
    parts.push(section("Equipment"));
    parts.push(char.equipment.map((e) => `- ${wikilink(e)}`).join("\n") + "\n\n");
  }
  if (shouldIncludeRelatedEntities(includeRelated) && relationshipEngine) {
    const relationships = relationshipEngine.getRelationshipsFor(char.id);
    const relatedSection = buildRelatedEntitiesSection(relationships);
    if (relatedSection) {
      parts.push(relatedSection);
    }
  }
  if (char.coping_mechanism) {
    parts.push(section("Coping Mechanism"));
    const cm = char.coping_mechanism;
    if (typeof cm === "object") {
      for (const [key, value] of Object.entries(cm)) {
        parts.push(`- **${key}:** ${value}
`);
      }
    } else {
      parts.push(`${cm}
`);
    }
    parts.push("\n");
  }
  if (char.arc) {
    parts.push(buildArcSection(char.arc));
  }
  if (char.key_quote) {
    parts.push(section("Key Quote"));
    parts.push(blockquote(char.key_quote) + "\n\n");
  }
  if (char.final_words) {
    parts.push(section("Final Words"));
    parts.push(blockquote(char.final_words) + "\n\n");
  }
  if (char.backstory && Object.keys(char.backstory).length > 0) {
    parts.push(section("Backstory"));
    for (const [key, value] of Object.entries(char.backstory)) {
      parts.push(`- **${key}:** ${value}
`);
    }
    parts.push("\n");
  }
  if (char.entry_state && Object.keys(char.entry_state).length > 0) {
    parts.push(section("Entry State"));
    parts.push(formatStateObject(char.entry_state));
  }
  if (char.exit_state && Object.keys(char.exit_state).length > 0) {
    parts.push(section("Exit State"));
    parts.push(formatStateObject(char.exit_state));
  }
  return parts.join("");
}
function buildArcSection(arc) {
  const parts = [];
  parts.push(section("Character Arc"));
  parts.push(`**Type:** ${arc.type}

`);
  parts.push(`${arc.description}

`);
  if (arc.key_moments && arc.key_moments.length > 0) {
    parts.push(section("Key Moments", 3));
    for (const moment of arc.key_moments) {
      parts.push(`- **Chapter ${moment.chapter} - ${moment.beat}:** ${moment.description}
`);
    }
    parts.push("\n");
  }
  if (arc.resolution) {
    parts.push(section("Resolution", 3));
    parts.push(`**Status:** ${arc.resolution.status}

`);
    if (arc.resolution.chapter) {
      parts.push(`**Chapter:** ${arc.resolution.chapter}

`);
    }
    if (arc.resolution.key_line) {
      parts.push(blockquote(arc.resolution.key_line) + "\n\n");
    }
    if (arc.resolution.mechanism) {
      parts.push(`*${arc.resolution.mechanism}*

`);
    }
  }
  return parts.join("");
}
function formatStateObject(state) {
  const lines = [];
  for (const [key, value] of Object.entries(state)) {
    if (value === void 0 || value === null) continue;
    if (Array.isArray(value)) {
      lines.push(`- **${key}:**`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else if (typeof value === "object") {
      lines.push(`- **${key}:**`);
      for (const [k, v] of Object.entries(value)) {
        lines.push(`  - ${k}: ${v}`);
      }
    } else {
      lines.push(`- **${key}:** ${value}`);
    }
  }
  return lines.join("\n") + "\n\n";
}
async function generateCharacters(options) {
  const result = {
    created: [],
    skipped: [],
    errors: [],
    summary: ""
  };
  let kb;
  try {
    if (!options.kbPath) {
      throw new Error("KB path is required");
    }
    kb = parseKBJson(options.kbPath);
  } catch (error) {
    result.errors.push({
      file: options.kbPath || "unknown",
      error: `Failed to load KB: ${error}`
    });
    result.summary = "Failed to load KB data";
    return result;
  }
  const tracker = new EntityTracker();
  const relationshipEngine = new RelationshipEngine(kb, options.coOccurrenceThreshold);
  const includeRelated = shouldIncludeRelatedEntities(options.includeRelatedEntities);
  for (const char of kb.characters) {
    const name = char.canonical_name;
    if (!tracker.add(name)) {
      if (options.verbose) {
        console.log(`Skipping duplicate character: ${name}`);
      }
      continue;
    }
    try {
      const filePath = generateNotePath(options.outputDir, CHARACTERS_SUBDIR, name);
      const frontmatter = buildCharacterFrontmatter(char);
      const content = buildCharacterContent(char, relationshipEngine, includeRelated);
      const note = buildNote(frontmatter, content);
      const written = await writeNoteFile(filePath, note, {
        force: options.force,
        dryRun: options.dryRun
      });
      if (written) {
        result.created.push(filePath);
        if (options.verbose) {
          console.log(`Created: ${filePath}`);
        }
      } else {
        result.skipped.push(filePath);
        if (options.verbose) {
          console.log(`Skipped (exists): ${filePath}`);
        }
      }
    } catch (error) {
      result.errors.push({
        file: name,
        error: `${error}`
      });
    }
  }
  result.summary = `Characters: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`;
  return result;
}

// src/generators/chapters.ts
import * as fs9 from "fs";
import * as path10 from "path";
var CHAPTERS_SUBDIR = "Chapters";
var CHAPTER_REGEX = /^##\s*Chapter\s+(\d+)(?:\s*[:\-–—]\s*(.+))?$/im;
var ALT_CHAPTER_PATTERNS = [
  /^#\s*Chapter\s+(\d+)(?:\s*[:\-–—]\s*(.+))?$/im,
  // Single hash
  /^###\s*Chapter\s+(\d+)(?:\s*[:\-–—]\s*(.+))?$/im,
  // Triple hash
  /^Chapter\s+(\d+)(?:\s*[:\-–—]\s*(.+))?$/im,
  // No hash
  /^##\s+(\d+)\.?\s+(.+)$/im
  // ## 1. Title
];
function parseChapters(content) {
  const lines = content.split("\n");
  const chapters = [];
  let currentChapter = null;
  let contentLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    let match = line.match(CHAPTER_REGEX);
    if (!match) {
      for (const pattern of ALT_CHAPTER_PATTERNS) {
        match = line.match(pattern);
        if (match) break;
      }
    }
    if (match) {
      if (currentChapter) {
        currentChapter.content = contentLines.join("\n").trim();
        currentChapter.endLine = i - 1;
        chapters.push(currentChapter);
      }
      const chapterNum = parseInt(match[1] ?? "0", 10);
      const chapterTitle = match[2]?.trim() ?? null;
      currentChapter = {
        number: chapterNum,
        title: chapterTitle,
        content: "",
        startLine: i,
        endLine: i
      };
      contentLines = [];
    } else if (currentChapter) {
      contentLines.push(line);
    }
  }
  if (currentChapter) {
    currentChapter.content = contentLines.join("\n").trim();
    currentChapter.endLine = lines.length - 1;
    chapters.push(currentChapter);
  }
  return chapters;
}
function buildChapterFrontmatter(chapter) {
  return {
    type: "scene",
    title: chapter.title || `Chapter ${chapter.number}`,
    chapter: chapter.number,
    scene_order: chapter.number,
    tags: ["chapter"]
  };
}
function buildChapterContent(chapter) {
  const parts = [];
  const title = chapter.title ? `# Chapter ${chapter.number}: ${chapter.title}` : `# Chapter ${chapter.number}`;
  parts.push(title + "\n\n");
  parts.push(chapter.content);
  return parts.join("");
}
function getChapterFilename(chapter) {
  const numStr = chapter.number.toString().padStart(2, "0");
  if (chapter.title) {
    const safeTitle = sanitizeFilename(chapter.title);
    return `Chapter-${numStr}-${safeTitle}`;
  }
  return `Chapter-${numStr}`;
}
async function generateChapters(options) {
  const result = {
    created: [],
    skipped: [],
    errors: [],
    summary: ""
  };
  let manuscript;
  try {
    manuscript = fs9.readFileSync(options.manuscriptPath, "utf-8");
  } catch (error) {
    result.errors.push({
      file: options.manuscriptPath,
      error: `Failed to read manuscript: ${error}`
    });
    result.summary = "Failed to read manuscript";
    return result;
  }
  const chapters = parseChapters(manuscript);
  if (chapters.length === 0) {
    result.summary = "No chapters found in manuscript";
    return result;
  }
  if (options.verbose) {
    console.log(`Found ${chapters.length} chapters in manuscript`);
  }
  const chaptersDir = options.chaptersDir || CHAPTERS_SUBDIR;
  for (const chapter of chapters) {
    try {
      const filename = getChapterFilename(chapter);
      const filePath = path10.join(options.outputDir, chaptersDir, `${filename}.md`);
      const frontmatter = buildChapterFrontmatter(chapter);
      const content = buildChapterContent(chapter);
      const note = buildNote(frontmatter, content);
      const written = await writeNoteFile(filePath, note, {
        force: options.force,
        dryRun: options.dryRun
      });
      if (written) {
        result.created.push(filePath);
        if (options.verbose) {
          console.log(`Created: ${filePath}`);
        }
      } else {
        result.skipped.push(filePath);
        if (options.verbose) {
          console.log(`Skipped (exists): ${filePath}`);
        }
      }
    } catch (error) {
      result.errors.push({
        file: `Chapter ${chapter.number}`,
        error: `${error}`
      });
    }
  }
  result.summary = `Chapters: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`;
  return result;
}

// src/generators/locations.ts
var LOCATIONS_SUBDIR = "Locations";
function buildLocationFrontmatter(loc) {
  const realm = classifyRealm(loc);
  return {
    id: loc.id,
    type: "location",
    title: loc.name,
    location_type: loc.type,
    realm,
    tags: buildTags2(loc, realm),
    first_appearance: loc.first_appearance,
    chapters: formatList(loc.chapters_seen?.map(String))
  };
}
function buildTags2(loc, realm) {
  const tags = ["location"];
  switch (realm) {
    case "dimensional":
      tags.push("dimensional");
      break;
    case "real_world":
      tags.push("real-world");
      break;
    case "liminal":
      tags.push("liminal");
      break;
  }
  const locType = loc.type.toLowerCase().replace(/[_\s]+/g, "-");
  if (locType && !tags.includes(locType)) {
    tags.push(locType);
  }
  return tags;
}
function buildLocationContent(loc, relationshipEngine, includeRelated) {
  const parts = [];
  const realm = classifyRealm(loc);
  parts.push(`# ${loc.name}

`);
  parts.push(section("Overview"));
  const overview = [];
  overview.push(kvPair("Type", loc.type.replace(/_/g, " ")));
  overview.push(kvPair("Realm", formatRealmName(realm)));
  if (loc.first_appearance) {
    overview.push(kvPair("First Appearance", `Chapter ${loc.first_appearance}`));
  }
  if (loc.chapters_seen) {
    overview.push(kvPair("Chapters", formatChapters(loc.chapters_seen)));
  }
  parts.push(overview.filter(Boolean).join("\n") + "\n\n");
  if (loc.description) {
    parts.push(section("Description"));
    parts.push(loc.description + "\n\n");
  }
  if (loc.features && loc.features.length > 0) {
    parts.push(section("Features"));
    parts.push(loc.features.map((f) => `- ${f}`).join("\n") + "\n\n");
  }
  if (shouldIncludeRelatedEntities(includeRelated) && relationshipEngine) {
    const relationships = relationshipEngine.getRelationshipsFor(loc.id);
    const relatedSection = buildRelatedEntitiesSection(relationships);
    if (relatedSection) {
      parts.push(relatedSection);
    }
  }
  if (realm === "dimensional") {
    parts.push(section("Dimensional Properties"));
    parts.push("*This location exists in a dimensional space.*\n\n");
    parts.push("- [ ] Portal access documented\n");
    parts.push("- [ ] Time dilation effects noted\n");
    parts.push("- [ ] Environmental hazards catalogued\n\n");
  }
  parts.push(section("Connections"));
  parts.push("*Characters and events associated with this location:*\n\n");
  parts.push("```dataview\n");
  parts.push(`LIST FROM ""
`);
  parts.push(`WHERE contains(locations, "${loc.name}")
`);
  parts.push("```\n\n");
  return parts.join("");
}
function formatRealmName(realm) {
  switch (realm) {
    case "real_world":
      return "Real World";
    case "dimensional":
      return "Dimensional";
    case "liminal":
      return "Liminal Space";
    case "unknown":
      return "Unknown";
  }
}
async function generateLocations(options) {
  const result = {
    created: [],
    skipped: [],
    errors: [],
    summary: ""
  };
  let kb;
  try {
    if (!options.kbPath) {
      throw new Error("KB path is required");
    }
    kb = parseKBJson(options.kbPath);
  } catch (error) {
    result.errors.push({
      file: options.kbPath || "unknown",
      error: `Failed to load KB: ${error}`
    });
    result.summary = "Failed to load KB data";
    return result;
  }
  const tracker = new EntityTracker();
  const relationshipEngine = new RelationshipEngine(kb, options.coOccurrenceThreshold);
  const includeRelated = shouldIncludeRelatedEntities(options.includeRelatedEntities);
  for (const loc of kb.locations) {
    const name = loc.name;
    if (!tracker.add(name)) {
      if (options.verbose) {
        console.log(`Skipping duplicate location: ${name}`);
      }
      continue;
    }
    try {
      const filePath = generateNotePath(options.outputDir, LOCATIONS_SUBDIR, name);
      const frontmatter = buildLocationFrontmatter(loc);
      const content = buildLocationContent(loc, relationshipEngine, includeRelated);
      const note = buildNote(frontmatter, content);
      const written = await writeNoteFile(filePath, note, {
        force: options.force,
        dryRun: options.dryRun
      });
      if (written) {
        result.created.push(filePath);
        if (options.verbose) {
          console.log(`Created: ${filePath}`);
        }
      } else {
        result.skipped.push(filePath);
        if (options.verbose) {
          console.log(`Skipped (exists): ${filePath}`);
        }
      }
    } catch (error) {
      result.errors.push({
        file: name,
        error: `${error}`
      });
    }
  }
  result.summary = `Locations: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`;
  return result;
}

// src/generators/objects.ts
var OBJECTS_SUBDIR = "Objects";
function buildObjectFrontmatter(obj) {
  const lockLevel = getLockLevel(obj);
  return {
    id: obj.id,
    type: "object",
    title: obj.name,
    object_type: obj.type,
    lock_level: lockLevel,
    locked: obj.locked || false,
    tags: buildTags3(obj, lockLevel),
    holder: obj.holder || void 0,
    status: obj.status || void 0
  };
}
function buildTags3(obj, lockLevel) {
  const tags = ["object"];
  const objType = obj.type.toLowerCase().replace(/[_\s]+/g, "-");
  if (objType && !tags.includes(objType)) {
    tags.push(objType);
  }
  if (lockLevel === "CRITICAL") {
    tags.push("critical-item");
  } else if (lockLevel === "HIGH") {
    tags.push("important-item");
  }
  if (obj.locked) {
    tags.push("locked");
  }
  return tags;
}
function getLockIcon(lockLevel) {
  switch (lockLevel) {
    case "CRITICAL":
      return "\u{1F512}";
    case "HIGH":
      return "\u26A0\uFE0F";
    case "MEDIUM":
      return "\u{1F4CC}";
    case "LOW":
      return "\u{1F4CE}";
  }
}
function buildObjectContent(obj, relationshipEngine, includeRelated) {
  const parts = [];
  const lockLevel = getLockLevel(obj);
  const lockIcon = getLockIcon(lockLevel);
  parts.push(`# ${obj.name} ${obj.locked ? lockIcon : ""}

`);
  parts.push(section("Overview"));
  const overview = [];
  overview.push(kvPair("Type", obj.type.replace(/_/g, " ")));
  overview.push(kvPair("Lock Level", `${lockLevel} ${lockIcon}`));
  if (obj.holder) {
    overview.push(kvPair("Current Holder", wikilink(obj.holder)));
  }
  if (obj.holders && obj.holders.length > 0) {
    const holderLinks = obj.holders.map((h) => wikilink(h)).join(", ");
    overview.push(kvPair("Holders", holderLinks));
  }
  if (obj.status) {
    overview.push(kvPair("Status", obj.status));
  }
  parts.push(overview.filter(Boolean).join("\n") + "\n\n");
  if (obj.description) {
    parts.push(section("Description"));
    parts.push(obj.description + "\n\n");
  }
  if (obj.properties && obj.properties.length > 0) {
    parts.push(section("Properties"));
    parts.push(obj.properties.map((p) => `- ${p}`).join("\n") + "\n\n");
  }
  if (obj.significance) {
    parts.push(section("Significance"));
    parts.push(obj.significance + "\n\n");
  }
  if (shouldIncludeRelatedEntities(includeRelated) && relationshipEngine) {
    const relationships = relationshipEngine.getRelationshipsFor(obj.id);
    const relatedSection = buildRelatedEntitiesSection(relationships);
    if (relatedSection) {
      parts.push(relatedSection);
    }
  }
  if (lockLevel === "CRITICAL") {
    parts.push(section("Continuity Lock", 3));
    parts.push("> \u26A0\uFE0F **This item is locked for continuity.**\n");
    parts.push("> Any changes to this item may affect established story elements.\n\n");
  }
  parts.push(section("Appearances"));
  parts.push("*Scenes and events involving this object:*\n\n");
  parts.push("```dataview\n");
  parts.push(`LIST FROM ""
`);
  parts.push(`WHERE contains(file.outlinks, this.file.link)
`);
  parts.push("```\n\n");
  return parts.join("");
}
async function generateObjects(options) {
  const result = {
    created: [],
    skipped: [],
    errors: [],
    summary: ""
  };
  let kb;
  try {
    if (!options.kbPath) {
      throw new Error("KB path is required");
    }
    kb = parseKBJson(options.kbPath);
  } catch (error) {
    result.errors.push({
      file: options.kbPath || "unknown",
      error: `Failed to load KB: ${error}`
    });
    result.summary = "Failed to load KB data";
    return result;
  }
  const tracker = new EntityTracker();
  const relationshipEngine = new RelationshipEngine(kb, options.coOccurrenceThreshold);
  const includeRelated = shouldIncludeRelatedEntities(options.includeRelatedEntities);
  for (const obj of kb.objects) {
    const name = obj.name;
    if (!tracker.add(name)) {
      if (options.verbose) {
        console.log(`Skipping duplicate object: ${name}`);
      }
      continue;
    }
    try {
      const filePath = generateNotePath(options.outputDir, OBJECTS_SUBDIR, name);
      const frontmatter = buildObjectFrontmatter(obj);
      const content = buildObjectContent(obj, relationshipEngine, includeRelated);
      const note = buildNote(frontmatter, content);
      const written = await writeNoteFile(filePath, note, {
        force: options.force,
        dryRun: options.dryRun
      });
      if (written) {
        result.created.push(filePath);
        if (options.verbose) {
          console.log(`Created: ${filePath}`);
        }
      } else {
        result.skipped.push(filePath);
        if (options.verbose) {
          console.log(`Skipped (exists): ${filePath}`);
        }
      }
    } catch (error) {
      result.errors.push({
        file: name,
        error: `${error}`
      });
    }
  }
  result.summary = `Objects: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`;
  return result;
}

// src/generators/lore.ts
var LORE_SUBDIR = "Lore";
function buildRuleFrontmatter(rule) {
  return {
    id: rule.id,
    type: "concept",
    title: rule.name,
    category: rule.category,
    locked: rule.locked || false,
    tags: buildRuleTags(rule)
  };
}
function buildRuleTags(rule) {
  const tags = ["lore", "world-rule"];
  const category = rule.category.toLowerCase().replace(/[_\s]+/g, "-");
  if (category && !tags.includes(category)) {
    tags.push(category);
  }
  if (rule.locked) {
    tags.push("locked");
  }
  return tags;
}
function buildRuleContent(rule) {
  const parts = [];
  parts.push(`# ${rule.name}

`);
  parts.push(`**Category:** ${rule.category}

`);
  if (rule.locked) {
    parts.push("> \u{1F512} **This rule is locked for continuity.**\n\n");
  }
  parts.push(section("Description"));
  parts.push(rule.description + "\n\n");
  if (rule.examples && rule.examples.length > 0) {
    parts.push(section("Examples"));
    parts.push(rule.examples.map((e) => `- ${e}`).join("\n") + "\n\n");
  }
  if (rule.exceptions && rule.exceptions.length > 0) {
    parts.push(section("Exceptions"));
    parts.push(rule.exceptions.map((e) => `- ${e}`).join("\n") + "\n\n");
  }
  if (rule.source) {
    parts.push(section("Source", 3));
    parts.push(`*${rule.source}*

`);
  }
  return parts.join("");
}
function buildFactFrontmatter(fact) {
  return {
    id: fact.id,
    type: "concept",
    title: extractFactTitle(fact.fact),
    source: fact.source,
    locked: fact.locked || false,
    tags: ["lore", "fact", fact.locked ? "locked" : void 0].filter(Boolean)
  };
}
function extractFactTitle(fact) {
  const firstSentence = fact.split(".")[0];
  if (firstSentence && firstSentence.length <= 60) {
    return firstSentence;
  }
  return fact.slice(0, 50) + "...";
}
function buildFactContent(fact) {
  const parts = [];
  parts.push(`# ${extractFactTitle(fact.fact)}

`);
  if (fact.locked) {
    parts.push("> \u{1F512} **This fact is locked for continuity.**\n\n");
  }
  parts.push(section("Fact"));
  parts.push(blockquote(fact.fact) + "\n\n");
  parts.push(section("Source", 3));
  parts.push(`*${fact.source}*

`);
  return parts.join("");
}
async function generateLore(options) {
  const result = {
    created: [],
    skipped: [],
    errors: [],
    summary: ""
  };
  const tracker = new EntityTracker();
  if (options.worldRulesPath) {
    try {
      const worldRules = parseWorldRules(options.worldRulesPath);
      await processWorldRules(worldRules, options, result, tracker);
    } catch (error) {
      result.errors.push({
        file: options.worldRulesPath,
        error: `Failed to load world rules: ${error}`
      });
    }
  }
  if (options.kbPath) {
    try {
      const kb = parseKBJson(options.kbPath);
      await processKBFacts(kb, options, result, tracker);
    } catch (error) {
      result.errors.push({
        file: options.kbPath,
        error: `Failed to load KB: ${error}`
      });
    }
  }
  if (!options.kbPath && !options.worldRulesPath) {
    result.summary = "No KB or world rules path provided";
    return result;
  }
  result.summary = `Lore: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`;
  return result;
}
async function processWorldRules(worldRules, options, result, tracker) {
  const allRules = [
    ...worldRules.rules || [],
    ...worldRules.mechanics || [],
    ...worldRules.constraints || []
  ];
  for (const rule of allRules) {
    const name = rule.name;
    if (!tracker.add(name)) {
      if (options.verbose) {
        console.log(`Skipping duplicate rule: ${name}`);
      }
      continue;
    }
    try {
      const filePath = generateNotePath(options.outputDir, LORE_SUBDIR, name);
      const frontmatter = buildRuleFrontmatter(rule);
      const content = buildRuleContent(rule);
      const note = buildNote(frontmatter, content);
      const written = await writeNoteFile(filePath, note, {
        force: options.force,
        dryRun: options.dryRun
      });
      if (written) {
        result.created.push(filePath);
        if (options.verbose) {
          console.log(`Created: ${filePath}`);
        }
      } else {
        result.skipped.push(filePath);
        if (options.verbose) {
          console.log(`Skipped (exists): ${filePath}`);
        }
      }
    } catch (error) {
      result.errors.push({
        file: name,
        error: `${error}`
      });
    }
  }
}
async function processKBFacts(kb, options, result, tracker) {
  const facts = kb.facts || [];
  for (const fact of facts) {
    const name = fact.id;
    if (!tracker.add(name)) {
      if (options.verbose) {
        console.log(`Skipping duplicate fact: ${name}`);
      }
      continue;
    }
    try {
      const filePath = generateNotePath(options.outputDir, `${LORE_SUBDIR}/Facts`, name);
      const frontmatter = buildFactFrontmatter(fact);
      const content = buildFactContent(fact);
      const note = buildNote(frontmatter, content);
      const written = await writeNoteFile(filePath, note, {
        force: options.force,
        dryRun: options.dryRun
      });
      if (written) {
        result.created.push(filePath);
        if (options.verbose) {
          console.log(`Created: ${filePath}`);
        }
      } else {
        result.skipped.push(filePath);
        if (options.verbose) {
          console.log(`Skipped (exists): ${filePath}`);
        }
      }
    } catch (error) {
      result.errors.push({
        file: name,
        error: `${error}`
      });
    }
  }
}

// src/generators/timeline.ts
var TIMELINE_SUBDIR = "Timeline";
function buildEventFrontmatter(event) {
  return {
    id: event.id,
    type: "event",
    title: formatEventTitle(event),
    chapter: event.chapter,
    locked: event.locked || false,
    tags: buildTags4(event),
    timeline_position: `chapter-${event.chapter}`
  };
}
function formatEventTitle(event) {
  const desc2 = event.description;
  if (desc2.length <= 60) {
    return desc2;
  }
  return desc2.slice(0, 57) + "...";
}
function buildTags4(event) {
  const tags = ["event", "timeline"];
  tags.push(`chapter-${event.chapter}`);
  if (event.locked) {
    tags.push("locked");
  }
  const sig = event.significance?.toLowerCase() || "";
  if (sig.includes("critical")) {
    tags.push("critical-event");
  }
  return tags;
}
function buildEventContent(event, relationshipEngine, includeRelated) {
  const parts = [];
  parts.push(`# ${event.description}

`);
  if (event.locked) {
    parts.push("> \u{1F512} **This event is locked for continuity.**\n\n");
  }
  parts.push(section("Event Details"));
  parts.push(`**Chapter:** ${event.chapter}

`);
  if (event.significance) {
    parts.push(`**Significance:** ${event.significance}

`);
  }
  parts.push(section("Description"));
  parts.push(event.description + "\n\n");
  if (shouldIncludeRelatedEntities(includeRelated) && relationshipEngine) {
    const relationships = relationshipEngine.getRelationshipsFor(event.id);
    const relatedSection = buildRelatedEntitiesSection(relationships);
    if (relatedSection) {
      parts.push(relatedSection);
    }
  }
  parts.push(section("Related Notes"));
  parts.push("*Characters, locations, and objects involved in this event:*\n\n");
  parts.push("```dataview\n");
  parts.push(`LIST FROM ""
`);
  parts.push(`WHERE contains(file.outlinks, this.file.link)
`);
  parts.push("```\n\n");
  parts.push(section("Timeline Context"));
  parts.push("```dataview\n");
  parts.push('TABLE chapter as "Chapter", description as "Event"\n');
  parts.push("FROM #timeline\n");
  parts.push(`WHERE chapter >= ${Math.max(1, event.chapter - 1)} AND chapter <= ${event.chapter + 1}
`);
  parts.push("SORT chapter ASC\n");
  parts.push("```\n\n");
  return parts.join("");
}
function getEventFilename2(event) {
  const chapterStr = event.chapter.toString().padStart(2, "0");
  const eventNum = event.id.replace(/[^0-9]/g, "").padStart(3, "0");
  return `Event-${chapterStr}-${eventNum}`;
}
async function generateTimeline(options) {
  const result = {
    created: [],
    skipped: [],
    errors: [],
    summary: ""
  };
  let kb;
  try {
    if (!options.kbPath) {
      throw new Error("KB path is required");
    }
    kb = parseKBJson(options.kbPath);
  } catch (error) {
    result.errors.push({
      file: options.kbPath || "unknown",
      error: `Failed to load KB: ${error}`
    });
    result.summary = "Failed to load KB data";
    return result;
  }
  const tracker = new EntityTracker();
  const relationshipEngine = new RelationshipEngine(kb, options.coOccurrenceThreshold);
  const includeRelated = shouldIncludeRelatedEntities(options.includeRelatedEntities);
  const sortedEvents = [...kb.timeline].sort((a, b) => a.chapter - b.chapter);
  for (const event of sortedEvents) {
    const eventId = event.id;
    if (!tracker.add(eventId)) {
      if (options.verbose) {
        console.log(`Skipping duplicate event: ${eventId}`);
      }
      continue;
    }
    try {
      const filename = getEventFilename2(event);
      const filePath = generateNotePath(options.outputDir, TIMELINE_SUBDIR, filename);
      const frontmatter = buildEventFrontmatter(event);
      const content = buildEventContent(event, relationshipEngine, includeRelated);
      const note = buildNote(frontmatter, content);
      const written = await writeNoteFile(filePath, note, {
        force: options.force,
        dryRun: options.dryRun
      });
      if (written) {
        result.created.push(filePath);
        if (options.verbose) {
          console.log(`Created: ${filePath}`);
        }
      } else {
        result.skipped.push(filePath);
        if (options.verbose) {
          console.log(`Skipped (exists): ${filePath}`);
        }
      }
    } catch (error) {
      result.errors.push({
        file: eventId,
        error: `${error}`
      });
    }
  }
  result.summary = `Timeline: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`;
  return result;
}

// src/generators/arcs.ts
var ARCS_SUBDIR = "Arcs";
function buildThreadFrontmatter(thread) {
  return {
    id: thread.thread_id,
    type: "concept",
    title: thread.name,
    thread_type: thread.type,
    status: thread.status,
    tags: buildThreadTags(thread),
    chapters: thread.chapters_touched,
    resolution_chapter: thread.resolution_chapter
  };
}
function buildThreadTags(thread) {
  const tags = ["arc", "plot-thread"];
  const threadType = thread.type.toLowerCase().replace(/[_\s]+/g, "-");
  if (threadType && !tags.includes(threadType)) {
    tags.push(threadType);
  }
  const status = thread.status.toLowerCase();
  tags.push(`status-${status}`);
  return tags;
}
function buildThreadContent(thread) {
  const parts = [];
  parts.push(`# ${thread.name}

`);
  const statusIcon = getStatusIcon(thread.status);
  parts.push(`> ${statusIcon} **Status:** ${thread.status.toUpperCase()}

`);
  parts.push(section("Overview"));
  parts.push(`**Type:** ${thread.type.replace(/_/g, " ")}

`);
  if (thread.description) {
    parts.push(thread.description + "\n\n");
  }
  if (thread.chapters_touched && thread.chapters_touched.length > 0) {
    parts.push(section("Chapters"));
    parts.push(`**Chapters Touched:** ${formatChapters(thread.chapters_touched)}

`);
  }
  if (thread.resolution_chapter || thread.resolution_description) {
    parts.push(section("Resolution"));
    if (thread.resolution_chapter) {
      parts.push(`**Chapter:** ${thread.resolution_chapter}

`);
    }
    if (thread.resolution_description) {
      parts.push(thread.resolution_description + "\n\n");
    }
  }
  if (thread.expected_resolution && thread.status !== "resolved") {
    parts.push(section("Expected Resolution"));
    parts.push(`*Expected in: ${thread.expected_resolution}*

`);
  }
  parts.push(section("Related Notes"));
  parts.push("```dataview\n");
  parts.push("LIST FROM #arc\n");
  parts.push(`WHERE contains(file.outlinks, this.file.link) OR contains(tags, "${thread.thread_id}")
`);
  parts.push("```\n\n");
  return parts.join("");
}
function buildCharacterArcFrontmatter(char) {
  const arc = char.arc;
  return {
    id: `arc-${char.character_id}`,
    type: "concept",
    title: `${char.canonical_name}'s Arc`,
    character: char.canonical_name,
    arc_type: arc?.type,
    status: arc?.resolution?.status || "in_progress",
    tags: ["arc", "character-arc", `character-${char.character_id.replace(/_/g, "-")}`],
    resolution_chapter: arc?.resolution?.chapter
  };
}
function buildCharacterArcContent(char) {
  const parts = [];
  const arc = char.arc;
  parts.push(`# ${char.canonical_name}'s Arc

`);
  parts.push(`**Character:** ${wikilink(char.canonical_name)}

`);
  if (arc) {
    parts.push(section("Arc Overview"));
    parts.push(`**Type:** ${arc.type.replace(/_/g, " ")}

`);
    if (arc.description) {
      parts.push(arc.description + "\n\n");
    }
  }
  if (char.entry_state && Object.keys(char.entry_state).length > 0) {
    parts.push(section("Entry State"));
    parts.push(formatStateForArc(char.entry_state));
  }
  if (arc?.key_moments && arc.key_moments.length > 0) {
    parts.push(section("Key Moments"));
    for (const moment of arc.key_moments) {
      parts.push(`### Chapter ${moment.chapter}: ${moment.beat.replace(/_/g, " ")}
`);
      parts.push(`${moment.description}

`);
    }
  }
  if (arc?.resolution) {
    parts.push(section("Resolution"));
    const res = arc.resolution;
    const statusIcon = getStatusIcon(res.status);
    parts.push(`${statusIcon} **Status:** ${res.status}

`);
    if (res.chapter) {
      parts.push(`**Chapter:** ${res.chapter}

`);
    }
    if (res.key_line) {
      parts.push(`> "${res.key_line}"

`);
    }
    if (res.mechanism) {
      parts.push(`*${res.mechanism}*

`);
    }
  }
  if (char.exit_state && Object.keys(char.exit_state).length > 0) {
    parts.push(section("Exit State"));
    parts.push(formatStateForArc(char.exit_state));
  }
  return parts.join("");
}
function formatStateForArc(state) {
  const lines = [];
  for (const [key, value] of Object.entries(state)) {
    if (value === void 0 || value === null) continue;
    if (key === "locked" || key === "lock_reference" || key === "source") continue;
    if (Array.isArray(value)) {
      lines.push(`**${key}:**`);
      for (const item of value) {
        lines.push(`- ${item}`);
      }
    } else {
      lines.push(`**${key}:** ${value}`);
    }
  }
  return lines.join("\n") + "\n\n";
}
function getStatusIcon(status) {
  const s = status.toLowerCase();
  if (s === "resolved" || s === "compliant" || s === "fulfilled") {
    return "\u2705";
  }
  if (s === "destroyed") {
    return "\u{1F480}";
  }
  if (s === "setup" || s === "unresolved") {
    return "\u{1F4CC}";
  }
  if (s === "in_progress") {
    return "\u{1F504}";
  }
  return "\u{1F4CB}";
}
async function generateArcs(options) {
  const result = {
    created: [],
    skipped: [],
    errors: [],
    summary: ""
  };
  let arcLedger;
  try {
    if (!options.arcLedgerPath) {
      throw new Error("Arc ledger path is required");
    }
    arcLedger = parseArcLedger(options.arcLedgerPath);
  } catch (error) {
    result.errors.push({
      file: options.arcLedgerPath || "unknown",
      error: `Failed to load arc ledger: ${error}`
    });
    result.summary = "Failed to load arc ledger data";
    return result;
  }
  const tracker = new EntityTracker();
  if (arcLedger.threads) {
    for (const thread of arcLedger.threads) {
      const name = thread.name;
      if (!tracker.add(name)) {
        if (options.verbose) {
          console.log(`Skipping duplicate thread: ${name}`);
        }
        continue;
      }
      try {
        const filePath = generateNotePath(options.outputDir, `${ARCS_SUBDIR}/Threads`, name);
        const frontmatter = buildThreadFrontmatter(thread);
        const content = buildThreadContent(thread);
        const note = buildNote(frontmatter, content);
        const written = await writeNoteFile(filePath, note, {
          force: options.force,
          dryRun: options.dryRun
        });
        if (written) {
          result.created.push(filePath);
          if (options.verbose) {
            console.log(`Created: ${filePath}`);
          }
        } else {
          result.skipped.push(filePath);
          if (options.verbose) {
            console.log(`Skipped (exists): ${filePath}`);
          }
        }
      } catch (error) {
        result.errors.push({
          file: name,
          error: `${error}`
        });
      }
    }
  }
  if (arcLedger.characters) {
    for (const char of arcLedger.characters) {
      if (!char.arc) continue;
      const arcName = `${char.canonical_name}'s Arc`;
      if (!tracker.add(arcName)) {
        if (options.verbose) {
          console.log(`Skipping duplicate character arc: ${arcName}`);
        }
        continue;
      }
      try {
        const filePath = generateNotePath(options.outputDir, `${ARCS_SUBDIR}/Characters`, arcName);
        const frontmatter = buildCharacterArcFrontmatter(char);
        const content = buildCharacterArcContent(char);
        const note = buildNote(frontmatter, content);
        const written = await writeNoteFile(filePath, note, {
          force: options.force,
          dryRun: options.dryRun
        });
        if (written) {
          result.created.push(filePath);
          if (options.verbose) {
            console.log(`Created: ${filePath}`);
          }
        } else {
          result.skipped.push(filePath);
          if (options.verbose) {
            console.log(`Skipped (exists): ${filePath}`);
          }
        }
      } catch (error) {
        result.errors.push({
          file: arcName,
          error: `${error}`
        });
      }
    }
  }
  result.summary = `Arcs: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`;
  return result;
}

// src/generators/inject-links.ts
import * as fs10 from "fs";
import * as path11 from "path";
async function glob(basePath, pattern, options = {}) {
  const results = [];
  const ignore = options.ignore || [];
  let regexPattern = pattern.replace(/\*\*/g, "{{GLOBSTAR}}").replace(/\*/g, "[^/]*").replace(/\?/g, ".").replace(/{{GLOBSTAR}}\//g, "(?:.*\\/)?").replace(/{{GLOBSTAR}}/g, ".*");
  const regex = new RegExp(`^${regexPattern}$`);
  async function walk(dir) {
    let entries;
    try {
      entries = await fs10.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path11.join(dir, entry.name);
      const relativePath = path11.relative(basePath, fullPath).replace(/\\/g, "/");
      let shouldIgnore = false;
      for (const ignorePattern of ignore) {
        const ignoreRegex = ignorePattern.replace(/\*\*/g, "{{GLOBSTAR}}").replace(/\*/g, "[^/]*").replace(/{{GLOBSTAR}}/g, ".*");
        if (new RegExp(`^${ignoreRegex}$`).test(relativePath)) {
          shouldIgnore = true;
          break;
        }
      }
      if (shouldIgnore) continue;
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (regex.test(relativePath)) {
          results.push(fullPath);
        }
      }
    }
  }
  await walk(basePath);
  return results;
}
function findProtectedRegions(content) {
  const regions = [];
  const frontmatterMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (frontmatterMatch) {
    regions.push({
      start: 0,
      end: frontmatterMatch[0].length,
      type: "frontmatter"
    });
  }
  const codeBlockRegex = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      type: "code_block"
    });
  }
  const inlineCodeRegex = /`[^`\n]+`/g;
  while ((match = inlineCodeRegex.exec(content)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      type: "inline_code"
    });
  }
  const wikilinkRegex = /\[\[[^\]]+\]\]/g;
  while ((match = wikilinkRegex.exec(content)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      type: "existing_link"
    });
  }
  const markdownLinkRegex = /\[([^\]]+)\]\([^)]+\)/g;
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      type: "existing_link"
    });
  }
  const headerRegex = /^#{1,6}\s+.+$/gm;
  while ((match = headerRegex.exec(content)) !== null) {
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      type: "header"
    });
  }
  return regions.sort((a, b) => a.start - b.start);
}
function isProtected(position, length, regions) {
  const end = position + length;
  for (const region of regions) {
    if (position < region.end && end > region.start) {
      return true;
    }
    if (region.start > end) {
      break;
    }
  }
  return false;
}
function createEntityRegex(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b(${escaped})\\b`, "gi");
}
function findEntityMatches(content, entityName, protectedRegions) {
  const replacements = [];
  const regex = createEntityRegex(entityName);
  let match;
  while ((match = regex.exec(content)) !== null) {
    const start = match.index;
    const original = match[0];
    const length = original.length;
    if (isProtected(start, length, protectedRegions)) {
      continue;
    }
    replacements.push({
      start,
      end: start + length,
      original,
      replacement: `[[${entityName}|${original}]]`
    });
  }
  return replacements;
}
function applyReplacements(content, replacements) {
  const sorted = [...replacements].sort((a, b) => b.start - a.start);
  let result = content;
  for (const rep of sorted) {
    result = result.slice(0, rep.start) + rep.replacement + result.slice(rep.end);
  }
  return result;
}
function injectLinksInFile(content, entities) {
  const protectedRegions = findProtectedRegions(content);
  const allReplacements = [];
  const linkedPositions = /* @__PURE__ */ new Set();
  for (const [canonical, aliases2] of entities) {
    const canonicalMatches = findEntityMatches(content, canonical, protectedRegions);
    for (const match of canonicalMatches) {
      const posKey = `${match.start}-${match.end}`;
      if (!linkedPositions.has(posKey)) {
        match.replacement = `[[${canonical}]]`;
        allReplacements.push(match);
        linkedPositions.add(posKey);
      }
    }
    for (const alias of aliases2) {
      if (alias.toLowerCase() === canonical.toLowerCase()) continue;
      const aliasMatches = findEntityMatches(content, alias, protectedRegions);
      for (const match of aliasMatches) {
        const posKey = `${match.start}-${match.end}`;
        if (!linkedPositions.has(posKey)) {
          const overlaps = allReplacements.some(
            (r) => match.start < r.end && match.end > r.start
          );
          if (!overlaps) {
            match.replacement = `[[${canonical}|${match.original}]]`;
            allReplacements.push(match);
            linkedPositions.add(posKey);
          }
        }
      }
    }
  }
  const nonOverlapping = removeOverlaps(allReplacements);
  const newContent = applyReplacements(content, nonOverlapping);
  return {
    content: newContent,
    linksInjected: nonOverlapping.length
  };
}
function removeOverlaps(replacements) {
  if (replacements.length <= 1) return replacements;
  const sorted = [...replacements].sort((a, b) => a.start - b.start);
  const first = sorted[0];
  if (!first) return [];
  const result = [first];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = result[result.length - 1];
    if (current && last && current.start >= last.end) {
      result.push(current);
    }
  }
  return result;
}
function buildEntityMap(kb) {
  const entities = /* @__PURE__ */ new Map();
  for (const char of kb.characters) {
    entities.set(char.canonical_name, char.aliases || []);
  }
  for (const loc of kb.locations) {
    entities.set(loc.name, []);
  }
  for (const obj of kb.objects) {
    entities.set(obj.name, []);
  }
  if (kb.name_normalization) {
    for (const norm of kb.name_normalization) {
      if (entities.has(norm.canonical)) {
        const existing = entities.get(norm.canonical);
        const combined = [.../* @__PURE__ */ new Set([...existing, ...norm.variants])];
        entities.set(norm.canonical, combined);
      } else {
        entities.set(norm.canonical, norm.variants);
      }
    }
  }
  return entities;
}
async function injectLinks(options) {
  const result = {
    modified: [],
    linksInjected: 0,
    skipped: [],
    errors: []
  };
  let entities;
  if (options.entities) {
    entities = /* @__PURE__ */ new Map();
    for (const entity of options.entities) {
      entities.set(entity, []);
    }
  } else {
    const kbPaths = [
      path11.join(options.vaultPath, ".narrative-project", "kb", "kb.json"),
      path11.join(options.vaultPath, "kb", "kb.json"),
      path11.join(options.vaultPath, "kb.json")
    ];
    let kbPath = null;
    for (const p of kbPaths) {
      if (fs10.existsSync(p)) {
        kbPath = p;
        break;
      }
    }
    if (kbPath) {
      try {
        const kb = parseKBJson(kbPath);
        entities = buildEntityMap(kb);
      } catch (error) {
        result.errors.push({
          file: kbPath,
          error: `Failed to load KB: ${error}`
        });
        return result;
      }
    } else {
      result.errors.push({
        file: options.vaultPath,
        error: "No entity list provided and no KB file found"
      });
      return result;
    }
  }
  if (entities.size === 0) {
    return result;
  }
  const pattern = options.pattern || "**/*.md";
  const files = await glob(options.vaultPath, pattern, {
    ignore: ["**/node_modules/**", "**/.git/**", "**/.zettelscript/**"]
  });
  for (const file of files) {
    try {
      const content = fs10.readFileSync(file, "utf-8");
      const { content: newContent, linksInjected } = injectLinksInFile(content, entities);
      if (linksInjected > 0) {
        if (options.dryRun) {
          console.log(`[DRY RUN] Would modify: ${file} (+${linksInjected} links)`);
          result.modified.push(file);
          result.linksInjected += linksInjected;
        } else {
          await fs10.promises.writeFile(file, newContent, "utf-8");
          result.modified.push(file);
          result.linksInjected += linksInjected;
          if (options.verbose) {
            console.log(`Modified: ${file} (+${linksInjected} links)`);
          }
        }
      } else {
        result.skipped.push(file);
      }
    } catch (error) {
      result.errors.push({
        file,
        error: `${error}`
      });
    }
  }
  return result;
}
async function previewLinkInjection(options) {
  const previews = /* @__PURE__ */ new Map();
  let entities;
  if (options.entities) {
    entities = /* @__PURE__ */ new Map();
    for (const entity of options.entities) {
      entities.set(entity, []);
    }
  } else {
    const kbPaths = [
      path11.join(options.vaultPath, ".narrative-project", "kb", "kb.json"),
      path11.join(options.vaultPath, "kb", "kb.json"),
      path11.join(options.vaultPath, "kb.json")
    ];
    let kbPath = null;
    for (const p of kbPaths) {
      if (fs10.existsSync(p)) {
        kbPath = p;
        break;
      }
    }
    if (kbPath) {
      const kb = parseKBJson(kbPath);
      entities = buildEntityMap(kb);
    } else {
      return previews;
    }
  }
  const pattern = options.pattern || "**/*.md";
  const files = await glob(options.vaultPath, pattern, {
    ignore: ["**/node_modules/**", "**/.git/**", "**/.zettelscript/**"]
  });
  for (const file of files) {
    const content = fs10.readFileSync(file, "utf-8");
    const protectedRegions = findProtectedRegions(content);
    const filePreview = [];
    for (const [canonical, aliases2] of entities) {
      const allNames = [canonical, ...aliases2];
      for (const name of allNames) {
        const matches = findEntityMatches(content, name, protectedRegions);
        for (const match of matches) {
          const linked = name.toLowerCase() === canonical.toLowerCase() ? `[[${canonical}]]` : `[[${canonical}|${match.original}]]`;
          filePreview.push({
            original: match.original,
            linked,
            position: match.start
          });
        }
      }
    }
    if (filePreview.length > 0) {
      previews.set(file, filePreview.sort((a, b) => a.position - b.position));
    }
  }
  return previews;
}

// src/cli/commands/generate.ts
function resolveOptions(options) {
  const vaultPath = findVaultRoot() || process.cwd();
  const outputDir = options.output ? path12.resolve(options.output) : vaultPath;
  const kbFiles = findKBFiles(vaultPath);
  return {
    outputDir,
    kbPath: options.kb ? path12.resolve(options.kb) : kbFiles.kb,
    arcLedgerPath: options.arcLedger ? path12.resolve(options.arcLedger) : kbFiles.arcLedger,
    worldRulesPath: options.worldRules ? path12.resolve(options.worldRules) : kbFiles.worldRules,
    force: options.force || false,
    dryRun: options.dryRun || false,
    verbose: options.verbose || false
  };
}
function printResult(result) {
  console.log(`
${result.summary}`);
  if (result.errors.length > 0) {
    console.log("\nErrors:");
    for (const err of result.errors.slice(0, 10)) {
      console.log(`  ${err.file}: ${err.error}`);
    }
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more`);
    }
  }
}
var generateCommand = new Command10("generate").description("Generate vault notes from knowledge base data").addHelpText("after", `
Examples:
  zettel generate characters         Generate character notes
  zettel generate all                Generate all note types
  zettel generate chapters -m book.md  Split manuscript into chapters
`);
generateCommand.command("characters").description("Generate character notes from KB data").option("-o, --output <dir>", "Output directory").option("-k, --kb <path>", "Path to kb.json file").option("-f, --force", "Overwrite existing files").option("-n, --dry-run", "Show what would be created without writing files").option("-v, --verbose", "Show detailed output").action(async (options) => {
  const spinner = new Spinner("Generating character notes...");
  spinner.start();
  try {
    const opts = resolveOptions(options);
    if (!opts.kbPath) {
      spinner.stop("Error: No KB file found. Specify with --kb option.");
      process.exit(1);
    }
    const result = await generateCharacters(opts);
    spinner.stop();
    printResult(result);
  } catch (error) {
    spinner.stop(`Error: ${error}`);
    process.exit(1);
  }
});
generateCommand.command("chapters").description("Split manuscript into chapter notes").requiredOption("-m, --manuscript <path>", "Path to manuscript file").option("-o, --output <dir>", "Output directory").option("-d, --chapters-dir <dir>", "Subdirectory for chapters (default: Chapters)").option("-f, --force", "Overwrite existing files").option("-n, --dry-run", "Show what would be created without writing files").option("-v, --verbose", "Show detailed output").action(async (options) => {
  const spinner = new Spinner("Splitting manuscript into chapters...");
  spinner.start();
  try {
    const baseOpts = resolveOptions(options);
    const chapterOpts = {
      ...baseOpts,
      manuscriptPath: path12.resolve(options.manuscript),
      chaptersDir: options.chaptersDir
    };
    const result = await generateChapters(chapterOpts);
    spinner.stop();
    printResult(result);
  } catch (error) {
    spinner.stop(`Error: ${error}`);
    process.exit(1);
  }
});
generateCommand.command("locations").description("Generate location notes from KB data").option("-o, --output <dir>", "Output directory").option("-k, --kb <path>", "Path to kb.json file").option("-f, --force", "Overwrite existing files").option("-n, --dry-run", "Show what would be created without writing files").option("-v, --verbose", "Show detailed output").action(async (options) => {
  const spinner = new Spinner("Generating location notes...");
  spinner.start();
  try {
    const opts = resolveOptions(options);
    if (!opts.kbPath) {
      spinner.stop("Error: No KB file found. Specify with --kb option.");
      process.exit(1);
    }
    const result = await generateLocations(opts);
    spinner.stop();
    printResult(result);
  } catch (error) {
    spinner.stop(`Error: ${error}`);
    process.exit(1);
  }
});
generateCommand.command("objects").description("Generate object/artifact notes from KB data").option("-o, --output <dir>", "Output directory").option("-k, --kb <path>", "Path to kb.json file").option("-f, --force", "Overwrite existing files").option("-n, --dry-run", "Show what would be created without writing files").option("-v, --verbose", "Show detailed output").action(async (options) => {
  const spinner = new Spinner("Generating object notes...");
  spinner.start();
  try {
    const opts = resolveOptions(options);
    if (!opts.kbPath) {
      spinner.stop("Error: No KB file found. Specify with --kb option.");
      process.exit(1);
    }
    const result = await generateObjects(opts);
    spinner.stop();
    printResult(result);
  } catch (error) {
    spinner.stop(`Error: ${error}`);
    process.exit(1);
  }
});
generateCommand.command("lore").description("Generate lore/world rules notes from KB and world-rules data").option("-o, --output <dir>", "Output directory").option("-k, --kb <path>", "Path to kb.json file").option("-w, --world-rules <path>", "Path to world-rules.json file").option("-f, --force", "Overwrite existing files").option("-n, --dry-run", "Show what would be created without writing files").option("-v, --verbose", "Show detailed output").action(async (options) => {
  const spinner = new Spinner("Generating lore notes...");
  spinner.start();
  try {
    const opts = resolveOptions(options);
    if (!opts.kbPath && !opts.worldRulesPath) {
      spinner.stop("Error: No KB or world-rules file found. Specify with --kb or --world-rules option.");
      process.exit(1);
    }
    const result = await generateLore(opts);
    spinner.stop();
    printResult(result);
  } catch (error) {
    spinner.stop(`Error: ${error}`);
    process.exit(1);
  }
});
generateCommand.command("timeline").description("Generate timeline event notes from KB data").option("-o, --output <dir>", "Output directory").option("-k, --kb <path>", "Path to kb.json file").option("-f, --force", "Overwrite existing files").option("-n, --dry-run", "Show what would be created without writing files").option("-v, --verbose", "Show detailed output").action(async (options) => {
  const spinner = new Spinner("Generating timeline notes...");
  spinner.start();
  try {
    const opts = resolveOptions(options);
    if (!opts.kbPath) {
      spinner.stop("Error: No KB file found. Specify with --kb option.");
      process.exit(1);
    }
    const result = await generateTimeline(opts);
    spinner.stop();
    printResult(result);
  } catch (error) {
    spinner.stop(`Error: ${error}`);
    process.exit(1);
  }
});
generateCommand.command("arcs").description("Generate plot thread and character arc notes from arc-ledger").option("-o, --output <dir>", "Output directory").option("-a, --arc-ledger <path>", "Path to arc-ledger.json file").option("-f, --force", "Overwrite existing files").option("-n, --dry-run", "Show what would be created without writing files").option("-v, --verbose", "Show detailed output").action(async (options) => {
  const spinner = new Spinner("Generating arc notes...");
  spinner.start();
  try {
    const opts = resolveOptions(options);
    if (!opts.arcLedgerPath) {
      spinner.stop("Error: No arc-ledger file found. Specify with --arc-ledger option.");
      process.exit(1);
    }
    const result = await generateArcs(opts);
    spinner.stop();
    printResult(result);
  } catch (error) {
    spinner.stop(`Error: ${error}`);
    process.exit(1);
  }
});
generateCommand.command("all").description("Run all generators in sequence").option("-o, --output <dir>", "Output directory").option("-k, --kb <path>", "Path to kb.json file").option("-a, --arc-ledger <path>", "Path to arc-ledger.json file").option("-w, --world-rules <path>", "Path to world-rules.json file").option("-f, --force", "Overwrite existing files").option("-n, --dry-run", "Show what would be created without writing files").option("-v, --verbose", "Show detailed output").action(async (options) => {
  const spinner = new Spinner("Running all generators...");
  spinner.start();
  try {
    const opts = resolveOptions(options);
    const results = [];
    if (opts.kbPath) {
      spinner.update("Generating characters...");
      results.push(await generateCharacters(opts));
    }
    if (opts.kbPath) {
      spinner.update("Generating locations...");
      results.push(await generateLocations(opts));
    }
    if (opts.kbPath) {
      spinner.update("Generating objects...");
      results.push(await generateObjects(opts));
    }
    if (opts.kbPath) {
      spinner.update("Generating timeline...");
      results.push(await generateTimeline(opts));
    }
    if (opts.kbPath || opts.worldRulesPath) {
      spinner.update("Generating lore...");
      results.push(await generateLore(opts));
    }
    if (opts.arcLedgerPath) {
      spinner.update("Generating arcs...");
      results.push(await generateArcs(opts));
    }
    spinner.stop();
    console.log("\nGeneration complete:\n");
    for (const result of results) {
      console.log(`  ${result.summary}`);
    }
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    if (totalErrors > 0) {
      console.log(`
Total errors: ${totalErrors}`);
    }
  } catch (error) {
    spinner.stop(`Error: ${error}`);
    process.exit(1);
  }
});

// src/cli/commands/inject-links.ts
import { Command as Command11 } from "commander";
import * as path13 from "path";
var injectLinksCommand = new Command11("inject-links").description("Add wikilinks to notes based on entity names from KB").option("-p, --path <dir>", "Vault path (default: current vault)").option("-g, --pattern <glob>", "File pattern to process (default: **/*.md)").option("-e, --entities <names...>", "Specific entity names to link").option("-n, --dry-run", "Show changes without modifying files").option("--preview", "Show detailed preview of all changes").option("-v, --verbose", "Show detailed output").addHelpText("after", `
Examples:
  zettel inject-links                    # Process all .md files using KB entities
  zettel inject-links -n                 # Dry run to see what would change
  zettel inject-links --preview          # Show detailed preview of all changes
  zettel inject-links -e "Ryan" "Kevin"  # Only link specific entities
  zettel inject-links -g "Chapters/*.md" # Only process chapter files
`).action(async (options) => {
  try {
    const vaultPath = options.path ? path13.resolve(options.path) : findVaultRoot() || process.cwd();
    const opts = {
      vaultPath,
      pattern: options.pattern,
      entities: options.entities,
      dryRun: options.dryRun || options.preview,
      verbose: options.verbose
    };
    if (options.preview) {
      console.log("Previewing link injection...\n");
      const previews = await previewLinkInjection(opts);
      if (previews.size === 0) {
        console.log("No links to inject.");
        return;
      }
      for (const [file, changes] of previews) {
        const relativePath = path13.relative(vaultPath, file);
        console.log(`
${relativePath} (${changes.length} links):`);
        for (const change of changes.slice(0, 10)) {
          console.log(`  ${change.original} \u2192 ${change.linked}`);
        }
        if (changes.length > 10) {
          console.log(`  ... and ${changes.length - 10} more`);
        }
      }
      console.log(`
Total: ${previews.size} files, ${Array.from(previews.values()).reduce((sum, c) => sum + c.length, 0)} links`);
      console.log("\nRun without --preview to apply changes.");
      return;
    }
    const spinner = new Spinner("Injecting links...");
    spinner.start();
    const result = await injectLinks(opts);
    spinner.stop();
    if (opts.dryRun) {
      console.log("\n[DRY RUN] Would modify:");
    } else {
      console.log("\nLink injection complete:");
    }
    console.log(`  Files modified: ${result.modified.length}`);
    console.log(`  Links injected: ${result.linksInjected}`);
    console.log(`  Files skipped:  ${result.skipped.length}`);
    if (result.errors.length > 0) {
      console.log(`
Errors (${result.errors.length}):`);
      for (const err of result.errors.slice(0, 5)) {
        console.log(`  ${err.file}: ${err.error}`);
      }
      if (result.errors.length > 5) {
        console.log(`  ... and ${result.errors.length - 5} more`);
      }
    }
    if (opts.verbose && result.modified.length > 0) {
      console.log("\nModified files:");
      for (const file of result.modified) {
        const relativePath = path13.relative(vaultPath, file);
        console.log(`  ${relativePath}`);
      }
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
});

// src/cli/commands/visualize.ts
import { Command as Command12 } from "commander";
import process2 from "process";
import * as fs11 from "fs";
import * as path14 from "path";
import open from "open";
var typeColors = {
  note: "#94a3b8",
  // Slate 400
  scene: "#a78bfa",
  // Violet 400
  character: "#34d399",
  // Emerald 400
  location: "#60a5fa",
  // Blue 400
  object: "#fbbf24",
  // Amber 400
  event: "#f87171",
  // Red 400
  concept: "#f472b6",
  // Pink 400
  moc: "#fb923c",
  // Orange 400
  timeline: "#818cf8",
  // Indigo 400
  draft: "#52525b"
  // Zinc 600
};
var edgeStyles = {
  explicit_link: { color: "#22d3ee", dash: [], label: "Links to" },
  // Cyan
  backlink: { color: "#a78bfa", dash: [5, 5], label: "Backlinks" },
  // Violet
  sequence: { color: "#34d399", dash: [], label: "Sequence" },
  // Emerald
  hierarchy: { color: "#fbbf24", dash: [], label: "Hierarchy" },
  // Amber
  participation: { color: "#f472b6", dash: [], label: "Participation" },
  // Pink
  pov_visible_to: { color: "#60a5fa", dash: [3, 3], label: "POV Visible" },
  // Blue
  causes: { color: "#f87171", dash: [], label: "Causes" },
  // Red
  setup_payoff: { color: "#fb923c", dash: [], label: "Setup/Payoff" },
  // Orange
  semantic: { color: "#94a3b8", dash: [2, 2], label: "Semantic" },
  // Gray
  mention: { color: "#2dd4bf", dash: [2, 2], label: "Mention" },
  // Teal
  alias: { color: "#818cf8", dash: [4, 2], label: "Alias" }
  // Indigo
};
function generateVisualizationHtml(graphData, nodeTypeColors) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ZettelScript Atlas</title>
  <style>
    :root {
      --bg: #0f172a;
      --panel-bg: rgba(30, 41, 59, 0.7);
      --border: rgba(148, 163, 184, 0.2);
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
    }
    body { margin: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text-main); overflow: hidden; }

    #graph { width: 100vw; height: 100vh; cursor: crosshair; }

    /* Glassmorphism Panels */
    .panel {
      background: var(--panel-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      padding: 16px;
      position: absolute;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Breadcrumb Navigation */
    #breadcrumbs {
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      opacity: 0;
      pointer-events: none;
    }
    #breadcrumbs.active { opacity: 1; pointer-events: auto; }

    .nav-btn {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      color: var(--text-muted);
      width: 32px;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: 1rem;
    }
    .nav-btn:hover:not(:disabled) { background: rgba(56, 189, 248, 0.2); color: var(--accent); border-color: var(--accent); }
    .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .breadcrumb-trail {
      display: flex;
      align-items: center;
      gap: 4px;
      max-width: 400px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .breadcrumb-trail::-webkit-scrollbar { display: none; }

    .breadcrumb-item {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.85rem;
      cursor: pointer;
      white-space: nowrap;
      color: var(--text-muted);
      transition: all 0.2s;
    }
    .breadcrumb-item:hover { background: rgba(255,255,255,0.1); color: var(--text-main); }
    .breadcrumb-item.current { color: var(--accent); font-weight: 600; }
    .breadcrumb-sep { color: var(--text-muted); opacity: 0.5; }

    /* Sidebar */
    #sidebar {
      top: 20px;
      right: 20px;
      width: 320px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      transform: translateX(400px);
      opacity: 0;
    }
    #sidebar.active { transform: translateX(0); opacity: 1; }
    #sidebar::-webkit-scrollbar { width: 6px; }
    #sidebar::-webkit-scrollbar-track { background: transparent; }
    #sidebar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 3px; }

    .node-header { padding-bottom: 12px; border-bottom: 1px solid var(--border); margin-bottom: 12px; }
    .node-title { margin: 0; font-size: 1.25rem; font-weight: 600; line-height: 1.3; color: var(--text-main); }
    .node-badge {
      display: inline-block; margin-top: 8px; padding: 4px 8px;
      border-radius: 99px; font-size: 0.75rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em;
      color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }

    .meta-grid { display: grid; gap: 12px; }
    .meta-item { display: flex; flex-direction: column; gap: 4px; }
    .meta-key { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
    .meta-val { font-size: 0.9rem; color: var(--text-main); word-break: break-word; line-height: 1.5; }

    code {
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85em;
    }

    /* Connections Section */
    .connections-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .connections-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 12px;
      letter-spacing: 0.05em;
    }
    .connection-group {
      margin-bottom: 12px;
    }
    .connection-group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .connection-group-icon {
      font-size: 0.9rem;
    }
    .connection-group-count {
      background: rgba(255,255,255,0.1);
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 0.7rem;
    }
    .connected-node {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      margin: 2px 0;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .connected-node:hover {
      background: rgba(56, 189, 248, 0.15);
    }
    .connected-node-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .connected-node-name {
      font-size: 0.85rem;
      color: var(--text-main);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .connected-node-type {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: lowercase;
    }

    /* Controls & Legend */
    #controls {
      top: 20px;
      left: 20px;
      max-width: 250px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
    }
    #controls::-webkit-scrollbar { width: 6px; }
    #controls::-webkit-scrollbar-track { background: transparent; }
    #controls::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 3px; }

    .search-wrapper { position: relative; margin-bottom: 16px; }
    input[type="text"] {
      width: 100%;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 10px 12px;
      border-radius: 8px;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus { border-color: var(--accent); }

    .legend-title { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; }
    .legend-grid { display: grid; grid-template-columns: 1fr; gap: 4px; }
    .legend-item {
      display: flex; align-items: center; gap: 10px;
      font-size: 0.85rem; cursor: pointer; padding: 4px 8px;
      border-radius: 6px; transition: background 0.2s;
      user-select: none;
    }
    .legend-item:hover { background: rgba(255,255,255,0.05); }
    .legend-item.hidden { opacity: 0.4; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }

    /* Edge Type Filter */
    .filter-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .edge-legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.8rem;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.2s;
      user-select: none;
    }
    .edge-legend-item:hover { background: rgba(255,255,255,0.05); }
    .edge-legend-item.hidden { opacity: 0.4; }
    .edge-line {
      width: 20px;
      height: 2px;
      border-radius: 1px;
    }

    /* Keyboard shortcuts hint */
    .shortcuts-hint {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
      line-height: 1.6;
    }
    kbd {
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 5px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
    }
  </style>
  <script src="https://unpkg.com/force-graph"></script>
</head>
<body>
  <div id="breadcrumbs" class="panel">
    <button class="nav-btn" id="btn-back" onclick="goBack()" disabled title="Go back (Alt+Left)">&#8592;</button>
    <button class="nav-btn" id="btn-forward" onclick="goForward()" disabled title="Go forward (Alt+Right)">&#8594;</button>
    <div class="breadcrumb-trail" id="breadcrumb-trail"></div>
  </div>

  <div id="controls" class="panel">
    <div class="search-wrapper">
      <input type="text" id="search" placeholder="Search nodes... (/)" oninput="searchNode(this.value)">
    </div>
    <div class="legend-title">Filter by Node Type</div>
    <div class="legend-grid" id="legend"></div>

    <div class="filter-section">
      <div class="legend-title">Filter by Edge Type</div>
      <div class="legend-grid" id="edge-legend"></div>
    </div>

    <div class="shortcuts-hint">
      <kbd>/</kbd> Search &nbsp; <kbd>Esc</kbd> Close<br>
      <kbd>Alt+&#8592;</kbd> Back &nbsp; <kbd>Alt+&#8594;</kbd> Forward
    </div>
  </div>

  <div id="graph"></div>

  <div id="sidebar" class="panel">
    <div class="node-header">
      <h2 class="node-title" id="sb-title"></h2>
      <span class="node-badge" id="sb-type"></span>
    </div>
    <div id="sb-content" class="meta-grid"></div>
    <div id="sb-connections" class="connections-section"></div>
  </div>

  <script>
    const data = ${JSON.stringify(graphData)};
    const typeColors = ${JSON.stringify(nodeTypeColors)};
    const edgeStyles = ${JSON.stringify(edgeStyles)};

    // Pre-compute adjacency index for O(1) lookups
    const adjacency = {};
    const nodeMap = {};
    data.nodes.forEach(n => {
      nodeMap[n.id] = n;
      adjacency[n.id] = { outgoing: [], incoming: [] };
    });
    data.links.forEach(link => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source;
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
      if (adjacency[srcId]) adjacency[srcId].outgoing.push({ nodeId: tgtId, type: link.type, link });
      if (adjacency[tgtId]) adjacency[tgtId].incoming.push({ nodeId: srcId, type: link.type, link });
    });

    // State
    const hiddenTypes = new Set();
    const hiddenEdgeTypes = new Set();
    const highlightNodes = new Set();
    const highlightLinks = new Set();
    let hoverNode = null;
    let selectedNode = null;

    // Navigation history
    const navHistory = [];
    let navIndex = -1;

    // Navigation functions
    function navigateToNode(nodeId, addToHistory = true) {
      const node = nodeMap[nodeId];
      if (!node) return;

      // Unhide type if hidden
      if (hiddenTypes.has(node.type)) {
        hiddenTypes.delete(node.type);
        updateLegendUI();
      }

      // Update history
      if (addToHistory) {
        // Remove any forward history
        navHistory.splice(navIndex + 1);
        navHistory.push(nodeId);
        navIndex = navHistory.length - 1;
      }

      selectedNode = node;
      showSidebar(node);
      updateBreadcrumbs();

      // Center and zoom
      Graph.centerAt(node.x, node.y, 1000);
      Graph.zoom(6, 2000);

      // Highlight
      highlightNodes.clear();
      highlightLinks.clear();
      highlightNodes.add(node);
      data.links.forEach(link => {
        const srcId = typeof link.source === 'object' ? link.source.id : link.source;
        const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
        if (srcId === node.id || tgtId === node.id) {
          highlightLinks.add(link);
          highlightNodes.add(nodeMap[srcId]);
          highlightNodes.add(nodeMap[tgtId]);
        }
      });
      hoverNode = node;
      updateGraphVisibility();
    }

    function goBack() {
      if (navIndex > 0) {
        navIndex--;
        navigateToNode(navHistory[navIndex], false);
      }
    }

    function goForward() {
      if (navIndex < navHistory.length - 1) {
        navIndex++;
        navigateToNode(navHistory[navIndex], false);
      }
    }

    function updateBreadcrumbs() {
      const panel = document.getElementById('breadcrumbs');
      const trail = document.getElementById('breadcrumb-trail');
      const btnBack = document.getElementById('btn-back');
      const btnForward = document.getElementById('btn-forward');

      if (navHistory.length === 0) {
        panel.classList.remove('active');
        return;
      }

      panel.classList.add('active');
      btnBack.disabled = navIndex <= 0;
      btnForward.disabled = navIndex >= navHistory.length - 1;

      // Show last 5 items max
      const startIdx = Math.max(0, navHistory.length - 5);
      const visibleHistory = navHistory.slice(startIdx);
      const offset = startIdx;

      trail.innerHTML = visibleHistory.map((nodeId, i) => {
        const node = nodeMap[nodeId];
        const actualIndex = i + offset;
        const isCurrent = actualIndex === navIndex;
        const name = node ? node.name : nodeId;
        return \`<span class="breadcrumb-item \${isCurrent ? 'current' : ''}" onclick="jumpToBreadcrumb(\${actualIndex})">\${name}</span>\` +
          (i < visibleHistory.length - 1 ? '<span class="breadcrumb-sep">/</span>' : '');
      }).join('');
    }

    function jumpToBreadcrumb(index) {
      if (index >= 0 && index < navHistory.length) {
        navIndex = index;
        navigateToNode(navHistory[index], false);
      }
    }

    // Node type filter
    function toggleType(type) {
      if (hiddenTypes.has(type)) {
        hiddenTypes.delete(type);
      } else {
        hiddenTypes.add(type);
      }
      updateGraphVisibility();
      updateLegendUI();
    }

    // Edge type filter
    function toggleEdgeType(type) {
      if (hiddenEdgeTypes.has(type)) {
        hiddenEdgeTypes.delete(type);
      } else {
        hiddenEdgeTypes.add(type);
      }
      updateGraphVisibility();
      updateEdgeLegendUI();
    }

    function updateLegendUI() {
      const legend = document.getElementById('legend');
      legend.innerHTML = '';
      Object.entries(typeColors).forEach(([type, color]) => {
        const item = document.createElement('div');
        item.className = \`legend-item \${hiddenTypes.has(type) ? 'hidden' : ''}\`;
        item.onclick = () => toggleType(type);
        item.innerHTML = \`<div class="legend-dot" style="background: \${color}; color: \${color}"></div>\${type.charAt(0).toUpperCase() + type.slice(1)}\`;
        legend.appendChild(item);
      });
    }

    function updateEdgeLegendUI() {
      const legend = document.getElementById('edge-legend');
      legend.innerHTML = '';
      Object.entries(edgeStyles).forEach(([type, style]) => {
        const item = document.createElement('div');
        item.className = \`edge-legend-item \${hiddenEdgeTypes.has(type) ? 'hidden' : ''}\`;
        item.onclick = () => toggleEdgeType(type);
        const dashStyle = style.dash.length > 0
          ? \`background: repeating-linear-gradient(90deg, \${style.color} 0px, \${style.color} \${style.dash[0]}px, transparent \${style.dash[0]}px, transparent \${style.dash[0] + style.dash[1]}px)\`
          : \`background: \${style.color}\`;
        item.innerHTML = \`<div class="edge-line" style="\${dashStyle}"></div>\${style.label}\`;
        legend.appendChild(item);
      });
    }

    // Initial Legend
    updateLegendUI();
    updateEdgeLegendUI();

    // Init Graph
    const Graph = ForceGraph()
      (document.getElementById('graph'))
      .graphData(data)
      .nodeId('id')
      .nodeLabel('name')
      .nodeColor(node => hiddenTypes.has(node.type) ? 'rgba(0,0,0,0)' : node.color)
      .nodeVal('val')
      .nodeRelSize(4)
      .linkWidth(link => highlightLinks.has(link) ? 3 : 1.5)
      .linkDirectionalParticles(link => highlightLinks.has(link) ? 4 : 0)
      .linkDirectionalParticleWidth(3)
      .linkLineDash(link => {
        const style = edgeStyles[link.type];
        return style ? style.dash : [];
      })
      .linkColor(link => {
        if (hiddenEdgeTypes.has(link.type)) return 'rgba(0,0,0,0)';
        if (highlightLinks.has(link)) return '#38bdf8';
        const style = edgeStyles[link.type];
        return style ? style.color : 'rgba(148, 163, 184, 0.3)';
      })
      .backgroundColor('#0f172a')
      .onNodeHover(node => {
        if ((!node && !highlightNodes.size) || (node && hoverNode === node)) return;

        highlightNodes.clear();
        highlightLinks.clear();
        if (node) {
          highlightNodes.add(node);
          data.links.forEach(link => {
            const srcId = typeof link.source === 'object' ? link.source.id : link.source;
            const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
            if (srcId === node.id || tgtId === node.id) {
              highlightLinks.add(link);
              highlightNodes.add(nodeMap[srcId]);
              highlightNodes.add(nodeMap[tgtId]);
            }
          });
        }

        hoverNode = node || null;
        updateGraphVisibility();
      })
      .onNodeClick(node => {
        navigateToNode(node.id);
      })
      .onBackgroundClick(() => {
        document.getElementById('sidebar').classList.remove('active');
        selectedNode = null;
        highlightNodes.clear();
        highlightLinks.clear();
        hoverNode = null;
        updateGraphVisibility();
      });

    // Physics
    Graph.d3Force('charge').strength(-150);
    Graph.d3Force('link').distance(70);

    function updateGraphVisibility() {
      Graph.nodeCanvasObject((node, ctx, globalScale) => {
        if (hiddenTypes.has(node.type)) return;

        const label = node.name;
        const fontSize = 12/globalScale;
        const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node);
        const isSelected = selectedNode && selectedNode.id === node.id;

        // Node circle
        const radius = Math.sqrt(node.val) * 4;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = isHighlighted ? node.color : convertHexToRGBA(node.color, 0.2);
        ctx.fill();

        // Ring for selected/hovered
        if (hoverNode === node || isSelected) {
          ctx.strokeStyle = isSelected ? '#38bdf8' : '#fff';
          ctx.lineWidth = (isSelected ? 3 : 2) / globalScale;
          ctx.stroke();
        }

        // Text Label (only if highlighted or zoomed in)
        if (globalScale > 2.5 || (isHighlighted && highlightNodes.size > 0)) {
          ctx.font = \`\${fontSize}px Sans-Serif\`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
          ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] - radius - 2, bckgDimensions[0], bckgDimensions[1]);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isHighlighted ? '#fff' : 'rgba(255,255,255,0.4)';
          ctx.fillText(label, node.x, node.y - bckgDimensions[1]/2 - radius - 2);
        }
      });

      Graph.linkVisibility(link => {
        const srcNode = typeof link.source === 'object' ? link.source : nodeMap[link.source];
        const tgtNode = typeof link.target === 'object' ? link.target : nodeMap[link.target];
        if (!srcNode || !tgtNode) return false;
        if (hiddenTypes.has(srcNode.type) || hiddenTypes.has(tgtNode.type)) return false;
        if (hiddenEdgeTypes.has(link.type)) return false;
        return true;
      });
    }

    function buildConnectionsUI(node) {
      const adj = adjacency[node.id];
      if (!adj) return '';

      // Group connections by edge type
      const outgoingByType = {};
      const incomingByType = {};

      adj.outgoing.forEach(conn => {
        const targetNode = nodeMap[conn.nodeId];
        if (!targetNode) return;
        if (!outgoingByType[conn.type]) outgoingByType[conn.type] = [];
        outgoingByType[conn.type].push(targetNode);
      });

      adj.incoming.forEach(conn => {
        const sourceNode = nodeMap[conn.nodeId];
        if (!sourceNode) return;
        if (!incomingByType[conn.type]) incomingByType[conn.type] = [];
        incomingByType[conn.type].push(sourceNode);
      });

      const totalConnections = adj.outgoing.length + adj.incoming.length;
      if (totalConnections === 0) return '';

      let html = '<div class="connections-title">Connections</div>';

      // Helper to render a connection group
      const renderGroup = (label, icon, nodes, edgeType) => {
        if (!nodes || nodes.length === 0) return '';
        const style = edgeStyles[edgeType] || { color: '#94a3b8', label: edgeType };
        return \`
          <div class="connection-group">
            <div class="connection-group-header">
              <span class="connection-group-icon">\${icon}</span>
              <span>\${label}</span>
              <span class="connection-group-count">\${nodes.length}</span>
            </div>
            \${nodes.map(n => \`
              <div class="connected-node" onclick="navigateToNode('\${n.id}')">
                <div class="connected-node-dot" style="background: \${n.color}"></div>
                <span class="connected-node-name">\${n.name}</span>
                <span class="connected-node-type">\${n.type}</span>
              </div>
            \`).join('')}
          </div>
        \`;
      };

      // Outgoing connections (Links to)
      Object.entries(outgoingByType).forEach(([type, nodes]) => {
        const style = edgeStyles[type] || { label: type };
        html += renderGroup(style.label + ' (out)', '\u2192', nodes, type);
      });

      // Incoming connections (Backlinks from)
      Object.entries(incomingByType).forEach(([type, nodes]) => {
        const style = edgeStyles[type] || { label: type };
        html += renderGroup(style.label + ' (in)', '\u2190', nodes, type);
      });

      return html;
    }

    function showSidebar(node) {
      const sb = document.getElementById('sidebar');
      document.getElementById('sb-title').innerText = node.name;

      const typeEl = document.getElementById('sb-type');
      typeEl.innerText = node.type;
      typeEl.style.backgroundColor = node.color;

      const content = document.getElementById('sb-content');
      let html = \`
        <div class="meta-item">
          <span class="meta-key">Location</span>
          <span class="meta-val"><code>\${node.path}</code></span>
        </div>\`;

      if (node.metadata) {
        const priority = ['id', 'tags', 'aliases', 'role'];
        const sortedKeys = Object.keys(node.metadata).sort((a, b) => {
          const ai = priority.indexOf(a);
          const bi = priority.indexOf(b);
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return a.localeCompare(b);
        });

        sortedKeys.forEach(key => {
          if (['title', 'type'].includes(key)) return;
          const val = node.metadata[key];
          if (!val && val !== 0) return;

          let displayVal = val;
          if (Array.isArray(val)) {
            displayVal = val.map(v => \`<code>\${v}</code>\`).join(' ');
          } else if (typeof val === 'object') {
            displayVal = JSON.stringify(val);
          }

          html += \`
            <div class="meta-item">
              <span class="meta-key">\${key.replace(/_/g, ' ')}</span>
              <span class="meta-val">\${displayVal}</span>
            </div>\`;
        });
      }

      content.innerHTML = html;

      // Build connections UI
      const connectionsEl = document.getElementById('sb-connections');
      connectionsEl.innerHTML = buildConnectionsUI(node);

      sb.classList.add('active');
    }

    function searchNode(query) {
      if (!query) return;
      const node = data.nodes.find(n => n.name.toLowerCase().includes(query.toLowerCase()));
      if (node) {
        navigateToNode(node.id);
      }
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Alt+Left: Go back
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      }
      // Alt+Right: Go forward
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goForward();
      }
      // Escape: Close sidebar
      if (e.key === 'Escape') {
        document.getElementById('sidebar').classList.remove('active');
        selectedNode = null;
        highlightNodes.clear();
        highlightLinks.clear();
        hoverNode = null;
        updateGraphVisibility();
      }
      // /: Focus search
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('search').focus();
      }
    });

    // Helper
    function convertHexToRGBA(hex, opacity) {
      let c;
      if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
          c= hex.substring(1).split('');
          if(c.length== 3){
              c= [c[0], c[0], c[1], c[1], c[2], c[2]];
          }
          c= '0x'+c.join('');
          return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+opacity+')';
      }
      return hex;
    }
  </script>
</body>
</html>
  `;
}
var visualizeCommand = new Command12("visualize").alias("viz").description("Visualize the knowledge graph in the browser").option("-o, --output <path>", "Custom output path for the HTML file").option("--no-open", "Do not open the browser automatically").action(async (options) => {
  try {
    const ctx = await initContext();
    console.log("Generating graph data...");
    const nodes2 = await ctx.nodeRepository.findAll();
    const edges2 = await ctx.edgeRepository.findAll();
    const nodeWeights = /* @__PURE__ */ new Map();
    edges2.forEach((e) => {
      nodeWeights.set(e.sourceId, (nodeWeights.get(e.sourceId) || 0) + 1);
      nodeWeights.set(e.targetId, (nodeWeights.get(e.targetId) || 0) + 1);
    });
    const graphData = {
      nodes: nodes2.map((n) => ({
        id: n.nodeId,
        name: n.title,
        type: n.type,
        val: Math.max(1, Math.min(10, (nodeWeights.get(n.nodeId) || 0) / 2)),
        color: typeColors[n.type] || "#94a3b8",
        path: n.path,
        metadata: n.metadata
      })),
      links: edges2.map((e) => ({
        source: e.sourceId,
        target: e.targetId,
        type: e.edgeType,
        strength: e.strength ?? 1,
        provenance: e.provenance
      }))
    };
    const htmlContent = generateVisualizationHtml(graphData, typeColors);
    const outputDir = options.output ? path14.dirname(options.output) : getZettelScriptDir(ctx.vaultPath);
    if (!fs11.existsSync(outputDir)) {
      fs11.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = options.output || path14.join(outputDir, "graph.html");
    fs11.writeFileSync(outputPath, htmlContent, "utf-8");
    console.log(`
Graph visualization generated at: ${outputPath}`);
    if (options.open) {
      console.log("Opening in default browser...");
      await open(outputPath);
    }
    ctx.connectionManager.close();
  } catch (error) {
    console.error("Visualization failed:", error);
    process2.exit(1);
  }
});

// src/cli/commands/setup.ts
import { Command as Command13 } from "commander";
import * as fs12 from "fs";
import * as path15 from "path";
import process3 from "process";
import { stringify as stringifyYaml6 } from "yaml";
var setupCommand = new Command13("setup").alias("go").description("Initialize vault, index files, and generate visualization (0 to hero)").option("-f, --force", "Reinitialize even if already set up").option("--manuscript", "Enable manuscript mode with POV and timeline validation").option("--no-viz", "Skip visualization generation").option("-v, --verbose", "Show detailed output").action(async (options) => {
  const vaultPath = process3.cwd();
  const zettelDir = getZettelScriptDir(vaultPath);
  let needsInit = true;
  console.log("ZettelScript Setup");
  console.log("==================\n");
  if (fs12.existsSync(zettelDir) && !options.force) {
    const existingRoot = findVaultRoot(vaultPath);
    if (existingRoot) {
      console.log("Step 1: Initialize");
      console.log("  Already initialized, skipping...\n");
      needsInit = false;
    }
  }
  if (needsInit) {
    console.log("Step 1: Initialize");
    try {
      fs12.mkdirSync(zettelDir, { recursive: true });
      console.log(`  Created ${path15.relative(vaultPath, zettelDir)}/`);
      const config = {
        ...DEFAULT_CONFIG,
        vault: {
          ...DEFAULT_CONFIG.vault,
          path: "."
        },
        manuscript: {
          ...DEFAULT_CONFIG.manuscript,
          enabled: options.manuscript || false
        }
      };
      const configPath = getConfigPath(vaultPath);
      fs12.writeFileSync(configPath, stringifyYaml6(config), "utf-8");
      console.log(`  Created ${path15.relative(vaultPath, configPath)}`);
      const dbPath = getDbPath(vaultPath);
      const manager = ConnectionManager.getInstance(dbPath);
      await manager.initialize();
      manager.close();
      ConnectionManager.resetInstance();
      console.log(`  Created ${path15.relative(vaultPath, dbPath)}`);
      const gitignorePath = path15.join(zettelDir, ".gitignore");
      fs12.writeFileSync(gitignorePath, "# Ignore database (regenerated from files)\nzettelscript.db\nzettelscript.db-*\n", "utf-8");
      console.log("  Done!\n");
    } catch (error) {
      console.error("  Failed to initialize:", error);
      process3.exit(1);
    }
  }
  console.log("Step 2: Index files");
  try {
    const ctx = await initContext();
    const spinner = new Spinner("  Scanning files...");
    spinner.start();
    let lastProgress = 0;
    const result = await fullIndex(ctx.pipeline, ctx.vaultPath, {
      excludePatterns: ctx.config.vault.excludePatterns,
      onProgress: (current, total, filePath) => {
        if (current > lastProgress) {
          lastProgress = current;
          spinner.update(`  Indexing ${current}/${total}: ${filePath}`);
        }
      }
    });
    spinner.stop();
    console.log(`  Files: ${result.stats.totalFiles}`);
    console.log(`  Nodes: ${result.stats.nodeCount}`);
    console.log(`  Edges: ${result.stats.edgeCount}`);
    if (result.stats.unresolvedCount > 0) {
      console.log(`  Unresolved links: ${result.stats.unresolvedCount}`);
    }
    console.log(`  Duration: ${formatDuration(result.stats.durationMs)}`);
    if (result.errors.length > 0 && options.verbose) {
      console.log(`  Errors (${result.errors.length}):`);
      for (const err of result.errors.slice(0, 5)) {
        console.log(`    ${err.path}: ${err.error}`);
      }
      if (result.errors.length > 5) {
        console.log(`    ... and ${result.errors.length - 5} more`);
      }
    }
    console.log("  Done!\n");
    if (options.viz) {
      console.log("Step 3: Generate visualization");
      const nodes2 = await ctx.nodeRepository.findAll();
      const edges2 = await ctx.edgeRepository.findAll();
      if (nodes2.length === 0) {
        console.log("  No nodes to visualize, skipping...\n");
      } else {
        const nodeWeights = /* @__PURE__ */ new Map();
        edges2.forEach((e) => {
          nodeWeights.set(e.sourceId, (nodeWeights.get(e.sourceId) || 0) + 1);
          nodeWeights.set(e.targetId, (nodeWeights.get(e.targetId) || 0) + 1);
        });
        const graphData = {
          nodes: nodes2.map((n) => ({
            id: n.nodeId,
            name: n.title,
            type: n.type,
            val: Math.max(1, Math.min(10, (nodeWeights.get(n.nodeId) || 0) / 2)),
            color: typeColors[n.type] || "#94a3b8",
            path: n.path,
            metadata: n.metadata
          })),
          links: edges2.map((e) => ({
            source: e.sourceId,
            target: e.targetId,
            type: e.edgeType,
            strength: e.strength ?? 1,
            provenance: e.provenance
          }))
        };
        const htmlContent = generateVisualizationHtml(graphData, typeColors);
        const outputPath = path15.join(getZettelScriptDir(ctx.vaultPath), "graph.html");
        fs12.writeFileSync(outputPath, htmlContent, "utf-8");
        console.log(`  Generated: ${path15.relative(vaultPath, outputPath)}`);
        console.log("  Done!\n");
      }
    }
    ctx.connectionManager.close();
    console.log("Setup complete!");
    console.log("---------------");
    console.log("Next steps:");
    console.log("  zettel query <search>   Search your knowledge graph");
    console.log("  zettel discover --all   Find unlinked mentions");
    console.log("  zettel watch            Watch for file changes");
    if (options.viz && result.stats.nodeCount > 0) {
      console.log("  zettel visualize        Open graph in browser");
    }
    if (options.manuscript) {
      console.log("\nManuscript mode enabled:");
      console.log("  zettel validate --continuity   Check POV/timeline consistency");
    }
  } catch (error) {
    console.error("  Failed:", error);
    process3.exit(1);
  }
});

// src/cli/index.ts
var program = new Command14();
program.name("zettel").description("ZettelScript - Graph-first knowledge management system").version("0.1.0");
program.addCommand(initCommand);
program.addCommand(indexCommand);
program.addCommand(watchCommand);
program.addCommand(queryCommand);
program.addCommand(validateCommand);
program.addCommand(discoverCommand);
program.addCommand(retrieveCommand);
program.addCommand(rewriteCommand);
program.addCommand(extractCommand);
program.addCommand(generateCommand);
program.addCommand(injectLinksCommand);
program.addCommand(visualizeCommand);
program.addCommand(setupCommand);
program.parse();
//# sourceMappingURL=index.js.map