/**
 * Lore Generator
 * Creates world rules and mechanics notes from KB data
 */

import type {
  GeneratorOptions,
  GeneratorResult,
  KBData,
  KBFact,
  WorldRulesData,
  WorldRule,
} from './types.js';
import {
  parseKBJson,
  parseWorldRules,
  buildNote,
  generateNotePath,
  writeNoteFile,
  EntityTracker,
  section,
  blockquote,
} from './utils.js';

const LORE_SUBDIR = 'Lore';

/**
 * Build frontmatter for a lore note (world rule)
 */
function buildRuleFrontmatter(rule: WorldRule): Record<string, unknown> {
  return {
    id: rule.id,
    type: 'concept',
    title: rule.name,
    category: rule.category,
    locked: rule.locked || false,
    tags: buildRuleTags(rule),
  };
}

/**
 * Build tags for a world rule
 */
function buildRuleTags(rule: WorldRule): string[] {
  const tags: string[] = ['lore', 'world-rule'];

  // Category tag
  const category = rule.category.toLowerCase().replace(/[_\s]+/g, '-');
  if (category && !tags.includes(category)) {
    tags.push(category);
  }

  // Locked status
  if (rule.locked) {
    tags.push('locked');
  }

  return tags;
}

/**
 * Build content for a world rule note
 */
function buildRuleContent(rule: WorldRule): string {
  const parts: string[] = [];

  // Title
  parts.push(`# ${rule.name}\n\n`);

  // Category badge
  parts.push(`**Category:** ${rule.category}\n\n`);

  // Locked indicator
  if (rule.locked) {
    parts.push('> 🔒 **This rule is locked for continuity.**\n\n');
  }

  // Description
  parts.push(section('Description'));
  parts.push(rule.description + '\n\n');

  // Examples
  if (rule.examples && rule.examples.length > 0) {
    parts.push(section('Examples'));
    parts.push(rule.examples.map((e) => `- ${e}`).join('\n') + '\n\n');
  }

  // Exceptions
  if (rule.exceptions && rule.exceptions.length > 0) {
    parts.push(section('Exceptions'));
    parts.push(rule.exceptions.map((e) => `- ${e}`).join('\n') + '\n\n');
  }

  // Source
  if (rule.source) {
    parts.push(section('Source', 3));
    parts.push(`*${rule.source}*\n\n`);
  }

  return parts.join('');
}

/**
 * Build frontmatter for a fact note
 */
function buildFactFrontmatter(fact: KBFact): Record<string, unknown> {
  return {
    id: fact.id,
    type: 'concept',
    title: extractFactTitle(fact.fact),
    source: fact.source,
    locked: fact.locked || false,
    tags: ['lore', 'fact', fact.locked ? 'locked' : undefined].filter(Boolean),
  };
}

/**
 * Extract a short title from a fact
 */
function extractFactTitle(fact: string): string {
  // Take first 50 chars or up to first period
  const firstSentence = fact.split('.')[0];
  if (firstSentence && firstSentence.length <= 60) {
    return firstSentence;
  }
  return fact.slice(0, 50) + '...';
}

/**
 * Build content for a fact note
 */
function buildFactContent(fact: KBFact): string {
  const parts: string[] = [];

  // Title
  parts.push(`# ${extractFactTitle(fact.fact)}\n\n`);

  // Locked indicator
  if (fact.locked) {
    parts.push('> 🔒 **This fact is locked for continuity.**\n\n');
  }

  // The fact
  parts.push(section('Fact'));
  parts.push(blockquote(fact.fact) + '\n\n');

  // Source
  parts.push(section('Source', 3));
  parts.push(`*${fact.source}*\n\n`);

  return parts.join('');
}

/**
 * Generate lore notes from KB and world rules data
 */
export async function generateLore(options: GeneratorOptions): Promise<GeneratorResult> {
  const result: GeneratorResult = {
    created: [],
    skipped: [],
    errors: [],
    summary: '',
  };

  // Track entities to avoid duplicates
  const tracker = new EntityTracker();

  // Load world rules if available
  if (options.worldRulesPath) {
    try {
      const worldRules = parseWorldRules(options.worldRulesPath);
      await processWorldRules(worldRules, options, result, tracker);
    } catch (error) {
      result.errors.push({
        file: options.worldRulesPath,
        error: `Failed to load world rules: ${error}`,
      });
    }
  }

  // Load KB data for facts
  if (options.kbPath) {
    try {
      const kb = parseKBJson(options.kbPath);
      await processKBFacts(kb, options, result, tracker);
    } catch (error) {
      result.errors.push({
        file: options.kbPath,
        error: `Failed to load KB: ${error}`,
      });
    }
  }

  if (!options.kbPath && !options.worldRulesPath) {
    result.summary = 'No KB or world rules path provided';
    return result;
  }

  result.summary = `Lore: ${result.created.length} created, ${result.skipped.length} skipped, ${result.errors.length} errors`;
  return result;
}

/**
 * Process world rules and generate notes
 */
async function processWorldRules(
  worldRules: WorldRulesData,
  options: GeneratorOptions,
  result: GeneratorResult,
  tracker: EntityTracker
): Promise<void> {
  const allRules: WorldRule[] = [
    ...(worldRules.rules || []),
    ...(worldRules.mechanics || []),
    ...(worldRules.constraints || []),
  ];

  for (const rule of allRules) {
    const name = rule.name;

    // Skip duplicates
    if (!tracker.add(name)) {
      if (options.verbose) {
        console.log(`Skipping duplicate rule: ${name}`);
      }
      continue;
    }

    try {
      const filePath = generateNotePath(options.outputDir, LORE_SUBDIR, name);
      const frontmatter = buildRuleFrontmatter(rule);
      const content = buildRuleContent(rule);
      const note = buildNote(frontmatter, content);

      const written = await writeNoteFile(filePath, note, {
        force: options.force,
        dryRun: options.dryRun,
      });

      if (written) {
        result.created.push(filePath);
        if (options.verbose) {
          console.log(`Created: ${filePath}`);
        }
      } else {
        result.skipped.push(filePath);
        if (options.verbose) {
          console.log(`Skipped (exists): ${filePath}`);
        }
      }
    } catch (error) {
      result.errors.push({
        file: name,
        error: `${error}`,
      });
    }
  }
}

/**
 * Process KB facts and generate notes
 */
async function processKBFacts(
  kb: KBData,
  options: GeneratorOptions,
  result: GeneratorResult,
  tracker: EntityTracker
): Promise<void> {
  const facts = kb.facts || [];

  for (const fact of facts) {
    const name = fact.id;

    // Skip duplicates
    if (!tracker.add(name)) {
      if (options.verbose) {
        console.log(`Skipping duplicate fact: ${name}`);
      }
      continue;
    }

    try {
      const filePath = generateNotePath(options.outputDir, `${LORE_SUBDIR}/Facts`, name);
      const frontmatter = buildFactFrontmatter(fact);
      const content = buildFactContent(fact);
      const note = buildNote(frontmatter, content);

      const written = await writeNoteFile(filePath, note, {
        force: options.force,
        dryRun: options.dryRun,
      });

      if (written) {
        result.created.push(filePath);
        if (options.verbose) {
          console.log(`Created: ${filePath}`);
        }
      } else {
        result.skipped.push(filePath);
        if (options.verbose) {
          console.log(`Skipped (exists): ${filePath}`);
        }
      }
    } catch (error) {
      result.errors.push({
        file: name,
        error: `${error}`,
      });
    }
  }
}
