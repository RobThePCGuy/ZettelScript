import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { stringify as stringifyYaml } from 'yaml';
import { ConnectionManager } from '../../storage/database/connection.js';
import { DEFAULT_CONFIG, type ZettelScriptConfig } from '../../core/types/index.js';
import { getZettelScriptDir, getDbPath, getConfigPath, findVaultRoot, initContext, formatDuration, Spinner } from '../utils.js';
import { fullIndex } from '../../indexer/batch.js';
import { generateVisualizationHtml, typeColors, type GraphData } from './visualize.js';

export const setupCommand = new Command('setup')
  .alias('go')
  .description('Initialize vault, index files, and generate visualization (0 to hero)')
  .option('-f, --force', 'Reinitialize even if already set up')
  .option('--manuscript', 'Enable manuscript mode with POV and timeline validation')
  .option('--no-viz', 'Skip visualization generation')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const vaultPath = process.cwd();
    const zettelDir = getZettelScriptDir(vaultPath);
    let needsInit = true;

    console.log('ZettelScript Setup');
    console.log('==================\n');

    // Step 1: Initialize
    if (fs.existsSync(zettelDir) && !options.force) {
      const existingRoot = findVaultRoot(vaultPath);
      if (existingRoot) {
        console.log('Step 1: Initialize');
        console.log('  Already initialized, skipping...\n');
        needsInit = false;
      }
    }

    if (needsInit) {
      console.log('Step 1: Initialize');
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

        console.log('  Done!\n');
      } catch (error) {
        console.error('  Failed to initialize:', error);
        process.exit(1);
      }
    }

    // Step 2: Index files
    console.log('Step 2: Index files');
    try {
      const ctx = await initContext();

      const spinner = new Spinner('  Scanning files...');
      spinner.start();

      let lastProgress = 0;
      const result = await fullIndex(ctx.pipeline, ctx.vaultPath, {
        excludePatterns: ctx.config.vault.excludePatterns,
        onProgress: (current, total, filePath) => {
          if (current > lastProgress) {
            lastProgress = current;
            spinner.update(`  Indexing ${current}/${total}: ${filePath}`);
          }
        },
      });

      spinner.stop();

      console.log(`  Files: ${result.stats.totalFiles}`);
      console.log(`  Nodes: ${result.stats.nodeCount}`);
      console.log(`  Edges: ${result.stats.edgeCount}`);
      if (result.stats.unresolvedCount > 0) {
        console.log(`  Unresolved links: ${result.stats.unresolvedCount}`);
      }
      console.log(`  Duration: ${formatDuration(result.stats.durationMs)}`);

      if (result.errors.length > 0 && options.verbose) {
        console.log(`  Errors (${result.errors.length}):`);
        for (const err of result.errors.slice(0, 5)) {
          console.log(`    ${err.path}: ${err.error}`);
        }
        if (result.errors.length > 5) {
          console.log(`    ... and ${result.errors.length - 5} more`);
        }
      }

      console.log('  Done!\n');

      // Step 3: Generate visualization (unless --no-viz)
      if (options.viz) {
        console.log('Step 3: Generate visualization');

        const nodes = await ctx.nodeRepository.findAll();
        const edges = await ctx.edgeRepository.findAll();

        if (nodes.length === 0) {
          console.log('  No nodes to visualize, skipping...\n');
        } else {
          const nodeWeights = new Map<string, number>();
          edges.forEach(e => {
            nodeWeights.set(e.sourceId, (nodeWeights.get(e.sourceId) || 0) + 1);
            nodeWeights.set(e.targetId, (nodeWeights.get(e.targetId) || 0) + 1);
          });

          const graphData: GraphData = {
            nodes: nodes.map(n => ({
              id: n.nodeId,
              name: n.title,
              type: n.type,
              val: Math.max(1, Math.min(10, (nodeWeights.get(n.nodeId) || 0) / 2)),
              color: typeColors[n.type] || '#94a3b8',
              path: n.path,
              metadata: n.metadata as Record<string, unknown>
            })),
            links: edges.map(e => ({
              source: e.sourceId,
              target: e.targetId,
              type: e.edgeType,
              strength: e.strength ?? 1.0,
              provenance: e.provenance
            }))
          };

          const htmlContent = generateVisualizationHtml(graphData, typeColors);

          const outputPath = path.join(getZettelScriptDir(ctx.vaultPath), 'graph.html');
          fs.writeFileSync(outputPath, htmlContent, 'utf-8');

          console.log(`  Generated: ${path.relative(vaultPath, outputPath)}`);
          console.log('  Done!\n');
        }
      }

      ctx.connectionManager.close();

      // Summary
      console.log('Setup complete!');
      console.log('---------------');
      console.log('Next steps:');
      console.log('  zettel query <search>   Search your knowledge graph');
      console.log('  zettel discover --all   Find unlinked mentions');
      console.log('  zettel watch            Watch for file changes');
      if (options.viz && result.stats.nodeCount > 0) {
        console.log('  zettel visualize        Open graph in browser');
      }

      if (options.manuscript) {
        console.log('\nManuscript mode enabled:');
        console.log('  zettel validate --continuity   Check POV/timeline consistency');
      }

    } catch (error) {
      console.error('  Failed:', error);
      process.exit(1);
    }
  });

