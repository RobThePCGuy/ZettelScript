import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConnectionManager } from '../../src/storage/database/connection.js';
import { NodeRepository } from '../../src/storage/database/repositories/node-repository.js';
import { EdgeRepository } from '../../src/storage/database/repositories/edge-repository.js';
import { MentionRepository } from '../../src/storage/database/repositories/mention-repository.js';
import { EmbeddingRepository } from '../../src/storage/database/repositories/embedding-repository.js';
import { CandidateEdgeRepository } from '../../src/storage/database/repositories/candidate-edge-repository.js';
import { SuggestionEngine, OrphanEngine, ORPHAN_WEIGHTS } from '../../src/discovery/suggestion-engine.js';

describe('SuggestionEngine', () => {
  const testDbPath = path.join(process.cwd(), 'tests/tmp/suggestion-engine-test/test.db');
  let connectionManager: ConnectionManager;
  let nodeRepository: NodeRepository;
  let edgeRepository: EdgeRepository;
  let mentionRepository: MentionRepository;
  let embeddingRepository: EmbeddingRepository;
  let candidateEdgeRepository: CandidateEdgeRepository;
  let suggestionEngine: SuggestionEngine;

  beforeEach(async () => {
    // Ensure clean state
    const dir = path.dirname(testDbPath);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
    }
    fs.mkdirSync(dir, { recursive: true });

    ConnectionManager.resetInstance();
    connectionManager = ConnectionManager.getInstance(testDbPath);
    await connectionManager.initialize();

    const db = connectionManager.getDb();
    nodeRepository = new NodeRepository(db);
    edgeRepository = new EdgeRepository(db);
    mentionRepository = new MentionRepository(db);
    embeddingRepository = new EmbeddingRepository(db);
    candidateEdgeRepository = new CandidateEdgeRepository(db);

    suggestionEngine = new SuggestionEngine(
      nodeRepository,
      edgeRepository,
      mentionRepository,
      embeddingRepository,
      candidateEdgeRepository
    );
  });

  afterEach(() => {
    connectionManager.close();
    ConnectionManager.resetInstance();
  });

  describe('computeMentionCandidates', () => {
    it('returns empty result for empty scope', async () => {
      const result = await suggestionEngine.computeMentionCandidates([]);
      expect(result.total).toBe(0);
      expect(result.created).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
    });

    it('creates candidates from mentions meeting threshold', async () => {
      // Create nodes
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Note A',
        path: 'notes/a.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Note B',
        path: 'notes/b.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create mentions (2 mentions to meet threshold)
      await mentionRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeB.nodeId,
        surfaceText: 'Note B',
        confidence: 0.8,
        status: 'new',
        spanStart: 10,
        spanEnd: 16,
      });

      await mentionRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeB.nodeId,
        surfaceText: 'B',
        confidence: 0.6,
        status: 'new',
        spanStart: 50,
        spanEnd: 51,
      });

      const result = await suggestionEngine.computeMentionCandidates([nodeA.nodeId, nodeB.nodeId]);

      expect(result.total).toBe(1);
      expect(result.created).toHaveLength(1);
      expect(result.created[0].fromId).toBe(nodeA.nodeId);
      expect(result.created[0].toId).toBe(nodeB.nodeId);
      expect(result.created[0].signals?.mentionCount).toBe(2);
      expect(result.created[0].reasons).toContain('Mentioned as "Note B"');
    });

    it('does not create candidates below threshold', async () => {
      // Create nodes
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Note A',
        path: 'notes/a.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Note B',
        path: 'notes/b.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create only 1 mention (below default threshold of 2)
      await mentionRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeB.nodeId,
        surfaceText: 'Note B',
        confidence: 0.8,
        status: 'new',
        spanStart: 10,
        spanEnd: 16,
      });

      const result = await suggestionEngine.computeMentionCandidates([nodeA.nodeId, nodeB.nodeId]);

      expect(result.total).toBe(0);
    });

    it('does not create candidates for already connected pairs', async () => {
      // Create nodes
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Note A',
        path: 'notes/a.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Note B',
        path: 'notes/b.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create Layer A edge
      await edgeRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeB.nodeId,
        edgeType: 'explicit_link',
        provenance: 'explicit',
        createdAt: new Date().toISOString(),
      });

      // Create mentions (meeting threshold)
      await mentionRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeB.nodeId,
        surfaceText: 'Note B',
        confidence: 0.8,
        status: 'new',
        spanStart: 10,
        spanEnd: 16,
      });

      await mentionRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeB.nodeId,
        surfaceText: 'B',
        confidence: 0.6,
        status: 'new',
        spanStart: 50,
        spanEnd: 51,
      });

      const result = await suggestionEngine.computeMentionCandidates([nodeA.nodeId, nodeB.nodeId]);

      // Should not create candidate because nodes are already linked
      expect(result.total).toBe(0);
    });

    it('excludes rejected mentions from count', async () => {
      // Create nodes
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Note A',
        path: 'notes/a.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Note B',
        path: 'notes/b.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create 2 mentions but one is rejected
      await mentionRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeB.nodeId,
        surfaceText: 'Note B',
        confidence: 0.8,
        status: 'new',
        spanStart: 10,
        spanEnd: 16,
      });

      await mentionRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeB.nodeId,
        surfaceText: 'B',
        confidence: 0.6,
        status: 'rejected',
        spanStart: 50,
        spanEnd: 51,
      });

      const result = await suggestionEngine.computeMentionCandidates([nodeA.nodeId, nodeB.nodeId]);

      // Should not create candidate because only 1 non-rejected mention
      expect(result.total).toBe(0);
    });

    it('updates existing candidate when recomputed', async () => {
      // Create nodes
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Note A',
        path: 'notes/a.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Note B',
        path: 'notes/b.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create 2 mentions
      await mentionRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeB.nodeId,
        surfaceText: 'Note B',
        confidence: 0.8,
        status: 'new',
        spanStart: 10,
        spanEnd: 16,
      });

      await mentionRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeB.nodeId,
        surfaceText: 'B',
        confidence: 0.6,
        status: 'new',
        spanStart: 50,
        spanEnd: 51,
      });

      // First computation
      const result1 = await suggestionEngine.computeMentionCandidates([nodeA.nodeId, nodeB.nodeId]);
      expect(result1.created).toHaveLength(1);
      expect(result1.updated).toHaveLength(0);

      // Add another mention
      await mentionRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeB.nodeId,
        surfaceText: 'NoteB',
        confidence: 0.7,
        status: 'new',
        spanStart: 100,
        spanEnd: 105,
      });

      // Second computation should update
      const result2 = await suggestionEngine.computeMentionCandidates([nodeA.nodeId, nodeB.nodeId]);
      expect(result2.created).toHaveLength(0);
      expect(result2.updated).toHaveLength(1);
      expect(result2.updated[0].signals?.mentionCount).toBe(3);
    });
  });

  describe('computeSemanticCandidates', () => {
    it('returns empty result for empty scope', async () => {
      const result = await suggestionEngine.computeSemanticCandidates([]);
      expect(result.total).toBe(0);
    });

    it('returns empty result when not enough embeddings', async () => {
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Note A',
        path: 'notes/a.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Only one embedding
      await embeddingRepository.create({
        nodeId: nodeA.nodeId,
        embedding: [0.1, 0.2, 0.3],
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-a',
      });

      const result = await suggestionEngine.computeSemanticCandidates([nodeA.nodeId]);
      expect(result.total).toBe(0);
    });

    it('creates candidates for similar embeddings in range', async () => {
      // Create nodes
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Note A',
        path: 'notes/a.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Note B',
        path: 'notes/b.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create embeddings with moderate similarity (0.4-0.74 range)
      // Vectors that give ~0.5 cosine similarity
      await embeddingRepository.create({
        nodeId: nodeA.nodeId,
        embedding: [1, 0, 0],
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-a',
      });

      await embeddingRepository.create({
        nodeId: nodeB.nodeId,
        embedding: [0.6, 0.8, 0], // cosine similarity with [1,0,0] = 0.6
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-b',
      });

      const result = await suggestionEngine.computeSemanticCandidates([nodeA.nodeId, nodeB.nodeId]);

      expect(result.total).toBe(1);
      expect(result.created).toHaveLength(1);
      expect(result.created[0].suggestedEdgeType).toBe('semantic_suggestion');
      expect(result.created[0].signals?.semantic).toBeCloseTo(0.6, 1);
    });

    it('does not create candidates for very similar embeddings (wormhole range)', async () => {
      // Create nodes
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Note A',
        path: 'notes/a.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Note B',
        path: 'notes/b.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create embeddings with high similarity (above 0.74)
      await embeddingRepository.create({
        nodeId: nodeA.nodeId,
        embedding: [1, 0, 0],
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-a',
      });

      await embeddingRepository.create({
        nodeId: nodeB.nodeId,
        embedding: [0.9, 0.1, 0], // Very similar
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-b',
      });

      const result = await suggestionEngine.computeSemanticCandidates([nodeA.nodeId, nodeB.nodeId]);

      // Should not create because similarity is above wormhole threshold
      expect(result.total).toBe(0);
    });

    it('does not create candidates for dissimilar embeddings', async () => {
      // Create nodes
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Note A',
        path: 'notes/a.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Note B',
        path: 'notes/b.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create orthogonal embeddings (similarity = 0)
      await embeddingRepository.create({
        nodeId: nodeA.nodeId,
        embedding: [1, 0, 0],
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-a',
      });

      await embeddingRepository.create({
        nodeId: nodeB.nodeId,
        embedding: [0, 1, 0], // Orthogonal
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-b',
      });

      const result = await suggestionEngine.computeSemanticCandidates([nodeA.nodeId, nodeB.nodeId]);

      // Should not create because similarity is below threshold
      expect(result.total).toBe(0);
    });

    it('does not create candidates for already connected pairs', async () => {
      // Create nodes
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Note A',
        path: 'notes/a.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Note B',
        path: 'notes/b.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create Layer A edge
      await edgeRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeB.nodeId,
        edgeType: 'explicit_link',
        provenance: 'explicit',
        createdAt: new Date().toISOString(),
      });

      // Create embeddings in suggestion range
      await embeddingRepository.create({
        nodeId: nodeA.nodeId,
        embedding: [1, 0, 0],
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-a',
      });

      await embeddingRepository.create({
        nodeId: nodeB.nodeId,
        embedding: [0.6, 0.8, 0],
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-b',
      });

      const result = await suggestionEngine.computeSemanticCandidates([nodeA.nodeId, nodeB.nodeId]);

      // Should not create because nodes are already linked
      expect(result.total).toBe(0);
    });
  });

  describe('computeAllCandidates', () => {
    it('computes both mention and semantic candidates', async () => {
      // Create nodes
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Note A',
        path: 'notes/a.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Note B',
        path: 'notes/b.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeC = await nodeRepository.create({
        type: 'note',
        title: 'Note C',
        path: 'notes/c.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create mentions A->B (meeting threshold)
      await mentionRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeB.nodeId,
        surfaceText: 'Note B',
        confidence: 0.8,
        status: 'new',
        spanStart: 10,
        spanEnd: 16,
      });

      await mentionRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeB.nodeId,
        surfaceText: 'B',
        confidence: 0.6,
        status: 'new',
        spanStart: 50,
        spanEnd: 51,
      });

      // Create embeddings for semantic suggestion A-C
      await embeddingRepository.create({
        nodeId: nodeA.nodeId,
        embedding: [1, 0, 0],
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-a',
      });

      await embeddingRepository.create({
        nodeId: nodeC.nodeId,
        embedding: [0.6, 0.8, 0], // ~0.6 similarity with A
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-c',
      });

      const result = await suggestionEngine.computeAllCandidates([
        nodeA.nodeId,
        nodeB.nodeId,
        nodeC.nodeId,
      ]);

      expect(result.mentions.total).toBe(1);
      expect(result.semantic.total).toBe(1);
      expect(result.total).toBe(2);
    });
  });
});

describe('OrphanEngine', () => {
  const testDbPath = path.join(process.cwd(), 'tests/tmp/orphan-engine-test/test.db');
  let connectionManager: ConnectionManager;
  let nodeRepository: NodeRepository;
  let edgeRepository: EdgeRepository;
  let mentionRepository: MentionRepository;
  let embeddingRepository: EmbeddingRepository;
  let orphanEngine: OrphanEngine;

  beforeEach(async () => {
    // Ensure clean state
    const dir = path.dirname(testDbPath);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
    }
    fs.mkdirSync(dir, { recursive: true });

    ConnectionManager.resetInstance();
    connectionManager = ConnectionManager.getInstance(testDbPath);
    await connectionManager.initialize();

    const db = connectionManager.getDb();
    nodeRepository = new NodeRepository(db);
    edgeRepository = new EdgeRepository(db);
    mentionRepository = new MentionRepository(db);
    embeddingRepository = new EmbeddingRepository(db);

    orphanEngine = new OrphanEngine(
      nodeRepository,
      edgeRepository,
      mentionRepository,
      embeddingRepository,
      { minScore: 0 } // Lower threshold for testing
    );
  });

  afterEach(() => {
    connectionManager.close();
    ConnectionManager.resetInstance();
  });

  describe('computeOrphanScores', () => {
    it('returns empty array for empty scope', async () => {
      const result = await orphanEngine.computeOrphanScores([]);
      expect(result).toHaveLength(0);
    });

    it('computes orphan scores for nodes without links', async () => {
      const node = await nodeRepository.create({
        type: 'note',
        title: 'Orphan Note',
        path: 'notes/orphan.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await orphanEngine.computeOrphanScores([node.nodeId]);

      expect(result).toHaveLength(1);
      expect(result[0].nodeId).toBe(node.nodeId);
      // With no links, lowTruthDegree = 1/(1+0) = 1
      expect(result[0].components.lowTruthDegree).toBe(1);
    });

    it('gives lower score to well-connected nodes', async () => {
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Well Connected',
        path: 'notes/connected.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Orphan Note',
        path: 'notes/orphan.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeC = await nodeRepository.create({
        type: 'note',
        title: 'Another Note',
        path: 'notes/another.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create Layer A edge A->C
      await edgeRepository.create({
        sourceId: nodeA.nodeId,
        targetId: nodeC.nodeId,
        edgeType: 'explicit_link',
        provenance: 'explicit',
        createdAt: new Date().toISOString(),
      });

      const result = await orphanEngine.computeOrphanScores([
        nodeA.nodeId,
        nodeB.nodeId,
        nodeC.nodeId,
      ]);

      // Find nodeB (orphan) and nodeA (connected)
      const orphanEntry = result.find((e) => e.nodeId === nodeB.nodeId);
      const connectedEntry = result.find((e) => e.nodeId === nodeA.nodeId);

      expect(orphanEntry).toBeDefined();
      expect(connectedEntry).toBeDefined();

      // Orphan should have higher lowTruthDegree component
      expect(orphanEntry!.components.lowTruthDegree).toBeGreaterThan(
        connectedEntry!.components.lowTruthDegree
      );
    });

    it('includes semantic pull in score', async () => {
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Note A',
        path: 'notes/a.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Note B',
        path: 'notes/b.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create similar embeddings (not connected by Layer A)
      await embeddingRepository.create({
        nodeId: nodeA.nodeId,
        embedding: [1, 0, 0],
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-a',
      });

      await embeddingRepository.create({
        nodeId: nodeB.nodeId,
        embedding: [0.8, 0.6, 0], // ~0.8 similarity
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-b',
      });

      const result = await orphanEngine.computeOrphanScores([nodeA.nodeId, nodeB.nodeId]);

      expect(result).toHaveLength(2);
      // Both should have semantic pull > 0 due to similarity
      expect(result[0].components.semanticPull).toBeGreaterThan(0);
      expect(result[1].components.semanticPull).toBeGreaterThan(0);
    });

    it('includes mention pressure in score', async () => {
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Mentioned Note',
        path: 'notes/mentioned.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Source Note',
        path: 'notes/source.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create unresolved mentions pointing to nodeA
      await mentionRepository.create({
        sourceId: nodeB.nodeId,
        targetId: nodeA.nodeId,
        surfaceText: 'Mentioned Note',
        confidence: 0.8,
        status: 'new',
        spanStart: 10,
        spanEnd: 23,
      });

      await mentionRepository.create({
        sourceId: nodeB.nodeId,
        targetId: nodeA.nodeId,
        surfaceText: 'mentioned',
        confidence: 0.6,
        status: 'new',
        spanStart: 50,
        spanEnd: 59,
      });

      const result = await orphanEngine.computeOrphanScores([nodeA.nodeId, nodeB.nodeId]);

      const mentionedEntry = result.find((e) => e.nodeId === nodeA.nodeId);
      expect(mentionedEntry).toBeDefined();
      expect(mentionedEntry!.components.mentionPressure).toBe(1); // Max mentions = this node
    });

    it('calculates percentile and severity correctly', async () => {
      // Create 4 nodes with different connectivity
      const nodes = await Promise.all(
        ['a', 'b', 'c', 'd'].map((name) =>
          nodeRepository.create({
            type: 'note',
            title: `Note ${name.toUpperCase()}`,
            path: `notes/${name}.md`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        )
      );

      // Connect some nodes (A-B, B-C) - leaving D as orphan
      await edgeRepository.create({
        sourceId: nodes[0].nodeId,
        targetId: nodes[1].nodeId,
        edgeType: 'explicit_link',
        provenance: 'explicit',
        createdAt: new Date().toISOString(),
      });

      await edgeRepository.create({
        sourceId: nodes[1].nodeId,
        targetId: nodes[2].nodeId,
        edgeType: 'explicit_link',
        provenance: 'explicit',
        createdAt: new Date().toISOString(),
      });

      const result = await orphanEngine.computeOrphanScores(nodes.map((n) => n.nodeId));

      expect(result.length).toBeGreaterThan(0);

      // Results should be sorted by score descending
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].orphanScore).toBeGreaterThanOrEqual(result[i].orphanScore);
      }

      // Check severity assignment
      for (const entry of result) {
        if (entry.percentile >= 75) {
          expect(entry.severity).toBe('high');
        } else if (entry.percentile >= 50) {
          expect(entry.severity).toBe('med');
        } else {
          expect(entry.severity).toBe('low');
        }
      }
    });

    it('excludes ghost nodes', async () => {
      const realNode = await nodeRepository.create({
        type: 'note',
        title: 'Real Note',
        path: 'notes/real.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const ghostNode = await nodeRepository.getOrCreateGhost('Ghost Note');

      const result = await orphanEngine.computeOrphanScores([realNode.nodeId, ghostNode.nodeId]);

      expect(result).toHaveLength(1);
      expect(result[0].nodeId).toBe(realNode.nodeId);
    });

    it('includes related node IDs for context', async () => {
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Note A',
        path: 'notes/a.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Note B',
        path: 'notes/b.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create similar embeddings
      await embeddingRepository.create({
        nodeId: nodeA.nodeId,
        embedding: [1, 0, 0],
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-a',
      });

      await embeddingRepository.create({
        nodeId: nodeB.nodeId,
        embedding: [0.8, 0.6, 0],
        model: 'test-model',
        dimensions: 3,
        contentHash: 'hash-b',
      });

      const result = await orphanEngine.computeOrphanScores([nodeA.nodeId, nodeB.nodeId]);

      // Each entry should have the other node as a related node
      const entryA = result.find((e) => e.nodeId === nodeA.nodeId);
      const entryB = result.find((e) => e.nodeId === nodeB.nodeId);

      expect(entryA?.relatedNodeIds).toContain(nodeB.nodeId);
      expect(entryB?.relatedNodeIds).toContain(nodeA.nodeId);
    });
  });

  describe('ORPHAN_WEIGHTS', () => {
    it('weights sum to 1.0', () => {
      const sum =
        ORPHAN_WEIGHTS.semanticPull +
        ORPHAN_WEIGHTS.lowTruthDegree +
        ORPHAN_WEIGHTS.mentionPressure +
        ORPHAN_WEIGHTS.importance;
      expect(sum).toBeCloseTo(1.0, 10);
    });
  });
});
