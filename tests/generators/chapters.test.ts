import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateChapters, analyzeManuscript } from '../../src/generators/chapters.js';

const FIXTURE_DIR = path.join(__dirname, '../fixtures/sample-kb');
const MANUSCRIPT_PATH = path.join(FIXTURE_DIR, 'manuscript.md');
const OUTPUT_DIR = path.join(__dirname, '../tmp/chapters-test');

describe('generateChapters', () => {
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

  it('should split manuscript into chapter notes', async () => {
    const result = await generateChapters({
      outputDir: OUTPUT_DIR,
      manuscriptPath: MANUSCRIPT_PATH,
    });

    expect(result.created.length).toBe(5);
    expect(result.errors.length).toBe(0);

    // Check Chapter 1 was created
    const ch1Path = path.join(OUTPUT_DIR, 'Chapters', 'Chapter-01-The-Arrival.md');
    expect(fs.existsSync(ch1Path)).toBe(true);

    const content = fs.readFileSync(ch1Path, 'utf-8');
    expect(content).toContain('type: scene');
    expect(content).toContain('chapter: 1');
    expect(content).toContain('The Arrival');
    expect(content).toContain('Alpha approached the facility');
  });

  it('should preserve chapter content', async () => {
    await generateChapters({
      outputDir: OUTPUT_DIR,
      manuscriptPath: MANUSCRIPT_PATH,
    });

    const ch3Path = path.join(OUTPUT_DIR, 'Chapters', 'Chapter-03-The-Void.md');
    const content = fs.readFileSync(ch3Path, 'utf-8');

    expect(content).toContain('The portal opened without warning');
    expect(content).toContain('Gamma emerged from the shadows');
  });

  it('should support custom chapters directory', async () => {
    const result = await generateChapters({
      outputDir: OUTPUT_DIR,
      manuscriptPath: MANUSCRIPT_PATH,
      chaptersDir: 'Scenes',
    });

    expect(result.created.length).toBe(5);

    const ch1Path = path.join(OUTPUT_DIR, 'Scenes', 'Chapter-01-The-Arrival.md');
    expect(fs.existsSync(ch1Path)).toBe(true);
  });
});

describe('analyzeManuscript', () => {
  it('should return chapter analysis', () => {
    const analysis = analyzeManuscript(MANUSCRIPT_PATH);

    expect(analysis.chapters.length).toBe(5);
    expect(analysis.chapters[0]?.number).toBe(1);
    expect(analysis.chapters[0]?.title).toBe('The Arrival');
    expect(analysis.chapters[4]?.number).toBe(5);
    expect(analysis.chapters[4]?.title).toBe('Together');
  });
});
