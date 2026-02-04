import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('ConnectionManager schema check', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zs-conn-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should handle missing schema_version table gracefully', async () => {
    // Reset the singleton before each test
    const module = await import('../../src/storage/database/connection.js');
    // @ts-expect-error - accessing private static for test
    module.ConnectionManager.instance = null;

    const dbPath = path.join(tmpDir, 'test.db');
    const manager = module.ConnectionManager.getInstance(dbPath);

    await expect(manager.initialize()).resolves.not.toThrow();
    manager.close();
  });

  it('should handle existing database with current schema', async () => {
    const module = await import('../../src/storage/database/connection.js');

    // Reset singleton
    // @ts-expect-error - accessing private static for test
    module.ConnectionManager.instance = null;

    const dbPath = path.join(tmpDir, 'test2.db');

    // Initialize once
    const manager1 = module.ConnectionManager.getInstance(dbPath);
    await manager1.initialize();
    manager1.close();

    // Reset singleton for fresh instance
    // @ts-expect-error - accessing private static for test
    module.ConnectionManager.instance = null;

    // Initialize again
    const manager2 = module.ConnectionManager.getInstance(dbPath);
    await expect(manager2.initialize()).resolves.not.toThrow();
    manager2.close();
  });
});
