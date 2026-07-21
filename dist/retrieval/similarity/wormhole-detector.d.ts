import { type WormholeCandidate, type WormholeDetectorOptions } from './similarity.js';
import type { EmbeddingRepository } from '../../storage/database/repositories/embedding-repository.js';
import type { EdgeRepository } from '../../storage/database/repositories/edge-repository.js';
import type { WormholeRepository } from '../../storage/database/repositories/wormhole-repository.js';
import type { NodeRepository } from '../../storage/database/repositories/node-repository.js';
/**
 * Detects semantic wormholes - similar but unlinked nodes
 */
export declare class WormholeDetector {
    private embeddingRepo;
    private edgeRepo;
    private wormholeRepo;
    private nodeRepo;
    private options;
    constructor(embeddingRepo: EmbeddingRepository, edgeRepo: EdgeRepository, wormholeRepo: WormholeRepository, nodeRepo: NodeRepository, options?: Partial<WormholeDetectorOptions>);
    /**
     * Detect all wormhole candidates based on embedding similarity
     */
    detectWormholes(): Promise<WormholeCandidate[]>;
    /**
     * Create semantic_suggestion edges from wormhole candidates
     * Returns the number of edges created
     */
    createSemanticEdges(candidates: WormholeCandidate[], model: string): Promise<number>;
    /**
     * Remove all semantic_suggestion edges
     */
    clearSemanticEdges(): Promise<number>;
    /**
     * Accept a wormhole - convert semantic_suggestion to semantic edge
     */
    acceptWormhole(edgeId: string): Promise<boolean>;
    /**
     * Reject a wormhole - delete the edge and record rejection
     */
    rejectWormhole(edgeId: string): Promise<boolean>;
    /**
     * Get statistics about current wormholes
     */
    getStats(): Promise<{
        suggestionCount: number;
        acceptedCount: number;
        rejectionCount: number;
        embeddingCount: number;
        embeddedNodeCount: number;
        totalNodeCount: number;
    }>;
}
//# sourceMappingURL=wormhole-detector.d.ts.map