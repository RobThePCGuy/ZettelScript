import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { ConnectionManager } from '../../storage/database/connection.js';
import { DEFAULT_CONFIG, type ZettelScriptConfig } from '../../core/types/index.js';
import { getZettelScriptDir, getDbPath, getConfigPath, findVaultRoot } from '../utils.js';

export const initCommand = new Command('init')
  .description('Initialize a ZettelScript vault in the current directory')
  .option('-f, --force', 'Overwrite existing initialization')
  .option('--manuscript', 'Enable manuscript mode with POV and timeline validation')
  .action(async (options) => {
    const vaultPath = process.cwd();
    const zettelDir = getZettelScriptDir(vaultPath);

    // Check if already initialized
    if (fs.existsSync(zettelDir) && !options.force) {
      const existingRoot = findVaultRoot(vaultPath);
      if (existingRoot) {
        console.log(`Already initialized at: ${existingRoot}`);
        console.log('Use --force to reinitialize.');
        return;
      }
    }

    console.log('Initializing ZettelScript vault...');

    try {
      // Create .zettelscript directory
      fs.mkdirSync(zettelDir, { recursive: true });
      console.log(`  Created ${path.relative(vaultPath, zettelDir)}/`);

      // Create config file
      const config: ZettelScriptConfig = {
        ...DEFAULT_CONFIG,
        vault: {
          ...DEFAULT_CONFIG.vault,
          path: '.',
        },
        manuscript: {
          ...DEFAULT_CONFIG.manuscript,
          enabled: options.manuscript || false,
        },
      };

      const configPath = getConfigPath(vaultPath);
      fs.writeFileSync(configPath, stringifyYaml(config), 'utf-8');
      console.log(`  Created ${path.relative(vaultPath, configPath)}`);

      // Initialize database
      const dbPath = getDbPath(vaultPath);
      const manager = ConnectionManager.getInstance(dbPath);
      await manager.initialize();
      manager.close();
      ConnectionManager.resetInstance();
      console.log(`  Created ${path.relative(vaultPath, dbPath)}`);

      // Create .gitignore for .zettelscript
      const gitignorePath = path.join(zettelDir, '.gitignore');
      fs.writeFileSync(gitignorePath, '# Ignore database (regenerated from files)\nzettelscript.db\nzettelscript.db-*\n', 'utf-8');

      console.log('\nZettelScript vault initialized!');
      console.log('\nNext steps:');
      console.log('  zettel index    Index all markdown files');
      console.log('  zettel watch    Watch for file changes');
      console.log('  zettel query    Query the graph');

      if (options.manuscript) {
        console.log('\nManuscript mode enabled:');
        console.log('  - Add "type: scene" to scene frontmatter');
        console.log('  - Add "pov: CharacterName" for POV tracking');
        console.log('  - Add "scene_order: N" for timeline ordering');
        console.log('  - Run "zettel validate --continuity" to check consistency');
      }
    } catch (error) {
      console.error('Failed to initialize:', error);
      process.exit(1);
    }
  });
