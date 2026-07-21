import type { RetrievalQuery, RetrievalResult } from '../../core/types/index.js';
import { NodeRepository, EdgeRepository, ChunkRepository } from '../../storage/database/repositories/index.js';
import type { GraphEngine } from '../../core/graph/engine.js';
export interface ContextAssemblerOptions {
    nodeRepository: NodeRepository;
    edgeRepository: EdgeRepository;
    chunkRepository: ChunkRepository;
    graphEngine: GraphEngine;
    config: {
        defaultMaxResults: number;
        semanticWeight: number;
        lexicalWeight: number;
        graphWeight: number;
        rrfK: number;
        expansionMaxDepth: number;
        expansionBudget: number;
    };
}
/**
 * Assembles context from multiple retrieval strategies
 */
export declare class ContextAssembler {
    private nodeRepo;
    private chunkRepo;
    private expander;
    private config;
    constructor(options: ContextAssemblerOptions);
    /**
     * Main retrieval function
     */
    retrieve(query: RetrievalQuery): Promise<RetrievalResult>;
    /**
     * Lexical search using FTS5
     */
    private lexicalSearch;
    /**
     * Apply query filters
     */
    private applyFilters;
    /**
     * Extract seed nodes from initial results
     */
    private extractSeeds;
    /**
     * Fetch chunks for expanded nodes
     */
    private fetchChunksForNodes;
    /**
     * Fuse lexical and graph results using RRF
     */
    private fuseResults;
    /**
     * Assemble context string from chunks
     */
    private assembleContext;
    /**
     * Build provenance information
     */
    private buildProvenance;
}
//# sourceMappingURL=assembler.d.ts.map