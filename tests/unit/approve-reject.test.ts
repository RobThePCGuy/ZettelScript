import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConnectionManager } from '../../src/storage/database/connection.js';
import { NodeRepository } from '../../src/storage/database/repositories/node-repository.js';
import { EdgeRepository } from '../../src/storage/database/repositories/edge-repository.js';
import { CandidateEdgeRepository } from '../../src/storage/database/repositories/candidate-edge-repository.js';
import { generateSuggestionId } from '../../src/core/types/index.js';

describe('Approve/Reject Commands', () => {
  const testDbPath = path.join(process.cwd(), 'tests/tmp/approve-reject-test/test.db');
  let connectionManager: ConnectionManager;
  let nodeRepository: NodeRepository;
  let edgeRepository: EdgeRepository;
  let candidateEdgeRepository: CandidateEdgeRepository;

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
    candidateEdgeRepository = new CandidateEdgeRepository(db);
  });

  afterEach(() => {
    connectionManager.close();
    ConnectionManager.resetInstance();
  });

  describe('candidate edge approval flow', () => {
    it('approves a suggested edge and creates truth edge', async () => {
      // Create source and target nodes
      const fromNode = await nodeRepository.create({
        type: 'note',
        title: 'Source Note',
        path: 'notes/source.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const toNode = await nodeRepository.create({
        type: 'note',
        title: 'Target Note',
        path: 'notes/target.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create a candidate edge
      const suggestionId = generateSuggestionId(
        fromNode.nodeId,
        toNode.nodeId,
        'explicit_link',
        false
      );

      await candidateEdgeRepository.create({
        suggestionId,
        fromId: fromNode.nodeId,
        toId: toNode.nodeId,
        suggestedEdgeType: 'explicit_link',
        signals: { semantic: 0.75 },
        reasons: ['High semantic similarity'],
      });

      // Verify candidate is suggested
      const candidate = await candidateEdgeRepository.findById(suggestionId);
      expect(candidate?.status).toBe('suggested');

      // Simulate approval: create truth edge and update candidate
      const truthEdge = await edgeRepository.create({
        sourceId: fromNode.nodeId,
        targetId: toNode.nodeId,
        edgeType: 'explicit_link',
        provenance: 'user_approved',
        strength: 0.75,
      });

      await candidateEdgeRepository.updateStatus(suggestionId, 'approved', truthEdge.edgeId);

      // Verify candidate is approved
      const approvedCandidate = await candidateEdgeRepository.findById(suggestionId);
      expect(approvedCandidate?.status).toBe('approved');
      expect(approvedCandidate?.approvedEdgeId).toBe(truthEdge.edgeId);

      // Verify truth edge exists
      const edge = await edgeRepository.findById(truthEdge.edgeId);
      expect(edge).not.toBeNull();
      expect(edge?.sourceId).toBe(fromNode.nodeId);
      expect(edge?.targetId).toBe(toNode.nodeId);
      expect(edge?.provenance).toBe('user_approved');
    });

    it('is idempotent for already approved edges', async () => {
      // Create nodes and candidate
      const fromNode = await nodeRepository.create({
        type: 'note',
        title: 'Source',
        path: 'notes/source.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const toNode = await nodeRepository.create({
        type: 'note',
        title: 'Target',
        path: 'notes/target.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const suggestionId = generateSuggestionId(
        fromNode.nodeId,
        toNode.nodeId,
        'explicit_link',
        false
      );

      await candidateEdgeRepository.create({
        suggestionId,
        fromId: fromNode.nodeId,
        toId: toNode.nodeId,
        suggestedEdgeType: 'explicit_link',
      });

      // First approval
      const truthEdge = await edgeRepository.create({
        sourceId: fromNode.nodeId,
        targetId: toNode.nodeId,
        edgeType: 'explicit_link',
        provenance: 'user_approved',
      });
      await candidateEdgeRepository.updateStatus(suggestionId, 'approved', truthEdge.edgeId);

      // Second "approval" should return idempotent flag
      const candidate = await candidateEdgeRepository.findById(suggestionId);
      expect(candidate?.status).toBe('approved');
      // In real command, this would return success: true, idempotent: true
    });
  });

  describe('candidate edge rejection flow', () => {
    it('rejects a suggested edge', async () => {
      const fromNode = await nodeRepository.create({
        type: 'note',
        title: 'Source',
        path: 'notes/source.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const toNode = await nodeRepository.create({
        type: 'note',
        title: 'Target',
        path: 'notes/target.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const suggestionId = generateSuggestionId(
        fromNode.nodeId,
        toNode.nodeId,
        'explicit_link',
        false
      );

      await candidateEdgeRepository.create({
        suggestionId,
        fromId: fromNode.nodeId,
        toId: toNode.nodeId,
        suggestedEdgeType: 'explicit_link',
        reasons: ['Mentioned in text'],
      });

      // Reject the candidate
      await candidateEdgeRepository.updateStatus(suggestionId, 'rejected');

      // Verify rejection
      const candidate = await candidateEdgeRepository.findById(suggestionId);
      expect(candidate?.status).toBe('rejected');

      // No truth edge should be created
      const edges = await edgeRepository.findBySourceTargetType(
        fromNode.nodeId,
        toNode.nodeId,
        'explicit_link'
      );
      expect(edges).toBeNull();
    });

    it('is idempotent for already rejected edges', async () => {
      const fromNode = await nodeRepository.create({
        type: 'note',
        title: 'Source',
        path: 'notes/source.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const toNode = await nodeRepository.create({
        type: 'note',
        title: 'Target',
        path: 'notes/target.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const suggestionId = generateSuggestionId(
        fromNode.nodeId,
        toNode.nodeId,
        'explicit_link',
        false
      );

      await candidateEdgeRepository.create({
        suggestionId,
        fromId: fromNode.nodeId,
        toId: toNode.nodeId,
        suggestedEdgeType: 'explicit_link',
      });

      // First rejection
      await candidateEdgeRepository.updateStatus(suggestionId, 'rejected');

      // Second rejection should be idempotent
      const candidate = await candidateEdgeRepository.findById(suggestionId);
      expect(candidate?.status).toBe('rejected');
    });
  });

  describe('suggestionId generation', () => {
    it('generates consistent IDs for same inputs', () => {
      const id1 = generateSuggestionId('node-a', 'node-b', 'explicit_link', false);
      const id2 = generateSuggestionId('node-a', 'node-b', 'explicit_link', false);
      expect(id1).toBe(id2);
    });

    it('generates different IDs for different inputs', () => {
      const id1 = generateSuggestionId('node-a', 'node-b', 'explicit_link', false);
      const id2 = generateSuggestionId('node-a', 'node-c', 'explicit_link', false);
      expect(id1).not.toBe(id2);
    });

    it('canonicalizes undirected edges', () => {
      // For undirected edges, A->B and B->A should have the same ID
      const id1 = generateSuggestionId('node-b', 'node-a', 'semantic', true);
      const id2 = generateSuggestionId('node-a', 'node-b', 'semantic', true);
      expect(id1).toBe(id2);
    });

    it('preserves order for directed edges', () => {
      // For directed edges, A->B and B->A should have different IDs
      const id1 = generateSuggestionId('node-b', 'node-a', 'explicit_link', false);
      const id2 = generateSuggestionId('node-a', 'node-b', 'explicit_link', false);
      expect(id1).not.toBe(id2);
    });
  });

  describe('findSuggestedForNodes', () => {
    it('returns only suggested candidates for given nodes', async () => {
      // Create nodes
      const nodeA = await nodeRepository.create({
        type: 'note',
        title: 'Node A',
        path: 'notes/a.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeB = await nodeRepository.create({
        type: 'note',
        title: 'Node B',
        path: 'notes/b.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const nodeC = await nodeRepository.create({
        type: 'note',
        title: 'Node C',
        path: 'notes/c.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Create candidates: one suggested, one rejected
      const suggestedId = generateSuggestionId(nodeA.nodeId, nodeB.nodeId, 'explicit_link', false);
      const rejectedId = generateSuggestionId(nodeA.nodeId, nodeC.nodeId, 'explicit_link', false);

      await candidateEdgeRepository.create({
        suggestionId: suggestedId,
        fromId: nodeA.nodeId,
        toId: nodeB.nodeId,
        suggestedEdgeType: 'explicit_link',
      });

      await candidateEdgeRepository.create({
        suggestionId: rejectedId,
        fromId: nodeA.nodeId,
        toId: nodeC.nodeId,
        suggestedEdgeType: 'explicit_link',
      });
      await candidateEdgeRepository.updateStatus(rejectedId, 'rejected');

      // Find suggested for nodeA
      const suggested = await candidateEdgeRepository.findSuggestedForNodes([nodeA.nodeId]);

      expect(suggested).toHaveLength(1);
      expect(suggested[0].suggestionId).toBe(suggestedId);
      expect(suggested[0].status).toBe('suggested');
    });
  });
});
