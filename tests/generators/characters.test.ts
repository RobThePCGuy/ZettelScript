import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateCharacters } from '../../src/generators/characters.js';

const FIXTURE_DIR = path.join(__dirname, '../fixtures/sample-kb');
const KB_PATH = path.join(FIXTURE_DIR, '.narrative-project/kb/kb.json');
const OUTPUT_DIR = path.join(__dirname, '../tmp/characters-test');

describe('generateCharacters', () => {
  beforeEach(async () => {
    // Clean up output directory
    if (fs.existsSync(OUTPUT_DIR)) {
      await fs.promises.rm(OUTPUT_DIR, { recursive: true });
    }
    await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    if (fs.existsSync(OUTPUT_DIR)) {
      await fs.promises.rm(OUTPUT_DIR, { recursive: true });
    }
  });

  it('should generate character notes from KB', async () => {
    const result = await generateCharacters({
      outputDir: OUTPUT_DIR,
      kbPath: KB_PATH,
    });

    expect(result.created.length).toBe(3); // Alpha One, Beta Two, Gamma Antagonist
    expect(result.errors.length).toBe(0);

    // Check Alpha One was created
    const alphaPath = path.join(OUTPUT_DIR, 'Characters', 'Alpha-One.md');
    expect(fs.existsSync(alphaPath)).toBe(true);

    const content = fs.readFileSync(alphaPath, 'utf-8');
    expect(content).toContain('type: character');
    expect(content).toContain('title: Alpha One');
    expect(content).toContain('protagonist');
    expect(content).toContain('aliases:');
  });

  it('should skip existing files without force flag', async () => {
    // First run
    await generateCharacters({
      outputDir: OUTPUT_DIR,
      kbPath: KB_PATH,
    });

    // Second run without force
    const result = await generateCharacters({
      outputDir: OUTPUT_DIR,
      kbPath: KB_PATH,
    });

    expect(result.created.length).toBe(0);
    expect(result.skipped.length).toBe(3);
  });

  it('should overwrite files with force flag', async () => {
    // First run
    await generateCharacters({
      outputDir: OUTPUT_DIR,
      kbPath: KB_PATH,
    });

    // Second run with force
    const result = await generateCharacters({
      outputDir: OUTPUT_DIR,
      kbPath: KB_PATH,
      force: true,
    });

    expect(result.created.length).toBe(3);
    expect(result.skipped.length).toBe(0);
  });

  it('should support dry run mode', async () => {
    const result = await generateCharacters({
      outputDir: OUTPUT_DIR,
      kbPath: KB_PATH,
      dryRun: true,
    });

    expect(result.created.length).toBe(3);

    // Files should not actually exist
    const alphaPath = path.join(OUTPUT_DIR, 'Characters', 'Alpha-One.md');
    expect(fs.existsSync(alphaPath)).toBe(false);
  });

  it('should include character arc information', async () => {
    await generateCharacters({
      outputDir: OUTPUT_DIR,
      kbPath: KB_PATH,
    });

    const alphaPath = path.join(OUTPUT_DIR, 'Characters', 'Alpha-One.md');
    const content = fs.readFileSync(alphaPath, 'utf-8');

    expect(content).toContain('Character Arc');
    expect(content).toContain('growth');
    expect(content).toContain('Key Moments');
    expect(content).toContain("I don't have to do this alone");
  });
});
