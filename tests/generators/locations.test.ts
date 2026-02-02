import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateLocations } from '../../src/generators/locations.js';

const FIXTURE_DIR = path.join(__dirname, '../fixtures/sample-kb');
const KB_PATH = path.join(FIXTURE_DIR, '.narrative-project/kb/kb.json');
const OUTPUT_DIR = path.join(__dirname, '../tmp/locations-test');

describe('generateLocations', () => {
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

  it('should generate location notes from KB', async () => {
    const result = await generateLocations({
      outputDir: OUTPUT_DIR,
      kbPath: KB_PATH,
    });

    expect(result.created.length).toBe(2);
    expect(result.errors.length).toBe(0);

    const facilityPath = path.join(OUTPUT_DIR, 'Locations', 'Central-Facility.md');
    expect(fs.existsSync(facilityPath)).toBe(true);

    const content = fs.readFileSync(facilityPath, 'utf-8');
    expect(content).toContain('type: location');
    expect(content).toContain('realm: real_world');
  });

  it('should classify realms correctly', async () => {
    await generateLocations({
      outputDir: OUTPUT_DIR,
      kbPath: KB_PATH,
    });

    // Check real world location
    const facilityContent = fs.readFileSync(
      path.join(OUTPUT_DIR, 'Locations', 'Central-Facility.md'),
      'utf-8'
    );
    expect(facilityContent).toContain('realm: real_world');
    expect(facilityContent).toContain('real-world');

    // Check dimensional location
    const voidContent = fs.readFileSync(
      path.join(OUTPUT_DIR, 'Locations', 'The-Void-Realm.md'),
      'utf-8'
    );
    expect(voidContent).toContain('realm: dimensional');
    expect(voidContent).toContain('dimensional');
  });

  it('should include features', async () => {
    await generateLocations({
      outputDir: OUTPUT_DIR,
      kbPath: KB_PATH,
    });

    const facilityContent = fs.readFileSync(
      path.join(OUTPUT_DIR, 'Locations', 'Central-Facility.md'),
      'utf-8'
    );

    expect(facilityContent).toContain('Features');
    expect(facilityContent).toContain('underground labs');
    expect(facilityContent).toContain('security systems');
  });
});
