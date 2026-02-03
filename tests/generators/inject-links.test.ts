import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { injectLinks, previewLinkInjection } from '../../src/generators/inject-links.js';

const OUTPUT_DIR = path.join(__dirname, '../tmp/inject-links-test');

describe('injectLinks', () => {
  beforeEach(async () => {
    if (fs.existsSync(OUTPUT_DIR)) {
      await fs.promises.rm(OUTPUT_DIR, { recursive: true });
    }
    await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  });

  afterEach(async () => {
    if (fs.existsSync(OUTPUT_DIR)) {
      await fs.promises.rm(OUTPUT_DIR, { recursive: true });
    }
  });

  it('should inject wikilinks for entity names', async () => {
    // Create test file
    const testFile = path.join(OUTPUT_DIR, 'test.md');
    await fs.promises.writeFile(testFile, 'Alpha met Beta at the facility.');

    const result = await injectLinks({
      vaultPath: OUTPUT_DIR,
      entities: ['Alpha', 'Beta'],
    });

    expect(result.modified.length).toBe(1);
    expect(result.linksInjected).toBe(2);

    const content = await fs.promises.readFile(testFile, 'utf-8');
    expect(content).toContain('[[Alpha]]');
    expect(content).toContain('[[Beta]]');
  });

  it('should avoid frontmatter', async () => {
    const testFile = path.join(OUTPUT_DIR, 'test.md');
    await fs.promises.writeFile(
      testFile,
      `---
title: Alpha
---

Alpha met Beta.`
    );

    await injectLinks({
      vaultPath: OUTPUT_DIR,
      entities: ['Alpha', 'Beta'],
    });

    const content = await fs.promises.readFile(testFile, 'utf-8');
    // Frontmatter should be unchanged
    expect(content).toMatch(/^---\ntitle: Alpha\n---/);
    // Body should have links
    expect(content).toContain('[[Alpha]] met [[Beta]]');
  });

  it('should avoid code blocks', async () => {
    const testFile = path.join(OUTPUT_DIR, 'test.md');
    await fs.promises.writeFile(
      testFile,
      `# Test

\`\`\`
Alpha code
\`\`\`

Alpha text`
    );

    await injectLinks({
      vaultPath: OUTPUT_DIR,
      entities: ['Alpha'],
    });

    const content = await fs.promises.readFile(testFile, 'utf-8');
    expect(content).toContain('```\nAlpha code\n```'); // Code unchanged
    expect(content).toContain('[[Alpha]] text'); // Body linked
  });

  it('should avoid existing links', async () => {
    const testFile = path.join(OUTPUT_DIR, 'test.md');
    await fs.promises.writeFile(testFile, '[[Alpha]] met Alpha again.');

    await injectLinks({
      vaultPath: OUTPUT_DIR,
      entities: ['Alpha'],
    });

    const content = await fs.promises.readFile(testFile, 'utf-8');
    // Should not double-link
    expect(content).toBe('[[Alpha]] met [[Alpha]] again.');
  });

  it('should avoid headers', async () => {
    const testFile = path.join(OUTPUT_DIR, 'test.md');
    await fs.promises.writeFile(
      testFile,
      `# Alpha Header

Alpha in body.`
    );

    await injectLinks({
      vaultPath: OUTPUT_DIR,
      entities: ['Alpha'],
    });

    const content = await fs.promises.readFile(testFile, 'utf-8');
    expect(content).toContain('# Alpha Header'); // Header unchanged
    expect(content).toContain('[[Alpha]] in body'); // Body linked
  });

  it('should support dry run mode', async () => {
    const testFile = path.join(OUTPUT_DIR, 'test.md');
    const originalContent = 'Alpha met Beta.';
    await fs.promises.writeFile(testFile, originalContent);

    const result = await injectLinks({
      vaultPath: OUTPUT_DIR,
      entities: ['Alpha', 'Beta'],
      dryRun: true,
    });

    expect(result.modified.length).toBe(1);

    // File should be unchanged
    const content = await fs.promises.readFile(testFile, 'utf-8');
    expect(content).toBe(originalContent);
  });

  it('should handle aliases with display text', async () => {
    const testFile = path.join(OUTPUT_DIR, 'test.md');
    await fs.promises.writeFile(testFile, 'The First arrived.');

    await injectLinks({
      vaultPath: OUTPUT_DIR,
      entities: ['Alpha One'],
    });

    const content = await fs.promises.readFile(testFile, 'utf-8');
    // Should not link "The First" without alias mapping
    expect(content).toBe('The First arrived.');
  });
});

describe('previewLinkInjection', () => {
  beforeEach(async () => {
    if (fs.existsSync(OUTPUT_DIR)) {
      await fs.promises.rm(OUTPUT_DIR, { recursive: true });
    }
    await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  });

  afterEach(async () => {
    if (fs.existsSync(OUTPUT_DIR)) {
      await fs.promises.rm(OUTPUT_DIR, { recursive: true });
    }
  });

  it('should return preview of changes', async () => {
    const testFile = path.join(OUTPUT_DIR, 'test.md');
    await fs.promises.writeFile(testFile, 'Alpha met Beta twice. Alpha left.');

    const previews = await previewLinkInjection({
      vaultPath: OUTPUT_DIR,
      entities: ['Alpha', 'Beta'],
    });

    expect(previews.size).toBe(1);
    const changes = previews.get(testFile);
    expect(changes).toBeDefined();
    expect(changes!.length).toBe(3); // Alpha, Beta, Alpha
  });
});
