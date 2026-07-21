import Database from 'better-sqlite3';
import { DrizzleDB } from '../connection.js';
import type { Chunk } from '../../../core/types/index.js';
/**
 * Repository for Chunk CRUD operations including FTS5 queries
 */
export declare class ChunkRepository {
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
//# sourceMappingURL=chunk-repository.d.ts.map