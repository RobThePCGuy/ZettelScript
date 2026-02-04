import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Doctor version', () => {
  it('should read version from package.json', async () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const expectedVersion = packageJson.version;

    const { getVersion } = await import('../../src/cli/commands/doctor.js');
    expect(getVersion()).toBe(expectedVersion);
  });

  it('should fallback to unknown if package.json is unreadable', async () => {
    const { getVersionFromPath } = await import('../../src/cli/commands/doctor.js');
    const version = getVersionFromPath('/nonexistent/package.json');
    expect(version).toBe('unknown');
  });
});
