import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { initContext, Spinner, printTable } from '../utils.js';
import { EntityExtractor, type ExtractedEntity } from '../../extraction/index.js';
import {
  OllamaLLMProvider,
  getOllamaModelInfo,
  checkOllamaRunning,
  checkOllamaModelExists,
  pullOllamaModel,
  listOllamaModels,
} from '../../llm/provider.js';
import { nanoid } from 'nanoid';
import { stringify as stringifyYaml } from 'yaml';

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

export const extractCommand = new Command('extract')
  .description('Extract entities (characters, locations, etc.) from prose')
  .option('-f, --file <path>', 'Extract from specific file')
  .option('--all', 'Extract from all markdown files')
  .option('-m, --model <model>', 'Ollama model to use', 'qwen2.5:7b')
  .option('--dry-run', 'Show what would be extracted without creating files')
  .option('-o, --output <dir>', 'Output directory for entity files')
  .option('-v, --verbose', 'Show detailed output (per-chunk progress)')
  .option('-q, --quiet', 'Suppress output (exit code still reflects success)')
  .action(async (options) => {
    try {
      const ctx = await initContext();

      // Determine files to process
      let filesToProcess: string[] = [];

      if (options.file) {
        const filePath = path.isAbsolute(options.file)
          ? options.file
          : path.join(ctx.vaultPath, options.file);

        if (!fs.existsSync(filePath)) {
          console.error(`File not found: ${filePath}`);
          process.exit(1);
        }
        filesToProcess = [filePath];
      } else if (options.all) {
        // Find all markdown files
        const findMarkdown = (dir: string): string[] => {
          const results: string[] = [];
          const entries = fs.readdirSync(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            // Skip excluded patterns
            if (
              ctx.config.vault.excludePatterns.some((p) => {
                const pattern = p.replace('**/', '').replace('/**', '');
                return entry.name === pattern || fullPath.includes(pattern);
              })
            ) {
              continue;
            }

            if (entry.isDirectory()) {
              results.push(...findMarkdown(fullPath));
            } else if (entry.name.endsWith('.md')) {
              results.push(fullPath);
            }
          }
          return results;
        };

        filesToProcess = findMarkdown(ctx.vaultPath);
      } else {
        console.log('Specify --file <path> or --all to extract entities.');
        console.log('\nExamples:');
        console.log('  zettel extract --file book1.md');
        console.log('  zettel extract --all');
        ctx.connectionManager.close();
        return;
      }

      if (filesToProcess.length === 0) {
        console.log('No markdown files found.');
        ctx.connectionManager.close();
        return;
      }

      if (!options.quiet) {
        console.log(`Processing ${filesToProcess.length} file(s)...\n`);
      }

      // Check Ollama is running
      const ollamaRunning = await checkOllamaRunning();
      if (!ollamaRunning) {
        console.error('Error: Ollama is not running.');
        console.error('\nTo start Ollama:');
        console.error('  1. Install from https://ollama.ai');
        console.error('  2. Run: ollama serve');
        ctx.connectionManager.close();
        process.exit(1);
      }

      // Check if model exists
      const modelExists = await checkOllamaModelExists(options.model);
      if (!modelExists) {
        console.log(`Model '${options.model}' is not installed.`);

        // Show available models
        const availableModels = await listOllamaModels();
        if (availableModels.length > 0) {
          console.log('\nInstalled models:');
          for (const m of availableModels.slice(0, 10)) {
            console.log(`  - ${m}`);
          }
          if (availableModels.length > 10) {
            console.log(`  ... and ${availableModels.length - 10} more`);
          }
        }

        console.log('');
        const shouldDownload = await promptYesNo(`Download '${options.model}' now?`);

        if (shouldDownload) {
          console.log(`\nDownloading ${options.model}...`);
          let lastStatus = '';

          try {
            for await (const progress of pullOllamaModel(options.model)) {
              // Show download progress
              if (progress.status !== lastStatus) {
                if (progress.completed !== undefined && progress.total !== undefined) {
                  const percent = ((progress.completed / progress.total) * 100).toFixed(1);
                  const completed = formatBytes(progress.completed);
                  const total = formatBytes(progress.total);
                  process.stdout.write(
                    `\r${progress.status}: ${completed} / ${total} (${percent}%)    `
                  );
                } else {
                  process.stdout.write(`\r${progress.status}...    `);
                }
                lastStatus = progress.status;
              } else if (progress.completed !== undefined && progress.total !== undefined) {
                const percent = ((progress.completed / progress.total) * 100).toFixed(1);
                const completed = formatBytes(progress.completed);
                const total = formatBytes(progress.total);
                process.stdout.write(
                  `\r${progress.status}: ${completed} / ${total} (${percent}%)    `
                );
              }
            }
            console.log('\nDownload complete!\n');
          } catch (err) {
            console.error(
              `\nFailed to download model: ${err instanceof Error ? err.message : err}`
            );
            ctx.connectionManager.close();
            process.exit(1);
          }
        } else {
          // Suggest alternatives
          console.log('\n--- Recommended models for entity extraction ---');
          console.log('');
          console.log('  Good context + speed:');
          console.log('    qwen2.5:7b        (~4.7 GB) - Default, good balance');
          console.log('    llama3.1:8b       (~4.7 GB) - Strong general purpose');
          console.log('    mistral:7b        (~4.1 GB) - Fast, good for structured output');
          console.log('');
          console.log('  Larger context (for big documents):');
          console.log('    qwen2.5:14b       (~9.0 GB) - Better accuracy, slower');
          console.log('    llama3.1:70b      (~40 GB)  - Best quality, needs GPU');
          console.log('');
          console.log('  Smaller/faster (less accurate):');
          console.log('    qwen2.5:3b        (~2.0 GB) - Quick, limited context');
          console.log('    phi3:mini         (~2.2 GB) - Lightweight option');

          // If they have models installed, suggest using one
          if (availableModels.length > 0) {
            console.log('');
            console.log('--- Or use one of your installed models ---');
            console.log('');
            for (const m of availableModels.slice(0, 5)) {
              console.log(`  zettel extract --model ${m} --all`);
            }
          }

          console.log('');
          console.log('To download a model:');
          console.log(`  ollama pull <model-name>`);
          console.log('');
          ctx.connectionManager.close();
          return;
        }
      }

      // Create LLM provider
      const llmProvider = new OllamaLLMProvider({
        provider: 'ollama',
        model: options.model,
        baseUrl: 'http://localhost:11434',
      });

      if (options.verbose) {
        const modelInfo = await getOllamaModelInfo(options.model);
        if (modelInfo) {
          console.log(`Model: ${options.model}`);
          console.log(`  Context length: ${modelInfo.contextLength}`);
          console.log(
            `  Max output tokens: ${Math.min(Math.floor(modelInfo.contextLength / 4), 8192)}`
          );
          if (modelInfo.parameterSize) console.log(`  Parameters: ${modelInfo.parameterSize}`);
        }
      }

      // Determine output directory for bad-chunks.jsonl
      const outputDir = options.output
        ? path.isAbsolute(options.output)
          ? options.output
          : path.join(ctx.vaultPath, options.output)
        : ctx.vaultPath;

      const extractor = new EntityExtractor({
        llmProvider,
        chunkSize: 6000, // Smaller chunks for 3b model
        outputDir,
        verbose: options.verbose,
        quiet: options.quiet,
      });

      const allEntities = new Map<string, ExtractedEntity>();
      const entityToFiles = new Map<string, Set<string>>();

      // Track combined stats across all files
      let totalChunks = 0;
      let totalStrict = 0;
      let totalRepaired = 0;
      let totalSalvaged = 0;
      let totalFailed = 0;
      let badChunksPath: string | undefined;

      for (const filePath of filesToProcess) {
        const relativePath = path.relative(ctx.vaultPath, filePath);
        if (!options.quiet) {
          console.log(`\nExtracting from: ${relativePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        // Skip very small files
        if (content.length < 100) {
          if (!options.quiet) {
            console.log('  Skipped (too small)');
          }
          continue;
        }

        const spinner = options.quiet ? null : new Spinner('Analyzing...');
        if (spinner) spinner.start();

        const result = await extractor.extractFromText(content, (current, total) => {
          if (spinner) spinner.update(`Chunk ${current}/${total}`);
        });

        if (spinner) spinner.stop();

        // Accumulate stats
        totalChunks += result.stats.total;
        totalStrict += result.stats.strict;
        totalRepaired += result.stats.repaired;
        totalSalvaged += result.stats.salvaged;
        totalFailed += result.stats.failed;
        if (result.badChunksPath) badChunksPath = result.badChunksPath;

        // Merge entities
        for (const entity of result.entities) {
          const key = entity.name.toLowerCase();
          const existing = allEntities.get(key);

          if (existing) {
            existing.mentions += entity.mentions;
            existing.aliases = [...new Set([...existing.aliases, ...entity.aliases])];
            if (entity.description.length > existing.description.length) {
              existing.description = entity.description;
            }
          } else {
            allEntities.set(key, { ...entity });
          }

          // Track which files reference this entity
          if (!entityToFiles.has(key)) {
            entityToFiles.set(key, new Set());
          }
          entityToFiles.get(key)!.add(relativePath);
        }

        if (options.verbose && !options.quiet) {
          console.log(`  Found ${result.entities.length} entities`);
          for (const e of result.entities.slice(0, 10)) {
            console.log(`    - ${e.name} (${e.type})`);
          }
          if (result.entities.length > 10) {
            console.log(`    ... and ${result.entities.length - 10} more`);
          }
        }
      }

      // Print parsing stats summary
      if (!options.quiet && totalChunks > 0) {
        console.log('\n--- Parsing Statistics ---');
        console.log(`  Chunks processed: ${totalChunks}`);
        console.log(`    - strict:   ${totalStrict}`);
        console.log(`    - repaired: ${totalRepaired}`);
        console.log(`    - salvaged: ${totalSalvaged}`);
        console.log(`    - failed:   ${totalFailed}`);
        if (badChunksPath) {
          console.log(`  Failed chunks logged to: ${badChunksPath}`);
        }
      }

      // Sort by mentions
      const sortedEntities = Array.from(allEntities.values()).sort(
        (a, b) => b.mentions - a.mentions
      );

      // Display results
      if (!options.quiet) {
        console.log('\n' + '='.repeat(50));
        console.log('Extracted Entities');
        console.log('='.repeat(50) + '\n');

        // Group by type
        const byType = new Map<string, ExtractedEntity[]>();
        for (const entity of sortedEntities) {
          const list = byType.get(entity.type) || [];
          list.push(entity);
          byType.set(entity.type, list);
        }

        for (const [type, entities] of byType) {
          console.log(`\n${type.toUpperCase()}S (${entities.length}):`);
          const rows = entities
            .slice(0, 15)
            .map((e) => [
              e.name,
              e.aliases.slice(0, 3).join(', ') || '-',
              e.mentions.toString(),
              e.description.slice(0, 50) + (e.description.length > 50 ? '...' : ''),
            ]);
          printTable(['Name', 'Aliases', 'Refs', 'Description'], rows);

          if (entities.length > 15) {
            console.log(`  ... and ${entities.length - 15} more`);
          }
        }

        console.log(`\nTotal: ${sortedEntities.length} entities`);
      }

      // Create files if not dry run
      if (!options.dryRun && sortedEntities.length > 0) {
        const outputDir = options.output
          ? path.isAbsolute(options.output)
            ? options.output
            : path.join(ctx.vaultPath, options.output)
          : path.join(ctx.vaultPath, 'entities');

        if (!options.quiet) {
          console.log(`\nCreating entity files in: ${path.relative(ctx.vaultPath, outputDir)}/`);
        }

        // Create directories
        const dirs = ['characters', 'locations', 'objects', 'events'];
        for (const dir of dirs) {
          fs.mkdirSync(path.join(outputDir, dir), { recursive: true });
        }

        let created = 0;
        for (const entity of sortedEntities) {
          // Skip low-mention entities
          if (entity.mentions < 2) continue;

          const typeDir =
            entity.type === 'character'
              ? 'characters'
              : entity.type === 'location'
                ? 'locations'
                : entity.type === 'object'
                  ? 'objects'
                  : 'events';

          const fileName =
            entity.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '') + '.md';

          const filePath = path.join(outputDir, typeDir, fileName);

          // Skip if file already exists
          if (fs.existsSync(filePath)) {
            if (options.verbose && !options.quiet) {
              console.log(`  Skipped (exists): ${typeDir}/${fileName}`);
            }
            continue;
          }

          // Create frontmatter
          const frontmatter: Record<string, unknown> = {
            id: nanoid(),
            title: entity.name,
            type: entity.type,
          };

          if (entity.aliases.length > 0) {
            frontmatter.aliases = entity.aliases;
          }

          // Create file content
          const content = `---
${stringifyYaml(frontmatter).trim()}
---

# ${entity.name}

${entity.description}

## Appearances

${Array.from(entityToFiles.get(entity.name.toLowerCase()) || [])
  .map((f) => `- [[${path.basename(f, '.md')}]]`)
  .join('\n')}
`;

          fs.writeFileSync(filePath, content, 'utf-8');
          created++;

          if (options.verbose && !options.quiet) {
            console.log(`  Created: ${typeDir}/${fileName}`);
          }
        }

        if (!options.quiet) {
          console.log(`\nCreated ${created} entity files.`);
          console.log('\nNext steps:');
          console.log('  zettel index     # Re-index to include new entities');
          console.log('  zettel discover --all  # Find unlinked mentions');
        }
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Extraction failed:', error);
      process.exit(1);
    }
  });
