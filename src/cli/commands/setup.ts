import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import process from 'node:process';
import { stringify as stringifyYaml } from 'yaml';
import { nanoid } from 'nanoid';
import { ConnectionManager } from '../../storage/database/connection.js';
import { DEFAULT_CONFIG, type ZettelScriptConfig } from '../../core/types/index.js';
import {
  getZettelScriptDir,
  getDbPath,
  getConfigPath,
  findVaultRoot,
  initContext,
  formatDuration,
  Spinner,
} from '../utils.js';
import { fullIndex } from '../../indexer/batch.js';
import { generateVisualizationHtml, typeColors, type GraphData } from './visualize.js';
import { EntityExtractor, type ExtractedEntity } from '../../extraction/index.js';
import {
  OllamaLLMProvider,
  checkOllamaRunning,
  checkOllamaModelExists,
  pullOllamaModel,
  listOllamaModels,
} from '../../llm/provider.js';
import { createEmbeddingProvider } from '../../retrieval/embeddings/provider.js';
import { WormholeDetector } from '../../retrieval/similarity/wormhole-detector.js';

/**
 * Prompt user for yes/no confirmation
 */
async function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/n) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

/**
 * Format bytes as human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export const setupCommand = new Command('setup')
  .alias('go')
  .description('Initialize vault, index files, and generate visualization (0 to hero)')
  .option('-f, --force', 'Reinitialize even if already set up')
  .option('--manuscript', 'Enable manuscript mode with POV and timeline validation')
  .option('--extract', 'Extract entities from prose using LLM')
  .option('--extract-model <model>', 'Ollama model for extraction', 'qwen2.5:7b')
  .option('--embed', 'Compute embeddings for semantic features')
  .option('--wormholes', 'Detect semantic wormholes (implies --embed)')
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
        fs.writeFileSync(
          gitignorePath,
          '# Ignore database (regenerated from files)\nzettelscript.db\nzettelscript.db-*\n',
          'utf-8'
        );

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

      let stepNum = 3;

      // Step 3 (optional): Extract entities
      if (options.extract) {
        console.log(`Step ${stepNum}: Extract entities`);
        stepNum++;

        // Check Ollama is running
        const ollamaRunning = await checkOllamaRunning();
        if (!ollamaRunning) {
          console.log('  Ollama is not running, skipping extraction.');
          console.log('  Start Ollama and run: zettel extract --all\n');
        } else {
          // Check if model exists
          const modelExists = await checkOllamaModelExists(options.extractModel);
          if (!modelExists) {
            console.log(`  Model '${options.extractModel}' is not installed.`);
            const availableModels = await listOllamaModels();
            if (availableModels.length > 0) {
              console.log(
                `  Installed: ${availableModels.slice(0, 3).join(', ')}${availableModels.length > 3 ? '...' : ''}`
              );
            }

            const shouldDownload = await promptYesNo(`  Download '${options.extractModel}' now?`);
            if (shouldDownload) {
              console.log(`  Downloading ${options.extractModel}...`);
              try {
                for await (const progress of pullOllamaModel(options.extractModel)) {
                  if (progress.completed !== undefined && progress.total !== undefined) {
                    const percent = ((progress.completed / progress.total) * 100).toFixed(0);
                    process.stdout.write(
                      `\r  ${progress.status}: ${formatBytes(progress.completed)} / ${formatBytes(progress.total)} (${percent}%)    `
                    );
                  } else {
                    process.stdout.write(`\r  ${progress.status}...    `);
                  }
                }
                console.log('\n  Download complete!');
              } catch (err) {
                console.error(
                  `\n  Failed to download: ${err instanceof Error ? err.message : err}`
                );
                console.log('  Skipping extraction.\n');
              }
            } else {
              console.log('  Skipping extraction.\n');
            }
          }

          // Re-check model exists (might have just downloaded)
          const modelReady = await checkOllamaModelExists(options.extractModel);
          if (modelReady) {
            const llmProvider = new OllamaLLMProvider({
              provider: 'ollama',
              model: options.extractModel,
              baseUrl: 'http://localhost:11434',
            });

            const extractor = new EntityExtractor({
              llmProvider,
              chunkSize: 6000,
            });

            // Find markdown files
            const findMarkdown = (dir: string): string[] => {
              const results: string[] = [];
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
                if (entry.isDirectory()) {
                  results.push(...findMarkdown(fullPath));
                } else if (entry.name.endsWith('.md')) {
                  results.push(fullPath);
                }
              }
              return results;
            };

            const files = findMarkdown(ctx.vaultPath);
            const allEntities = new Map<string, ExtractedEntity>();
            let filesProcessed = 0;

            const spinner = new Spinner(`  Extracting from ${files.length} files...`);
            spinner.start();

            for (const filePath of files) {
              const content = fs.readFileSync(filePath, 'utf-8');
              if (content.length < 100) continue; // Skip tiny files

              try {
                const result = await extractor.extractFromText(content);
                for (const entity of result.entities) {
                  const key = entity.name.toLowerCase();
                  if (!allEntities.has(key)) {
                    allEntities.set(key, entity);
                  } else {
                    const existing = allEntities.get(key)!;
                    existing.mentions += entity.mentions;
                  }
                }
                filesProcessed++;
                spinner.update(
                  `  Extracted ${filesProcessed}/${files.length}: ${allEntities.size} entities found`
                );
              } catch {
                // Skip files that fail extraction
              }
            }

            spinner.stop();

            // Create entity files
            const outputDir = path.join(ctx.vaultPath, 'entities');
            if (!fs.existsSync(outputDir)) {
              fs.mkdirSync(outputDir, { recursive: true });
            }

            let created = 0;
            for (const entity of allEntities.values()) {
              if (entity.mentions < 2) continue; // Skip single-mention entities

              const safeName = entity.name.replace(/[<>:"/\\|?*]/g, '-');
              const filePath = path.join(outputDir, `${safeName}.md`);

              if (!fs.existsSync(filePath)) {
                const frontmatter = {
                  id: nanoid(12),
                  title: entity.name,
                  type: entity.type,
                  aliases: entity.aliases.length > 0 ? entity.aliases : undefined,
                };

                const content = `---\n${stringifyYaml(frontmatter)}---\n\n${entity.description}\n`;
                fs.writeFileSync(filePath, content, 'utf-8');
                created++;
              }
            }

            console.log(`  Entities found: ${allEntities.size}`);
            console.log(`  Files created: ${created} (in entities/)`);
            console.log('  Done!\n');

            // Re-index to include new entities
            if (created > 0) {
              console.log(`Step ${stepNum}: Re-index (including new entities)`);
              stepNum++;
              const reindexSpinner = new Spinner('  Re-indexing...');
              reindexSpinner.start();
              await fullIndex(ctx.pipeline, ctx.vaultPath, {
                excludePatterns: ctx.config.vault.excludePatterns,
              });
              reindexSpinner.stop();
              console.log('  Done!\n');
            }
          }
        }
      }

      // Step N (optional): Compute embeddings
      const needsEmbed = options.embed || options.wormholes;
      if (needsEmbed) {
        console.log(`Step ${stepNum}: Compute embeddings`);
        stepNum++;

        try {
          const provider = createEmbeddingProvider(ctx.config.embeddings);
          const dirtyNodeIds = await ctx.embeddingRepository.findDirtyNodeIds();

          if (dirtyNodeIds.length === 0) {
            console.log('  All nodes have up-to-date embeddings.');
            console.log('  Done!\n');
          } else {
            const nodes = await ctx.nodeRepository.findByIds(dirtyNodeIds);
            let computed = 0;
            const spinner = new Spinner(`  Computing embeddings for ${nodes.length} nodes...`);
            spinner.start();

            for (const node of nodes) {
              // Get content from file
              const filePath = path.join(ctx.vaultPath, node.path);
              let text = node.title;
              if (fs.existsSync(filePath)) {
                text = fs.readFileSync(filePath, 'utf-8');
              }

              try {
                const embedding = await provider.embed(text);
                await ctx.embeddingRepository.upsert({
                  nodeId: node.nodeId,
                  embedding,
                  model: ctx.config.embeddings.model,
                  dimensions: provider.dimensions,
                  contentHash: node.contentHash || '',
                });
                computed++;
                spinner.update(`  Computed ${computed}/${nodes.length} embeddings...`);
              } catch {
                // Skip nodes that fail
              }
            }

            spinner.stop();
            console.log(`  Embeddings computed: ${computed}`);
            console.log('  Done!\n');
          }
        } catch (err) {
          console.log(
            `  Embedding provider not configured: ${err instanceof Error ? err.message : err}`
          );
          console.log('  Configure embeddings in .zettelscript/config.yaml\n');
        }
      }

      // Step N (optional): Detect wormholes
      if (options.wormholes) {
        console.log(`Step ${stepNum}: Detect semantic wormholes`);
        stepNum++;

        try {
          const detector = new WormholeDetector(
            ctx.embeddingRepository,
            ctx.edgeRepository,
            ctx.wormholeRepository,
            ctx.nodeRepository
          );

          const spinner = new Spinner('  Detecting wormholes...');
          spinner.start();

          const candidates = await detector.detectWormholes();

          spinner.stop();
          console.log(`  Wormholes detected: ${candidates.length}`);
          console.log('  Done!\n');
        } catch (err) {
          console.log(`  Failed: ${err instanceof Error ? err.message : err}\n`);
        }
      }

      // Final Step: Generate visualization (unless --no-viz)
      if (options.viz) {
        console.log(`Step ${stepNum}: Generate visualization`);

        const nodes = await ctx.nodeRepository.findAll();
        const edges = await ctx.edgeRepository.findAll();

        if (nodes.length === 0) {
          console.log('  No nodes to visualize, skipping...\n');
        } else {
          const nodeWeights = new Map<string, number>();
          edges.forEach((e) => {
            nodeWeights.set(e.sourceId, (nodeWeights.get(e.sourceId) || 0) + 1);
            nodeWeights.set(e.targetId, (nodeWeights.get(e.targetId) || 0) + 1);
          });

          const graphData: GraphData = {
            nodes: nodes.map((n) => ({
              id: n.nodeId,
              name: n.title,
              type: n.type,
              val: Math.max(1, Math.min(10, (nodeWeights.get(n.nodeId) || 0) / 2)),
              color: typeColors[n.type] || '#94a3b8',
              path: n.path,
              metadata: n.metadata as Record<string, unknown>,
            })),
            links: edges.map((e) => ({
              source: e.sourceId,
              target: e.targetId,
              type: e.edgeType,
              strength: e.strength ?? 1.0,
              provenance: e.provenance,
            })),
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

      if (options.viz && result.stats.nodeCount > 0) {
        console.log('  zettel viz              Open graph in browser');
      }

      if (!options.extract) {
        console.log('  zettel go --extract     Extract entities with AI');
      }

      if (!options.wormholes) {
        console.log('  zettel go --wormholes   Find hidden connections');
      }

      console.log('  zettel discover --all   Find unlinked mentions');
      console.log('  zettel watch            Watch for file changes');

      if (options.manuscript) {
        console.log('\nManuscript mode enabled:');
        console.log('  zettel validate --continuity   Check POV/timeline consistency');
      }

      if (options.extract || options.wormholes) {
        console.log('\nTo explore semantic features:');
        console.log('  zettel wormhole list    Show suggested connections');
        console.log('  zettel path "A" "B"     Find narrative paths');
      }
    } catch (error) {
      console.error('  Failed:', error);
      process.exit(1);
    }
  });
