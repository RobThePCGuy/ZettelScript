import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConnectionManager } from '../../src/storage/database/connection.js';
import { NodeRepository } from '../../src/storage/database/repositories/node-repository.js';

describe('Ghost Nodes', () => {
  const testDbPath = path.join(process.cwd(), 'tests/tmp/ghost-test/test.db');
  let connectionManager: ConnectionManager;
  let nodeRepository: NodeRepository;

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
  });

  afterEach(() => {
    connectionManager.close();
    ConnectionManager.resetInstance();
  });

  describe('create with isGhost', () => {
    it('creates a ghost node', async () => {
      const ghost = await nodeRepository.create({
        type: 'note',
        title: 'Unresolved Reference',
        path: '__ghost__/unresolved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isGhost: true,
      });

      expect(ghost.isGhost).toBe(true);
      expect(ghost.title).toBe('Unresolved Reference');
    });

    it('creates a real node by default', async () => {
      const real = await nodeRepository.create({
        type: 'note',
        title: 'Real Note',
        path: 'notes/real.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(real.isGhost).toBeUndefined();
    });
  });

  describe('getOrCreateGhost', () => {
    it('creates a new ghost if none exists', async () => {
      const ghost = await nodeRepository.getOrCreateGhost('Missing Character');

      expect(ghost.isGhost).toBe(true);
      expect(ghost.title).toBe('Missing Character');
      expect(ghost.path).toMatch(/^__ghost__\//);
    });

    it('returns existing ghost if one exists', async () => {
      const ghost1 = await nodeRepository.getOrCreateGhost('Missing Character');
      const ghost2 = await nodeRepository.getOrCreateGhost('Missing Character');

      expect(ghost1.nodeId).toBe(ghost2.nodeId);
    });

    it('is case-insensitive for matching', async () => {
      const ghost1 = await nodeRepository.getOrCreateGhost('Missing Character');
      const ghost2 = await nodeRepository.getOrCreateGhost('MISSING CHARACTER');

      expect(ghost1.nodeId).toBe(ghost2.nodeId);
    });

    it('sanitizes title for path', async () => {
      const ghost = await nodeRepository.getOrCreateGhost('Title With/Slashes & Stuff!');

      expect(ghost.path).not.toContain('/Slashes');
      expect(ghost.path).not.toContain('&');
      expect(ghost.path).not.toContain('!');
    });
  });

  describe('findGhosts', () => {
    it('returns only ghost nodes', async () => {
      await nodeRepository.create({
        type: 'note',
        title: 'Real Note',
        path: 'notes/real.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await nodeRepository.getOrCreateGhost('Ghost 1');
      await nodeRepository.getOrCreateGhost('Ghost 2');

      const ghosts = await nodeRepository.findGhosts();

      expect(ghosts).toHaveLength(2);
      expect(ghosts.every((g) => g.isGhost)).toBe(true);
    });
  });

  describe('findRealNodes', () => {
    it('returns only real nodes', async () => {
      await nodeRepository.create({
        type: 'note',
        title: 'Real Note 1',
        path: 'notes/real1.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await nodeRepository.create({
        type: 'note',
        title: 'Real Note 2',
        path: 'notes/real2.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await nodeRepository.getOrCreateGhost('Ghost');

      const realNodes = await nodeRepository.findRealNodes();

      expect(realNodes).toHaveLength(2);
      expect(realNodes.every((n) => !n.isGhost)).toBe(true);
    });
  });

  describe('countGhosts', () => {
    it('counts only ghost nodes', async () => {
      await nodeRepository.create({
        type: 'note',
        title: 'Real Note',
        path: 'notes/real.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await nodeRepository.getOrCreateGhost('Ghost 1');
      await nodeRepository.getOrCreateGhost('Ghost 2');
      await nodeRepository.getOrCreateGhost('Ghost 3');

      const count = await nodeRepository.countGhosts();

      expect(count).toBe(3);
    });
  });

  describe('materializeGhost', () => {
    it('converts ghost to real node', async () => {
      const ghost = await nodeRepository.getOrCreateGhost('Will Be Created');

      expect(ghost.isGhost).toBe(true);

      const real = await nodeRepository.materializeGhost(ghost.nodeId, 'notes/created.md');

      expect(real.isGhost).toBeUndefined();
      expect(real.path).toBe('notes/created.md');
      expect(real.nodeId).toBe(ghost.nodeId); // Same ID preserved
    });

    it('throws if node is not a ghost', async () => {
      const real = await nodeRepository.create({
        type: 'note',
        title: 'Real Note',
        path: 'notes/real.md',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await expect(
        nodeRepository.materializeGhost(real.nodeId, 'notes/new-path.md')
      ).rejects.toThrow('not a ghost');
    });
  });
});
