import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { DatabaseError } from '../../core/errors.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

// SQL for creating FTS5 virtual table
const FTS5_SCHEMA = `
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  chunk_id,
  node_id,
  text,
  tokenize='porter'
);
`;

// SQL for creating FTS triggers to keep it in sync
const FTS5_TRIGGERS = `
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

// Schema version for migrations
const SCHEMA_VERSION = 1;

/**
 * Database connection manager for ZettelScript
 */
export class ConnectionManager {
  private static instance: ConnectionManager | null = null;
  private sqlite: Database.Database | null = null;
  private db: DrizzleDB | null = null;
  private dbPath: string;

  private constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Get or create the singleton connection manager
   */
  static getInstance(dbPath?: string): ConnectionManager {
    if (!ConnectionManager.instance) {
      if (!dbPath) {
        throw new DatabaseError('Database path required for initial connection');
      }
      ConnectionManager.instance = new ConnectionManager(dbPath);
    }
    return ConnectionManager.instance;
  }

  /**
   * Reset the singleton (useful for testing)
   */
  static resetInstance(): void {
    if (ConnectionManager.instance) {
      ConnectionManager.instance.close();
      ConnectionManager.instance = null;
    }
  }

  /**
   * Initialize the database connection and schema
   */
  async initialize(): Promise<void> {
    if (this.db) {
      return; // Already initialized
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Open SQLite connection
      this.sqlite = new Database(this.dbPath);

      // Enable WAL mode for better concurrent performance
      this.sqlite.pragma('journal_mode = WAL');
      this.sqlite.pragma('foreign_keys = ON');
      this.sqlite.pragma('synchronous = NORMAL');

      // Create Drizzle instance
      this.db = drizzle(this.sqlite, { schema });

      // Run migrations/schema creation
      await this.migrate();
    } catch (error) {
      throw new DatabaseError(`Failed to initialize database: ${error}`, {
        path: this.dbPath,
        error: String(error),
      });
    }
  }

  /**
   * Run database migrations
   */
  private async migrate(): Promise<void> {
    if (!this.sqlite) {
      throw new DatabaseError('SQLite connection not initialized');
    }

    // Check current schema version
    let currentVersion = 0;
    try {
      const result = this.sqlite.prepare('SELECT version FROM schema_version LIMIT 1').get() as { version: number } | undefined;
      if (result) {
        currentVersion = result.version;
      }
    } catch {
      // Table doesn't exist yet, that's fine
    }

    if (currentVersion >= SCHEMA_VERSION) {
      return; // Already up to date
    }

    // Run initial schema creation
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

    // Create FTS5 virtual table
    this.sqlite.exec(FTS5_SCHEMA);
    this.sqlite.exec(FTS5_TRIGGERS);

    // Update schema version
    this.sqlite.exec(`
      DELETE FROM schema_version;
      INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION});
    `);
  }

  /**
   * Get the Drizzle database instance
   */
  getDb(): DrizzleDB {
    if (!this.db) {
      throw new DatabaseError('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Get the raw SQLite database instance (for FTS5 and custom queries)
   */
  getSqlite(): Database.Database {
    if (!this.sqlite) {
      throw new DatabaseError('Database not initialized. Call initialize() first.');
    }
    return this.sqlite;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.sqlite) {
      this.sqlite.close();
      this.sqlite = null;
      this.db = null;
    }
  }

  /**
   * Run a transaction
   */
  transaction<T>(fn: () => T): T {
    const sqlite = this.getSqlite();
    return sqlite.transaction(fn)();
  }

  /**
   * Check if the database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null;
  }

  /**
   * Get database statistics
   */
  getStats(): {
    nodeCount: number;
    edgeCount: number;
    chunkCount: number;
    dbSizeBytes: number;
  } {
    const sqlite = this.getSqlite();

    const nodeCount = (sqlite.prepare('SELECT COUNT(*) as count FROM nodes').get() as { count: number }).count;
    const edgeCount = (sqlite.prepare('SELECT COUNT(*) as count FROM edges').get() as { count: number }).count;
    const chunkCount = (sqlite.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number }).count;

    const stats = fs.statSync(this.dbPath);

    return {
      nodeCount,
      edgeCount,
      chunkCount,
      dbSizeBytes: stats.size,
    };
  }
}

/**
 * Helper to get a database connection for a vault
 */
export async function getDatabase(vaultPath: string): Promise<DrizzleDB> {
  const dbPath = path.join(vaultPath, '.zettelscript', 'zettelscript.db');
  const manager = ConnectionManager.getInstance(dbPath);
  await manager.initialize();
  return manager.getDb();
}

/**
 * Helper to get raw SQLite for FTS5 queries
 */
export function getRawSqlite(vaultPath: string): Database.Database {
  const dbPath = path.join(vaultPath, '.zettelscript', 'zettelscript.db');
  const manager = ConnectionManager.getInstance(dbPath);
  return manager.getSqlite();
}
