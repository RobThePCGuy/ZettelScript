/**
 * Cosine similarity computation and wormhole detection utilities
 */

/**
 * Compute cosine similarity between two embedding vectors
 * Returns a value between -1 and 1 (typically 0 to 1 for normalized embeddings)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i]!;
    const bVal = b[i]!;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

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

export const DEFAULT_WORMHOLE_OPTIONS: WormholeDetectorOptions = {
  similarityThreshold: 0.75,
  maxWormholesPerNode: 5,
  excludeLinkedNodes: true,
};
