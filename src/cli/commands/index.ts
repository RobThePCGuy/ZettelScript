import { Command } from 'commander';
import { initContext, formatDuration, Spinner } from '../utils.js';
import { fullIndex } from '../../indexer/batch.js';

export const indexCommand = new Command('index')
  .description('Index all markdown files in the vault')
  .option('-v, --verbose', 'Show detailed output')
  .option('--stats', 'Show indexing statistics')
  .action(async (options) => {
    try {
      const ctx = await initContext();

      console.log(`Indexing vault: ${ctx.vaultPath}`);

      const spinner = new Spinner('Scanning files...');
      spinner.start();

      let lastProgress = 0;
      const result = await fullIndex(ctx.pipeline, ctx.vaultPath, {
        excludePatterns: ctx.config.vault.excludePatterns,
        onProgress: (current, total, path) => {
          if (current > lastProgress) {
            lastProgress = current;
            spinner.update(`Indexing ${current}/${total}: ${path}`);
          }
        },
      });

      spinner.stop();

      // Summary
      console.log('\nIndexing complete:');
      console.log(`  Files processed: ${result.stats.totalFiles}`);
      console.log(`  Nodes created:   ${result.stats.nodeCount}`);
      console.log(`  Edges created:   ${result.stats.edgeCount}`);
      console.log(`  Unresolved:      ${result.stats.unresolvedCount}`);
      console.log(`  Ambiguous:       ${result.stats.ambiguousCount}`);
      console.log(`  Duration:        ${formatDuration(result.stats.durationMs)}`);

      // Show errors if any
      if (result.errors.length > 0) {
        console.log(`\nErrors (${result.errors.length}):`);
        for (const err of result.errors.slice(0, 10)) {
          console.log(`  ${err.path}: ${err.error}`);
        }
        if (result.errors.length > 10) {
          console.log(`  ... and ${result.errors.length - 10} more`);
        }
      }

      // Show verbose output
      if (options.verbose) {
        // Show unresolved links
        const allUnresolved = result.indexed.flatMap(r =>
          r.unresolved.map(u => ({ path: r.node.path, link: u.target }))
        );
        if (allUnresolved.length > 0) {
          console.log(`\nUnresolved links (${allUnresolved.length}):`);
          for (const u of allUnresolved.slice(0, 20)) {
            console.log(`  ${u.path}: [[${u.link}]]`);
          }
          if (allUnresolved.length > 20) {
            console.log(`  ... and ${allUnresolved.length - 20} more`);
          }
        }

        // Show ambiguous links
        const allAmbiguous = result.indexed.flatMap(r =>
          r.ambiguous.map(a => ({ path: r.node.path, link: a.target }))
        );
        if (allAmbiguous.length > 0) {
          console.log(`\nAmbiguous links (${allAmbiguous.length}):`);
          for (const a of allAmbiguous.slice(0, 20)) {
            console.log(`  ${a.path}: [[${a.link}]]`);
          }
          if (allAmbiguous.length > 20) {
            console.log(`  ... and ${allAmbiguous.length - 20} more`);
          }
        }
      }

      // Show stats
      if (options.stats) {
        const stats = await ctx.pipeline.getStats();
        console.log('\nGraph statistics:');
        console.log('  Nodes by type:');
        for (const [type, count] of Object.entries(stats.nodesByType)) {
          console.log(`    ${type}: ${count}`);
        }
        console.log('  Edges by type:');
        for (const [type, count] of Object.entries(stats.edgesByType)) {
          console.log(`    ${type}: ${count}`);
        }
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Index failed:', error);
      process.exit(1);
    }
  });
