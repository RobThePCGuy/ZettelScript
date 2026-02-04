import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { loadConfig } from '../../src/cli/utils.js';

describe('Config loading', () => {
  let tmpDir: string;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zs-config-test-'));
    const zettelDir = path.join(tmpDir, '.zettelscript');
    fs.mkdirSync(zettelDir, { recursive: true });
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    warnSpy.mockRestore();
  });

  it('should return default config when config file is missing', () => {
    const config = loadConfig(tmpDir);
    expect(config.vault.path).toBe(tmpDir);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should warn with file path when config is malformed', () => {
    const configPath = path.join(tmpDir, '.zettelscript', 'config.yaml');
    fs.writeFileSync(configPath, 'invalid: yaml: content: [unclosed', 'utf-8');

    const config = loadConfig(tmpDir);

    expect(config.vault.path).toBe(tmpDir);
    expect(warnSpy).toHaveBeenCalled();
    const warnMessage = warnSpy.mock.calls[0][0];
    expect(warnMessage).toContain(configPath);
    expect(warnMessage).toMatch(/using defaults/i);
  });
});
