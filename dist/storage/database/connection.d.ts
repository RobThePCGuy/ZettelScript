import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;
/**
 * Database connection manager for ZettelScript
 */
export declare class ConnectionManager {
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
export declare function getDatabase(vaultPath: string): Promise<DrizzleDB>;
/**
 * Helper to get raw SQLite for FTS5 queries
 */
export declare function getRawSqlite(vaultPath: string): Database.Database;
//# sourceMappingURL=connection.d.ts.map