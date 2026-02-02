import { Command } from 'commander';
import { initContext } from '../utils.js';
import { LinkValidator } from '../../validation/link-validator.js';
import { SchemaValidator } from '../../validation/schema-validator.js';
import { ContinuityChecker } from '../../validation/continuity-checker.js';

export const validateCommand = new Command('validate')
  .description('Validate the vault')
  .option('--links', 'Check for broken and ambiguous links')
  .option('--schema', 'Validate frontmatter schema')
  .option('--continuity', 'Check manuscript continuity (POV, timeline)')
  .option('--all', 'Run all validations')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    try {
      const ctx = await initContext();

      const runAll = options.all || (!options.links && !options.schema && !options.continuity);
      let hasErrors = false;

      // Link validation
      if (runAll || options.links) {
        console.log('Checking links...\n');

        const linkValidator = new LinkValidator({
          nodeRepository: ctx.nodeRepository,
          edgeRepository: ctx.edgeRepository,
        });

        const linkResult = await linkValidator.validate();

        if (linkResult.broken.length === 0 && linkResult.ambiguous.length === 0) {
          console.log('  ✓ All links valid\n');
        } else {
          if (linkResult.broken.length > 0) {
            hasErrors = true;
            console.log(`  ✗ Broken links: ${linkResult.broken.length}`);
            if (options.verbose) {
              for (const b of linkResult.broken.slice(0, 10)) {
                console.log(`    ${b.sourcePath}: [[${b.targetText}]]`);
              }
              if (linkResult.broken.length > 10) {
                console.log(`    ... and ${linkResult.broken.length - 10} more`);
              }
            }
          }

          if (linkResult.ambiguous.length > 0) {
            console.log(`  ! Ambiguous links: ${linkResult.ambiguous.length}`);
            if (options.verbose) {
              for (const a of linkResult.ambiguous.slice(0, 10)) {
                console.log(`    ${a.sourcePath}: [[${a.targetText}]] → ${a.candidates.length} matches`);
              }
            }
          }
          console.log('');
        }
      }

      // Schema validation
      if (runAll || options.schema) {
        console.log('Validating schema...\n');

        const schemaValidator = new SchemaValidator({
          nodeRepository: ctx.nodeRepository,
        });

        const schemaResult = await schemaValidator.validate();

        if (schemaResult.errors.length === 0) {
          console.log('  ✓ All frontmatter valid\n');
        } else {
          hasErrors = true;
          console.log(`  ✗ Schema errors: ${schemaResult.errors.length}`);
          if (options.verbose) {
            for (const e of schemaResult.errors.slice(0, 10)) {
              console.log(`    ${e.path}: ${e.message}`);
            }
            if (schemaResult.errors.length > 10) {
              console.log(`    ... and ${schemaResult.errors.length - 10} more`);
            }
          }
          console.log('');
        }
      }

      // Continuity validation (manuscript mode)
      if ((runAll || options.continuity) && ctx.config.manuscript.enabled) {
        console.log('Checking continuity...\n');

        const continuityChecker = new ContinuityChecker({
          nodeRepository: ctx.nodeRepository,
          edgeRepository: ctx.edgeRepository,
          config: ctx.config.manuscript,
        });

        const continuityResult = await continuityChecker.check();

        const errors = continuityResult.issues.filter(i => i.severity === 'error');
        const warnings = continuityResult.issues.filter(i => i.severity === 'warning');

        if (errors.length === 0 && warnings.length === 0) {
          console.log('  ✓ No continuity issues\n');
        } else {
          if (errors.length > 0) {
            hasErrors = true;
            console.log(`  ✗ Continuity errors: ${errors.length}`);
            if (options.verbose) {
              for (const e of errors.slice(0, 10)) {
                console.log(`    ${e.nodeId}: ${e.description}`);
                if (e.suggestion) {
                  console.log(`      Suggestion: ${e.suggestion}`);
                }
              }
            }
          }

          if (warnings.length > 0) {
            console.log(`  ! Continuity warnings: ${warnings.length}`);
            if (options.verbose) {
              for (const w of warnings.slice(0, 10)) {
                console.log(`    ${w.nodeId}: ${w.description}`);
              }
            }
          }
          console.log('');
        }
      } else if ((runAll || options.continuity) && !ctx.config.manuscript.enabled) {
        console.log('Continuity checking skipped (manuscript mode not enabled).\n');
        console.log('Enable with: zettel init --manuscript\n');
      }

      // Summary
      if (hasErrors) {
        console.log('Validation completed with errors.');
        process.exitCode = 1;
      } else {
        console.log('Validation passed.');
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Validation failed:', error);
      process.exit(1);
    }
  });
