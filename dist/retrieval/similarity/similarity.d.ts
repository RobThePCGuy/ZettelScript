/**
 * Cosine similarity computation and wormhole detection utilities
 */
/**
 * Compute cosine similarity between two embedding vectors
 * Returns a value between -1 and 1 (typically 0 to 1 for normalized embeddings)
 */
export declare function cosineSimilarity(a: number[], b: number[]): number;
/**
 * A candidate wormhole connection between two nodes
 */
export interface WormholeCandidate {
    sourceId: string;
    targetId: string;
    similarity: number;
}
/**
 * Options for wormhole detection
 */
export interface WormholeDetectorOptions {
    /**
     * Minimum similarity score to consider (0-1)
     * @default 0.75
     */
    similarityThreshold: number;
    /**
     * Maximum number of wormholes to suggest per node
     * @default 5
     */
    maxWormholesPerNode: number;
    /**
     * Whether to exclude pairs that already have an edge
     * @default true
     */
    excludeLinkedNodes: boolean;
}
export declare const DEFAULT_WORMHOLE_OPTIONS: WormholeDetectorOptions;
//# sourceMappingURL=similarity.d.ts.map