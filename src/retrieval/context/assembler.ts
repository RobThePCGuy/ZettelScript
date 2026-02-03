import type {
  Chunk,
  Node,
  RetrievalQuery,
  RetrievalResult,
  EdgeType,
} from '../../core/types/index.js';
import {
  NodeRepository,
  EdgeRepository,
  ChunkRepository,
} from '../../storage/database/repositories/index.js';
import type { GraphEngine } from '../../core/graph/engine.js';
import { GraphExpander, type ExpandedNode } from '../expansion/graph-expander.js';
import { reciprocalRankFusion, type RankedItem } from '../fusion/rrf.js';

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

interface ScoredChunk {
  chunk: Chunk;
  node: Node;
  score: number;
  matchType: 'semantic' | 'lexical' | 'graph';
}

/**
 * Assembles context from multiple retrieval strategies
 */
export class ContextAssembler {
  private nodeRepo: NodeRepository;
  private chunkRepo: ChunkRepository;
  private expander: GraphExpander;
  private config: ContextAssemblerOptions['config'];

  constructor(options: ContextAssemblerOptions) {
    this.nodeRepo = options.nodeRepository;
    this.chunkRepo = options.chunkRepository;
    this.expander = new GraphExpander(options.edgeRepository);
    this.config = options.config;
  }

  /**
   * Main retrieval function
   */
  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    const maxResults = query.maxResults ?? this.config.defaultMaxResults;

    // Step 1: Seed retrieval (lexical for now, semantic when embeddings available)
    const lexicalResults = await this.lexicalSearch(query.text, maxResults * 2);

    // Step 2: Apply filters
    const filteredLexical = await this.applyFilters(lexicalResults, query.filters);

    // Step 3: Extract seed nodes
    const seedNodes = this.extractSeeds(filteredLexical);

    // Step 4: Graph expansion
    const expansionOptions = {
      maxDepth: query.expansion?.maxDepth ?? this.config.expansionMaxDepth,
      budget: query.expansion?.budget ?? this.config.expansionBudget,
      edgeTypes: (query.expansion?.edgeTypes ?? [
        'explicit_link',
        'sequence',
        'hierarchy',
      ]) as EdgeType[],
      decayFactor: query.expansion?.decayFactor ?? 0.7,
      includeIncoming: true,
    };

    const expandedNodes = await this.expander.expand(seedNodes, expansionOptions);

    // Step 5: Fetch chunks for expanded nodes
    const graphChunks = await this.fetchChunksForNodes(expandedNodes);

    // Step 6: Fuse results
    const fusedChunks = this.fuseResults(filteredLexical, graphChunks, maxResults);

    // Step 7: Assemble context
    const context = await this.assembleContext(fusedChunks);

    // Step 8: Build provenance
    const provenance = this.buildProvenance(fusedChunks);

    return {
      chunks: fusedChunks.map((sc) => ({
        chunk: sc.chunk,
        node: sc.node,
        score: sc.score,
        matchType: sc.matchType,
      })),
      context,
      provenance,
    };
  }

  /**
   * Lexical search using FTS5
   */
  private async lexicalSearch(query: string, limit: number): Promise<ScoredChunk[]> {
    const ftsResults = this.chunkRepo.searchBM25(query, limit);

    if (ftsResults.length === 0) {
      return [];
    }

    // Fetch full chunk and node data
    const chunkIds = ftsResults.map((r) => r.chunkId);
    const chunks = await this.chunkRepo.findByIds(chunkIds);
    const chunkMap = new Map(chunks.map((c) => [c.chunkId, c]));

    const nodeIds = [...new Set(ftsResults.map((r) => r.nodeId))];
    const nodes = await this.nodeRepo.findByIds(nodeIds);
    const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));

    const results: ScoredChunk[] = [];

    // Normalize scores
    const maxScore = Math.max(...ftsResults.map((r) => Math.abs(r.score)));

    for (const fts of ftsResults) {
      const chunk = chunkMap.get(fts.chunkId);
      const node = nodeMap.get(fts.nodeId);

      if (chunk && node) {
        results.push({
          chunk,
          node,
          score: maxScore > 0 ? Math.abs(fts.score) / maxScore : 0.5,
          matchType: 'lexical',
        });
      }
    }

    return results;
  }

  /**
   * Apply query filters
   */
  private async applyFilters(
    chunks: ScoredChunk[],
    filters?: RetrievalQuery['filters']
  ): Promise<ScoredChunk[]> {
    if (!filters) return chunks;

    return chunks.filter((sc) => {
      // Filter by node type
      if (filters.nodeTypes && !filters.nodeTypes.includes(sc.node.type)) {
        return false;
      }

      // Filter by excluded nodes
      if (filters.excludeNodeIds?.includes(sc.node.nodeId)) {
        return false;
      }

      // Filter by date range
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
  private extractSeeds(chunks: ScoredChunk[]): Array<{ nodeId: string; score: number }> {
    // Aggregate scores by node
    const nodeScores = new Map<string, number>();

    for (const sc of chunks) {
      const current = nodeScores.get(sc.node.nodeId) ?? 0;
      nodeScores.set(sc.node.nodeId, Math.max(current, sc.score));
    }

    return Array.from(nodeScores.entries())
      .map(([nodeId, score]) => ({ nodeId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10 seeds
  }

  /**
   * Fetch chunks for expanded nodes
   */
  private async fetchChunksForNodes(expanded: ExpandedNode[]): Promise<ScoredChunk[]> {
    const results: ScoredChunk[] = [];

    for (const exp of expanded) {
      if (exp.depth === 0) continue; // Skip seeds, already have their chunks

      const chunks = await this.chunkRepo.findByNodeId(exp.nodeId);
      const node = await this.nodeRepo.findById(exp.nodeId);

      if (!node) continue;

      for (const chunk of chunks) {
        results.push({
          chunk,
          node,
          score: exp.score,
          matchType: 'graph',
        });
      }
    }

    return results;
  }

  /**
   * Fuse lexical and graph results using RRF
   */
  private fuseResults(
    lexical: ScoredChunk[],
    graph: ScoredChunk[],
    maxResults: number
  ): ScoredChunk[] {
    // Convert to ranked items
    const lexicalItems: RankedItem[] = lexical.map((sc) => ({
      id: sc.chunk.chunkId,
      score: sc.score,
      source: 'lexical',
    }));

    const graphItems: RankedItem[] = graph.map((sc) => ({
      id: sc.chunk.chunkId,
      score: sc.score,
      source: 'graph',
    }));

    // Create chunk lookup
    const chunkLookup = new Map<string, ScoredChunk>();
    for (const sc of [...lexical, ...graph]) {
      const existing = chunkLookup.get(sc.chunk.chunkId);
      if (!existing || sc.score > existing.score) {
        chunkLookup.set(sc.chunk.chunkId, sc);
      }
    }

    // Perform RRF
    const resultLists = new Map([
      ['lexical', lexicalItems],
      ['graph', graphItems],
    ]);

    const fused = reciprocalRankFusion(resultLists, {
      k: this.config.rrfK,
      weights: {
        lexical: this.config.lexicalWeight,
        graph: this.config.graphWeight,
      },
    });

    // Map back to ScoredChunk
    const results: ScoredChunk[] = [];
    for (const f of fused.slice(0, maxResults)) {
      const sc = chunkLookup.get(f.id);
      if (sc) {
        results.push({
          ...sc,
          score: f.score,
          matchType: f.sources.length > 1 ? 'lexical' : (f.sources[0] as 'lexical' | 'graph'),
        });
      }
    }

    return results;
  }

  /**
   * Assemble context string from chunks
   */
  private async assembleContext(chunks: ScoredChunk[]): Promise<string> {
    if (chunks.length === 0) {
      return '';
    }

    // Group chunks by node for better organization
    const nodeChunks = new Map<string, ScoredChunk[]>();
    for (const sc of chunks) {
      const existing = nodeChunks.get(sc.node.nodeId) ?? [];
      existing.push(sc);
      nodeChunks.set(sc.node.nodeId, existing);
    }

    const sections: string[] = [];

    for (const [, nodeChunkList] of nodeChunks) {
      const node = nodeChunkList[0]?.node;
      if (!node) continue;

      // Sort chunks by offset
      nodeChunkList.sort((a, b) => a.chunk.offsetStart - b.chunk.offsetStart);

      const chunkTexts = nodeChunkList.map((sc) => sc.chunk.text);
      const combinedText = chunkTexts.join('\n\n');

      sections.push(`## ${node.title}\n\n${combinedText}`);
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * Build provenance information
   */
  private buildProvenance(chunks: ScoredChunk[]): RetrievalResult['provenance'] {
    // Aggregate contribution by node
    const nodeContributions = new Map<string, { path: string; score: number }>();

    for (const sc of chunks) {
      const existing = nodeContributions.get(sc.node.nodeId);
      if (existing) {
        existing.score += sc.score;
      } else {
        nodeContributions.set(sc.node.nodeId, {
          path: sc.node.path,
          score: sc.score,
        });
      }
    }

    // Normalize contributions
    const totalScore = Array.from(nodeContributions.values()).reduce((sum, n) => sum + n.score, 0);

    return Array.from(nodeContributions.entries())
      .map(([nodeId, data]) => ({
        nodeId,
        path: data.path,
        contribution: totalScore > 0 ? data.score / totalScore : 0,
      }))
      .sort((a, b) => b.contribution - a.contribution);
  }
}
