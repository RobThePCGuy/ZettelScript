import { Command } from 'commander';
import * as fs from 'node:fs';
import process from 'node:process';
import { initContext, Spinner, printTable } from '../utils.js';
import type { Node, EdgeType } from '../../core/types/index.js';

// Default edge types for pathfinding
const DEFAULT_EDGE_TYPES: EdgeType[] = ['explicit_link', 'sequence', 'causes', 'semantic'];
const DEFAULT_EXCLUDED: EdgeType[] = ['semantic_suggestion', 'backlink', 'mention', 'hierarchy'];

// All possible edge types
const ALL_EDGE_TYPES: EdgeType[] = [
  'explicit_link',
  'backlink',
  'sequence',
  'hierarchy',
  'participation',
  'pov_visible_to',
  'causes',
  'setup_payoff',
  'semantic',
  'semantic_suggestion',
  'mention',
  'alias',
];

interface PathCommandOptions {
  maxPaths: string;
  maxDepth: string;
  maxExtra: string;
  format: 'table' | 'verbose' | 'md' | 'json';
  output?: string;
  edgeTypes?: string;
  excludeEdges?: string;
  ids?: boolean;
}

/**
 * Resolve a node identifier (title, path, or partial match)
 */
async function resolveNode(
  identifier: string,
  ctx: Awaited<ReturnType<typeof initContext>>
): Promise<Node | null> {
  // Try by path first
  const node = await ctx.nodeRepository.findByPath(identifier);
  if (node !== undefined) return node;

  // Try by exact title
  const byTitle = await ctx.nodeRepository.findByTitle(identifier);
  if (byTitle.length === 1) return byTitle[0]!;
  if (byTitle.length > 1) {
    console.error(`Ambiguous title "${identifier}". Found ${byTitle.length} matches:`);
    byTitle.slice(0, 5).forEach((n) => console.error(`  - ${n.title} (${n.path})`));
    if (byTitle.length > 5) console.error(`  ... and ${byTitle.length - 5} more`);
    return null;
  }

  // Try by alias or partial title match
  const byAlias = await ctx.nodeRepository.findByTitleOrAlias(identifier);
  if (byAlias.length === 1) return byAlias[0]!;
  if (byAlias.length > 1) {
    console.error(`Ambiguous identifier "${identifier}". Found ${byAlias.length} matches:`);
    byAlias.slice(0, 5).forEach((n) => console.error(`  - ${n.title} (${n.path})`));
    if (byAlias.length > 5) console.error(`  ... and ${byAlias.length - 5} more`);
    return null;
  }

  return null;
}

/**
 * Parse comma-separated edge types
 */
function parseEdgeTypes(input: string): EdgeType[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => ALL_EDGE_TYPES.includes(s as EdgeType)) as EdgeType[];
}

/**
 * Format output as table
 */
function formatTable(
  fromNode: Node,
  toNode: Node,
  paths: Array<{ path: string[]; edges: EdgeType[]; hopCount: number; score: number }>,
  nodeMap: Map<string, Node>,
  options: PathCommandOptions,
  effectiveEdgeTypes: EdgeType[],
  reason: string,
  k: number
): void {
  console.log(`\nPaths from "${fromNode.title}" to "${toNode.title}":\n`);

  if (paths.length === 0) {
    console.log('No paths found.\n');
    return;
  }

  const rows = paths.map((p, i) => {
    const route = p.path
      .map((id) => {
        const node = nodeMap.get(id);
        const name = node?.title || id;
        return options.ids ? `${name} [${id.slice(0, 8)}]` : name;
      })
      .join(' → ');

    // Truncate route if too long
    const maxRouteLen = 80;
    const displayRoute =
      route.length > maxRouteLen ? route.slice(0, maxRouteLen - 3) + '...' : route;

    return [String(i + 1), String(p.hopCount), p.score.toFixed(1), displayRoute];
  });

  printTable(['#', 'Hops', 'Score', 'Route'], rows);

  // Footer
  console.log();
  if (paths.length < k) {
    const reasonText =
      reason === 'diversity_filter'
        ? 'diversity filter rejected remaining candidates'
        : reason === 'exhausted_candidates'
          ? 'no more unique paths exist'
          : reason;
    console.log(
      `Found ${paths.length} path${paths.length !== 1 ? 's' : ''} (requested ${k}). Reason: ${reasonText}.`
    );
  } else {
    console.log(`Found ${paths.length} path${paths.length !== 1 ? 's' : ''}.`);
  }

  console.log(
    `Constraints: maxDepth=${options.maxDepth}, maxExtra=${options.maxExtra}, overlap≤0.7, edges=[${effectiveEdgeTypes.join(',')}]`
  );
}

/**
 * Format output as verbose
 */
function formatVerbose(
  fromNode: Node,
  toNode: Node,
  paths: Array<{ path: string[]; edges: EdgeType[]; hopCount: number; score: number }>,
  nodeMap: Map<string, Node>,
  options: PathCommandOptions
): void {
  console.log(`\nPaths from "${fromNode.title}" to "${toNode.title}":\n`);

  if (paths.length === 0) {
    console.log('No paths found.\n');
    return;
  }

  for (let i = 0; i < paths.length; i++) {
    const p = paths[i]!;
    console.log(`Path ${i + 1} (${p.hopCount} hops, score ${p.score.toFixed(1)}):`);

    let line = '  ';
    for (let j = 0; j < p.path.length; j++) {
      const id = p.path[j]!;
      const node = nodeMap.get(id);
      const name = node?.title || id;
      const display = options.ids ? `${name} [${id.slice(0, 8)}]` : name;

      line += display;
      if (j < p.edges.length) {
        line += ` ─[${p.edges[j]}]→ `;
      }
    }
    console.log(line);
    console.log();
  }
}

/**
 * Format output as markdown
 */
function formatMarkdown(
  fromNode: Node,
  toNode: Node,
  paths: Array<{ path: string[]; edges: EdgeType[]; hopCount: number; score: number }>,
  nodeMap: Map<string, Node>
): string {
  const lines: string[] = [];
  lines.push(`# Reading Path: ${fromNode.title} → ${toNode.title}`);
  lines.push('');

  if (paths.length === 0) {
    lines.push('No paths found between these nodes.');
    lines.push('');
  } else {
    for (let i = 0; i < paths.length; i++) {
      const p = paths[i]!;
      lines.push(`## Path ${i + 1} (${p.hopCount} hops)`);
      lines.push('');

      for (let j = 0; j < p.path.length; j++) {
        const id = p.path[j]!;
        const node = nodeMap.get(id);
        const name = node?.title || id;
        const nodePath = node?.path || '';
        lines.push(`${j + 1}. [${name}](${nodePath})`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('_Generated by ZettelScript Pathfinder_');

  return lines.join('\n');
}

/**
 * Format output as JSON
 */
function formatJson(
  fromNode: Node,
  toNode: Node,
  paths: Array<{ path: string[]; edges: EdgeType[]; hopCount: number; score: number }>,
  options: PathCommandOptions,
  effectiveEdgeTypes: EdgeType[],
  reason: string,
  k: number
): string {
  const output = {
    version: 1,
    computedAt: new Date().toISOString(),
    fromId: fromNode.nodeId,
    fromLabel: fromNode.title,
    toId: toNode.nodeId,
    toLabel: toNode.title,
    options: {
      k,
      maxDepth: parseInt(options.maxDepth, 10),
      maxExtra: parseInt(options.maxExtra, 10),
      overlapThreshold: 0.7,
      edgeTypes: effectiveEdgeTypes,
    },
    returnedCount: paths.length,
    reason: paths.length < k ? reason : 'found_all',
    paths: paths.map((p) => ({
      hopCount: p.hopCount,
      score: p.score,
      nodes: p.path,
      edges: p.edges,
    })),
  };

  return JSON.stringify(output, null, 2);
}

export const pathCommand = new Command('path')
  .description('Find narrative paths between two nodes')
  .argument('<from>', 'Starting node (title or path)')
  .argument('<to>', 'Ending node (title or path)')
  .option('-k, --max-paths <n>', 'Maximum paths to return', '3')
  .option('--max-depth <n>', 'Maximum hops to search', '15')
  .option('--max-extra <n>', 'Max extra hops beyond shortest', '2')
  .option('--format <type>', 'Output format: table|verbose|md|json', 'table')
  .option('-o, --output <file>', 'Write output to file')
  .option('--edge-types <types>', 'Comma-separated edge types to include')
  .option('--exclude-edges <types>', 'Comma-separated edge types to exclude')
  .option('--ids', 'Show node IDs in output')
  .action(async (from: string, to: string, options: PathCommandOptions) => {
    const spinner = new Spinner('Finding paths...');

    try {
      const ctx = await initContext();
      spinner.start();

      // Resolve nodes
      spinner.update('Resolving nodes...');
      const fromNode = await resolveNode(from, ctx);
      if (!fromNode) {
        spinner.stop();
        console.error(`Could not find node: "${from}"`);
        ctx.connectionManager.close();
        process.exit(1);
      }

      const toNode = await resolveNode(to, ctx);
      if (!toNode) {
        spinner.stop();
        console.error(`Could not find node: "${to}"`);
        ctx.connectionManager.close();
        process.exit(1);
      }

      // Determine effective edge types
      let effectiveEdgeTypes: EdgeType[];
      if (options.edgeTypes) {
        effectiveEdgeTypes = parseEdgeTypes(options.edgeTypes);
      } else {
        effectiveEdgeTypes = [...DEFAULT_EDGE_TYPES];
      }

      // Apply exclusions
      if (options.excludeEdges) {
        const excluded = new Set(parseEdgeTypes(options.excludeEdges));
        effectiveEdgeTypes = effectiveEdgeTypes.filter((t) => !excluded.has(t));
      } else if (!options.edgeTypes) {
        // Apply default exclusions only if --edge-types not specified
        const defaultExcluded = new Set(DEFAULT_EXCLUDED);
        effectiveEdgeTypes = effectiveEdgeTypes.filter((t) => !defaultExcluded.has(t));
      }

      if (effectiveEdgeTypes.length === 0) {
        spinner.stop();
        console.error(
          'No edge types selected. Check your --edge-types and --exclude-edges options.'
        );
        ctx.connectionManager.close();
        process.exit(1);
      }

      // Find paths
      spinner.update('Searching for paths...');
      const k = parseInt(options.maxPaths, 10);
      const maxDepth = parseInt(options.maxDepth, 10);
      const maxExtra = parseInt(options.maxExtra, 10);

      const { paths, reason } = await ctx.graphEngine.findKShortestPaths(
        fromNode.nodeId,
        toNode.nodeId,
        {
          k,
          maxDepth,
          maxExtraHops: maxExtra,
          edgeTypes: effectiveEdgeTypes,
          overlapThreshold: 0.7,
          maxCandidates: 100,
        }
      );

      // Get node info for display
      const allNodeIds = new Set<string>();
      for (const p of paths) {
        for (const id of p.path) {
          allNodeIds.add(id);
        }
      }
      const nodes = await ctx.nodeRepository.findByIds([...allNodeIds]);
      const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));

      spinner.stop();

      // Format output
      let output: string | undefined;

      switch (options.format) {
        case 'verbose':
          formatVerbose(fromNode, toNode, paths, nodeMap, options);
          break;

        case 'md':
          output = formatMarkdown(fromNode, toNode, paths, nodeMap);
          if (options.output) {
            fs.writeFileSync(options.output, output, 'utf-8');
            console.log(`Markdown written to: ${options.output}`);
          } else {
            console.log(output);
          }
          break;

        case 'json':
          output = formatJson(fromNode, toNode, paths, options, effectiveEdgeTypes, reason, k);
          if (options.output) {
            fs.writeFileSync(options.output, output, 'utf-8');
            console.log(`JSON written to: ${options.output}`);
          } else {
            console.log(output);
          }
          break;

        case 'table':
        default:
          formatTable(fromNode, toNode, paths, nodeMap, options, effectiveEdgeTypes, reason, k);
          break;
      }

      ctx.connectionManager.close();
    } catch (error) {
      spinner.stop();
      console.error('Path finding failed:', error);
      process.exit(1);
    }
  });
