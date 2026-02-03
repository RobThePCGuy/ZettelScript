import { Command } from 'commander';
import * as path from 'node:path';
import { findVaultRoot, Spinner } from '../utils.js';
import {
  injectLinks,
  previewLinkInjection,
  type InjectLinksOptions,
} from '../../generators/index.js';

export const injectLinksCommand = new Command('inject-links')
  .description('Add wikilinks to notes based on entity names from KB')
  .option('-p, --path <dir>', 'Vault path (default: current vault)')
  .option('-g, --pattern <glob>', 'File pattern to process (default: **/*.md)')
  .option('-e, --entities <names...>', 'Specific entity names to link')
  .option('-n, --dry-run', 'Show changes without modifying files')
  .option('--preview', 'Show detailed preview of all changes')
  .option('-v, --verbose', 'Show detailed output')
  .addHelpText(
    'after',
    `
Examples:
  zettel inject-links                    # Process all .md files using KB entities
  zettel inject-links -n                 # Dry run to see what would change
  zettel inject-links --preview          # Show detailed preview of all changes
  zettel inject-links -e "Ryan" "Kevin"  # Only link specific entities
  zettel inject-links -g "Chapters/*.md" # Only process chapter files
`
  )
  .action(async (options) => {
    try {
      // Resolve vault path
      const vaultPath = options.path
        ? path.resolve(options.path)
        : findVaultRoot() || process.cwd();

      const opts: InjectLinksOptions = {
        vaultPath,
        pattern: options.pattern,
        entities: options.entities,
        dryRun: options.dryRun || options.preview,
        verbose: options.verbose,
      };

      // Preview mode shows detailed changes
      if (options.preview) {
        console.log('Previewing link injection...\n');

        const previews = await previewLinkInjection(opts);

        if (previews.size === 0) {
          console.log('No links to inject.');
          return;
        }

        for (const [file, changes] of previews) {
          const relativePath = path.relative(vaultPath, file);
          console.log(`\n${relativePath} (${changes.length} links):`);

          for (const change of changes.slice(0, 10)) {
            console.log(`  ${change.original} → ${change.linked}`);
          }

          if (changes.length > 10) {
            console.log(`  ... and ${changes.length - 10} more`);
          }
        }

        console.log(
          `\nTotal: ${previews.size} files, ${Array.from(previews.values()).reduce((sum, c) => sum + c.length, 0)} links`
        );
        console.log('\nRun without --preview to apply changes.');
        return;
      }

      // Normal operation
      const spinner = new Spinner('Injecting links...');
      spinner.start();

      const result = await injectLinks(opts);

      spinner.stop();

      // Print results
      if (opts.dryRun) {
        console.log('\n[DRY RUN] Would modify:');
      } else {
        console.log('\nLink injection complete:');
      }

      console.log(`  Files modified: ${result.modified.length}`);
      console.log(`  Links injected: ${result.linksInjected}`);
      console.log(`  Files skipped:  ${result.skipped.length}`);

      if (result.errors.length > 0) {
        console.log(`\nErrors (${result.errors.length}):`);
        for (const err of result.errors.slice(0, 5)) {
          console.log(`  ${err.file}: ${err.error}`);
        }
        if (result.errors.length > 5) {
          console.log(`  ... and ${result.errors.length - 5} more`);
        }
      }

      if (opts.verbose && result.modified.length > 0) {
        console.log('\nModified files:');
        for (const file of result.modified) {
          const relativePath = path.relative(vaultPath, file);
          console.log(`  ${relativePath}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
  });
