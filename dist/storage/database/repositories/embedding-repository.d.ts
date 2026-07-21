import { DrizzleDB } from '../connection.js';
/**
 * Interface for a node's embedding data
 */
export interface NodeEmbedding {
    embeddingId: string;
    nodeId: string;
    embedding: number[];
    model: string;
    dimensions: number;
    contentHash: string;
    computedAt: string;
}
export interface CreateEmbeddingInput {
    nodeId: string;
    embedding: number[];
    model: string;
    dimensions: number;
    contentHash: string;
}
/**
 * Repository for Node Embedding CRUD operations
 */
export declare class EmbeddingRepository {
    private db;
    constructor(db: DrizzleDB);
    /**
     * Create a new embedding
     * Protected by embeddings circuit breaker as this is part of the embedding pipeline
     */
    create(data: CreateEmbeddingInput): Promise<NodeEmbedding | null>;
    /**
     * Create or update an embedding for a node
     * Protected by embeddings circuit breaker as this is part of the embedding pipeline
     */
    upsert(data: CreateEmbeddingInput): Promise<NodeEmbedding | null>;
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
     * Protected by vectorDb circuit breaker as this powers similarity search
     */
    findAll(): Promise<NodeEmbedding[]>;
    /**
     * Find embeddings by model
     */
    findByModel(model: string): Promise<NodeEmbedding[]>;
    /**
     * Find embeddings by node IDs
     * Protected by vectorDb circuit breaker as this powers similarity search
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
     * Protected by embeddings circuit breaker as this is part of the embedding pipeline
     */
    update(embeddingId: string, data: Partial<CreateEmbeddingInput>): Promise<NodeEmbedding | null>;
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
//# sourceMappingURL=embedding-repository.d.ts.map