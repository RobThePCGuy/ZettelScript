import {
  cosineSimilarity,
  type WormholeCandidate,
  type WormholeDetectorOptions,
  DEFAULT_WORMHOLE_OPTIONS,
} from './similarity.js';
import type { EmbeddingRepository, NodeEmbedding } from '../../storage/database/repositories/embedding-repository.js';
import type { EdgeRepository } from '../../storage/database/repositories/edge-repository.js';
import type { WormholeRepository } from '../../storage/database/repositories/wormhole-repository.js';
import type { NodeRepository } from '../../storage/database/repositories/node-repository.js';
import type { EdgeType } from '../../core/types/index.js';

/**
 * Detects semantic wormholes - similar but unlinked nodes
 */
export class WormholeDetector {
  private options: WormholeDetectorOptions;

  constructor(
    private embeddingRepo: EmbeddingRepository,
    private edgeRepo: EdgeRepository,
    private wormholeRepo: WormholeRepository,
    private nodeRepo: NodeRepository,
    options: Partial<WormholeDetectorOptions> = {}
  ) {
    this.options = { ...DEFAULT_WORMHOLE_OPTIONS, ...options };
  }

  /**
   * Detect all wormhole candidates based on embedding similarity
   */
  async detectWormholes(): Promise<WormholeCandidate[]> {
    // Get all embeddings
    const embeddings = await this.embeddingRepo.findAll();

    if (embeddings.length < 2) {
      return [];
    }

    // Build set of existing edges for exclusion
    const existingEdges = new Set<string>();
    if (this.options.excludeLinkedNodes) {
      const allEdges = await this.edgeRepo.findAll();
      for (const edge of allEdges) {
        // Store both directions for quick lookup
        existingEdges.add(`${edge.sourceId}:${edge.targetId}`);
        existingEdges.add(`${edge.targetId}:${edge.sourceId}`);
      }
    }

    // Get content hashes for rejection checking
    const nodeHashes = new Map<string, string>();
    const nodes = await this.nodeRepo.findAll();
    for (const node of nodes) {
      if (node.contentHash) {
        nodeHashes.set(node.nodeId, node.contentHash);
      }
    }

    // Track per-node wormhole counts
    const nodeWormholeCounts = new Map<string, number>();

    // Compute all pairwise similarities
    const candidates: WormholeCandidate[] = [];

    for (let i = 0; i < embeddings.length; i++) {
      const embA = embeddings[i];

      for (let j = i + 1; j < embeddings.length; j++) {
        const embB = embeddings[j];

        // Skip if already linked
        if (existingEdges.has(`${embA.nodeId}:${embB.nodeId}`)) {
          continue;
        }

        // Compute similarity
        const similarity = cosineSimilarity(embA.embedding, embB.embedding);

        // Skip if below threshold
        if (similarity < this.options.similarityThreshold) {
          continue;
        }

        // Check if rejected (with current content hashes)
        const sourceHash = nodeHashes.get(embA.nodeId) || '';
        const targetHash = nodeHashes.get(embB.nodeId) || '';
        const isRejected = await this.wormholeRepo.isRejected(
          embA.nodeId,
          embB.nodeId,
          sourceHash,
          targetHash
        );
        if (isRejected) {
          continue;
        }

        candidates.push({
          sourceId: embA.nodeId,
          targetId: embB.nodeId,
          similarity,
        });
      }
    }

    // Sort by similarity (descending)
    candidates.sort((a, b) => b.similarity - a.similarity);

    // Apply per-node limits
    const filteredCandidates: WormholeCandidate[] = [];

    for (const candidate of candidates) {
      const sourceCount = nodeWormholeCounts.get(candidate.sourceId) || 0;
      const targetCount = nodeWormholeCounts.get(candidate.targetId) || 0;

      if (
        sourceCount < this.options.maxWormholesPerNode &&
        targetCount < this.options.maxWormholesPerNode
      ) {
        filteredCandidates.push(candidate);
        nodeWormholeCounts.set(candidate.sourceId, sourceCount + 1);
        nodeWormholeCounts.set(candidate.targetId, targetCount + 1);
      }
    }

    return filteredCandidates;
  }

  /**
   * Create semantic_suggestion edges from wormhole candidates
   * Returns the number of edges created
   */
  async createSemanticEdges(candidates: WormholeCandidate[], model: string): Promise<number> {
    let created = 0;

    for (const candidate of candidates) {
      // Check if edge already exists
      const existing = await this.edgeRepo.findBySourceTargetType(
        candidate.sourceId,
        candidate.targetId,
        'semantic_suggestion' as EdgeType
      );

      if (existing) {
        // Update existing edge with new similarity
        await this.edgeRepo.update(existing.edgeId, {
          strength: candidate.similarity,
          attributes: {
            similarity: candidate.similarity,
            model,
            detectedAt: new Date().toISOString(),
          },
        });
      } else {
        // Create new edge
        await this.edgeRepo.create({
          sourceId: candidate.sourceId,
          targetId: candidate.targetId,
          edgeType: 'semantic_suggestion' as EdgeType,
          strength: candidate.similarity,
          provenance: 'computed',
          attributes: {
            similarity: candidate.similarity,
            model,
            detectedAt: new Date().toISOString(),
          },
        });
        created++;
      }
    }

    return created;
  }

  /**
   * Remove all semantic_suggestion edges
   */
  async clearSemanticEdges(): Promise<number> {
    const edges = await this.edgeRepo.findByType('semantic_suggestion' as EdgeType);
    for (const edge of edges) {
      await this.edgeRepo.delete(edge.edgeId);
    }
    return edges.length;
  }

  /**
   * Accept a wormhole - convert semantic_suggestion to semantic edge
   */
  async acceptWormhole(edgeId: string): Promise<boolean> {
    const edge = await this.edgeRepo.findById(edgeId);
    if (!edge || edge.edgeType !== 'semantic_suggestion') {
      return false;
    }

    await this.edgeRepo.update(edgeId, {
      edgeType: 'semantic' as EdgeType,
      provenance: 'user_approved',
      attributes: {
        ...edge.attributes,
        acceptedAt: new Date().toISOString(),
      },
    });

    return true;
  }

  /**
   * Reject a wormhole - delete the edge and record rejection
   */
  async rejectWormhole(edgeId: string): Promise<boolean> {
    const edge = await this.edgeRepo.findById(edgeId);
    if (!edge || edge.edgeType !== 'semantic_suggestion') {
      return false;
    }

    // Get content hashes for the nodes
    const sourceNode = await this.nodeRepo.findById(edge.sourceId);
    const targetNode = await this.nodeRepo.findById(edge.targetId);

    if (!sourceNode || !targetNode) {
      return false;
    }

    // Record rejection
    await this.wormholeRepo.createRejection({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      sourceContentHash: sourceNode.contentHash || '',
      targetContentHash: targetNode.contentHash || '',
    });

    // Delete the edge
    await this.edgeRepo.delete(edgeId);

    return true;
  }

  /**
   * Get statistics about current wormholes
   */
  async getStats(): Promise<{
    suggestionCount: number;
    acceptedCount: number;
    rejectionCount: number;
    embeddingCount: number;
    embeddedNodeCount: number;
    totalNodeCount: number;
  }> {
    const suggestions = await this.edgeRepo.findByType('semantic_suggestion' as EdgeType);
    const accepted = await this.edgeRepo.findByType('semantic' as EdgeType);
    const rejectionCount = await this.wormholeRepo.count();
    const embeddingCount = await this.embeddingRepo.count();
    const totalNodeCount = await this.nodeRepo.count();

    return {
      suggestionCount: suggestions.length,
      acceptedCount: accepted.filter(e => e.provenance === 'user_approved').length,
      rejectionCount,
      embeddingCount,
      embeddedNodeCount: embeddingCount, // Same as embeddingCount since 1:1
      totalNodeCount,
    };
  }
}
