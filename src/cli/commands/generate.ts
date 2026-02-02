import { Command } from 'commander';
import * as path from 'node:path';
import { findVaultRoot, Spinner } from '../utils.js';
import {
  generateCharacters,
  generateChapters,
  generateLocations,
  generateObjects,
  generateLore,
  generateTimeline,
  generateArcs,
  findKBFiles,
  type GeneratorOptions,
  type ChapterGeneratorOptions,
  type GeneratorResult,
} from '../../generators/index.js';

/**
 * Resolve common options for generators
 */
function resolveOptions(options: {
  output?: string;
  kb?: string;
  arcLedger?: string;
  worldRules?: string;
  force?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}): GeneratorOptions {
  // Find vault root or use current directory
  const vaultPath = findVaultRoot() || process.cwd();
  const outputDir = options.output ? path.resolve(options.output) : vaultPath;

  // Find KB files if not specified
  const kbFiles = findKBFiles(vaultPath);

  return {
    outputDir,
    kbPath: options.kb ? path.resolve(options.kb) : kbFiles.kb,
    arcLedgerPath: options.arcLedger ? path.resolve(options.arcLedger) : kbFiles.arcLedger,
    worldRulesPath: options.worldRules ? path.resolve(options.worldRules) : kbFiles.worldRules,
    force: options.force || false,
    dryRun: options.dryRun || false,
    verbose: options.verbose || false,
  };
}

/**
 * Print generator result
 */
function printResult(result: GeneratorResult): void {
  console.log(`\n${result.summary}`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    for (const err of result.errors.slice(0, 10)) {
      console.log(`  ${err.file}: ${err.error}`);
    }
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more`);
    }
  }
}

// Create the parent generate command
export const generateCommand = new Command('generate')
  .description('Generate vault notes from knowledge base data')
  .addHelpText('after', `
Examples:
  zettel generate characters         Generate character notes
  zettel generate all                Generate all note types
  zettel generate chapters -m book.md  Split manuscript into chapters
`);

// Characters subcommand
generateCommand
  .command('characters')
  .description('Generate character notes from KB data')
  .option('-o, --output <dir>', 'Output directory')
  .option('-k, --kb <path>', 'Path to kb.json file')
  .option('-f, --force', 'Overwrite existing files')
  .option('-n, --dry-run', 'Show what would be created without writing files')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const spinner = new Spinner('Generating character notes...');
    spinner.start();

    try {
      const opts = resolveOptions(options);

      if (!opts.kbPath) {
        spinner.stop('Error: No KB file found. Specify with --kb option.');
        process.exit(1);
      }

      const result = await generateCharacters(opts);
      spinner.stop();
      printResult(result);
    } catch (error) {
      spinner.stop(`Error: ${error}`);
      process.exit(1);
    }
  });

// Chapters subcommand
generateCommand
  .command('chapters')
  .description('Split manuscript into chapter notes')
  .requiredOption('-m, --manuscript <path>', 'Path to manuscript file')
  .option('-o, --output <dir>', 'Output directory')
  .option('-d, --chapters-dir <dir>', 'Subdirectory for chapters (default: Chapters)')
  .option('-f, --force', 'Overwrite existing files')
  .option('-n, --dry-run', 'Show what would be created without writing files')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const spinner = new Spinner('Splitting manuscript into chapters...');
    spinner.start();

    try {
      const baseOpts = resolveOptions(options);
      const chapterOpts: ChapterGeneratorOptions = {
        ...baseOpts,
        manuscriptPath: path.resolve(options.manuscript),
        chaptersDir: options.chaptersDir,
      };

      const result = await generateChapters(chapterOpts);
      spinner.stop();
      printResult(result);
    } catch (error) {
      spinner.stop(`Error: ${error}`);
      process.exit(1);
    }
  });

// Locations subcommand
generateCommand
  .command('locations')
  .description('Generate location notes from KB data')
  .option('-o, --output <dir>', 'Output directory')
  .option('-k, --kb <path>', 'Path to kb.json file')
  .option('-f, --force', 'Overwrite existing files')
  .option('-n, --dry-run', 'Show what would be created without writing files')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const spinner = new Spinner('Generating location notes...');
    spinner.start();

    try {
      const opts = resolveOptions(options);

      if (!opts.kbPath) {
        spinner.stop('Error: No KB file found. Specify with --kb option.');
        process.exit(1);
      }

      const result = await generateLocations(opts);
      spinner.stop();
      printResult(result);
    } catch (error) {
      spinner.stop(`Error: ${error}`);
      process.exit(1);
    }
  });

// Objects subcommand
generateCommand
  .command('objects')
  .description('Generate object/artifact notes from KB data')
  .option('-o, --output <dir>', 'Output directory')
  .option('-k, --kb <path>', 'Path to kb.json file')
  .option('-f, --force', 'Overwrite existing files')
  .option('-n, --dry-run', 'Show what would be created without writing files')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const spinner = new Spinner('Generating object notes...');
    spinner.start();

    try {
      const opts = resolveOptions(options);

      if (!opts.kbPath) {
        spinner.stop('Error: No KB file found. Specify with --kb option.');
        process.exit(1);
      }

      const result = await generateObjects(opts);
      spinner.stop();
      printResult(result);
    } catch (error) {
      spinner.stop(`Error: ${error}`);
      process.exit(1);
    }
  });

// Lore subcommand
generateCommand
  .command('lore')
  .description('Generate lore/world rules notes from KB and world-rules data')
  .option('-o, --output <dir>', 'Output directory')
  .option('-k, --kb <path>', 'Path to kb.json file')
  .option('-w, --world-rules <path>', 'Path to world-rules.json file')
  .option('-f, --force', 'Overwrite existing files')
  .option('-n, --dry-run', 'Show what would be created without writing files')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const spinner = new Spinner('Generating lore notes...');
    spinner.start();

    try {
      const opts = resolveOptions(options);

      if (!opts.kbPath && !opts.worldRulesPath) {
        spinner.stop('Error: No KB or world-rules file found. Specify with --kb or --world-rules option.');
        process.exit(1);
      }

      const result = await generateLore(opts);
      spinner.stop();
      printResult(result);
    } catch (error) {
      spinner.stop(`Error: ${error}`);
      process.exit(1);
    }
  });

// Timeline subcommand
generateCommand
  .command('timeline')
  .description('Generate timeline event notes from KB data')
  .option('-o, --output <dir>', 'Output directory')
  .option('-k, --kb <path>', 'Path to kb.json file')
  .option('-f, --force', 'Overwrite existing files')
  .option('-n, --dry-run', 'Show what would be created without writing files')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const spinner = new Spinner('Generating timeline notes...');
    spinner.start();

    try {
      const opts = resolveOptions(options);

      if (!opts.kbPath) {
        spinner.stop('Error: No KB file found. Specify with --kb option.');
        process.exit(1);
      }

      const result = await generateTimeline(opts);
      spinner.stop();
      printResult(result);
    } catch (error) {
      spinner.stop(`Error: ${error}`);
      process.exit(1);
    }
  });

// Arcs subcommand
generateCommand
  .command('arcs')
  .description('Generate plot thread and character arc notes from arc-ledger')
  .option('-o, --output <dir>', 'Output directory')
  .option('-a, --arc-ledger <path>', 'Path to arc-ledger.json file')
  .option('-f, --force', 'Overwrite existing files')
  .option('-n, --dry-run', 'Show what would be created without writing files')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const spinner = new Spinner('Generating arc notes...');
    spinner.start();

    try {
      const opts = resolveOptions(options);

      if (!opts.arcLedgerPath) {
        spinner.stop('Error: No arc-ledger file found. Specify with --arc-ledger option.');
        process.exit(1);
      }

      const result = await generateArcs(opts);
      spinner.stop();
      printResult(result);
    } catch (error) {
      spinner.stop(`Error: ${error}`);
      process.exit(1);
    }
  });

// All subcommand - runs all generators
generateCommand
  .command('all')
  .description('Run all generators in sequence')
  .option('-o, --output <dir>', 'Output directory')
  .option('-k, --kb <path>', 'Path to kb.json file')
  .option('-a, --arc-ledger <path>', 'Path to arc-ledger.json file')
  .option('-w, --world-rules <path>', 'Path to world-rules.json file')
  .option('-f, --force', 'Overwrite existing files')
  .option('-n, --dry-run', 'Show what would be created without writing files')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    const spinner = new Spinner('Running all generators...');
    spinner.start();

    try {
      const opts = resolveOptions(options);
      const results: GeneratorResult[] = [];

      // Characters
      if (opts.kbPath) {
        spinner.update('Generating characters...');
        results.push(await generateCharacters(opts));
      }

      // Locations
      if (opts.kbPath) {
        spinner.update('Generating locations...');
        results.push(await generateLocations(opts));
      }

      // Objects
      if (opts.kbPath) {
        spinner.update('Generating objects...');
        results.push(await generateObjects(opts));
      }

      // Timeline
      if (opts.kbPath) {
        spinner.update('Generating timeline...');
        results.push(await generateTimeline(opts));
      }

      // Lore
      if (opts.kbPath || opts.worldRulesPath) {
        spinner.update('Generating lore...');
        results.push(await generateLore(opts));
      }

      // Arcs
      if (opts.arcLedgerPath) {
        spinner.update('Generating arcs...');
        results.push(await generateArcs(opts));
      }

      spinner.stop();

      // Print summary
      console.log('\nGeneration complete:\n');
      for (const result of results) {
        console.log(`  ${result.summary}`);
      }

      // Total errors
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
      if (totalErrors > 0) {
        console.log(`\nTotal errors: ${totalErrors}`);
      }
    } catch (error) {
      spinner.stop(`Error: ${error}`);
      process.exit(1);
    }
  });
