import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import open from 'open';
import { initContext, getZettelScriptDir, Spinner } from '../utils.js';
import type { CLIContext } from '../utils.js';
import { computeDoctorStats, printEmbeddingStatus, printWormholeStatus } from './doctor.js';
import {
  generateVisualizationHtml,
  typeColors,
  type GraphData,
  type GraphNode,
  type GraphLink,
} from './visualize.js';
import {
  getEdgeLayer,
  LAYER_A_EDGES,
  LAYER_B_EDGES,
  type EdgeType,
  type Node,
  type Edge,
} from '../../core/types/index.js';

// ============================================================================
// State Management
// ============================================================================

interface FocusState {
  lastFocusedNodeId?: string;
  lastFocusedAt?: string;
}

function getStatePath(vaultPath: string): string {
  return path.join(getZettelScriptDir(vaultPath), 'state.json');
}

function loadFocusState(vaultPath: string): FocusState {
  const statePath = getStatePath(vaultPath);
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

function saveFocusState(vaultPath: string, state: FocusState): void {
  const statePath = getStatePath(vaultPath);
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

// ============================================================================
// Node Resolution
// ============================================================================

async function resolveTargetNode(
  ctx: CLIContext,
  target?: string
): Promise<Node | null> {
  const { nodeRepository, vaultPath } = ctx;

  // If target provided, resolve it
  if (target) {
    // Try as file path first
    let node = await nodeRepository.findByPath(target);
    if (node) return node;

    // Try as title
    const byTitle = await nodeRepository.findByTitle(target);
    if (byTitle.length > 0) return byTitle[0];

    // Try as alias
    const byAlias = await nodeRepository.findByTitleOrAlias(target);
    if (byAlias.length > 0) return byAlias[0];

    // Try as node ID
    node = await nodeRepository.findById(target);
    if (node) return node;

    return null;
  }

  // No target - use fallback order
  // 1. File with most recent mtime in vault
  const nodes = await nodeRepository.findAll();
  if (nodes.length === 0) return null;

  // Sort by updatedAt descending
  nodes.sort((a, b) => {
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });

  const mostRecent = nodes[0];

  // 2. Check last focused node
  const state = loadFocusState(vaultPath);
  if (state.lastFocusedNodeId) {
    const lastFocused = await nodeRepository.findById(state.lastFocusedNodeId);
    if (lastFocused) {
      // Use last focused if it's reasonably recent (edited in last day)
      const lastFocusedTime = lastFocused.updatedAt
        ? new Date(lastFocused.updatedAt).getTime()
        : 0;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (lastFocusedTime > oneDayAgo) {
        return lastFocused;
      }
    }
  }

  return mostRecent;
}

// ============================================================================
// Bounded Subgraph Builder
// ============================================================================

interface SubgraphOptions {
  nodeBudget: number;
  maxDepth: number;
}

interface SubgraphResult {
  nodes: Node[];
  edges: Edge[];
  focusNodeId: string;
}

async function buildBoundedSubgraph(
  ctx: CLIContext,
  focusNode: Node,
  options: SubgraphOptions
): Promise<SubgraphResult> {
  const { nodeRepository, edgeRepository } = ctx;
  const { nodeBudget, maxDepth } = options;

  const visitedNodes = new Set<string>([focusNode.nodeId]);
  const collectedNodes: Node[] = [focusNode];
  const collectedEdges: Edge[] = [];
  const edgeSet = new Set<string>();

  // BFS expansion - prioritize Layer A edges, then Layer B
  let frontier = [focusNode.nodeId];
  let depth = 0;

  while (frontier.length > 0 && collectedNodes.length < nodeBudget && depth < maxDepth) {
    const nextFrontier: string[] = [];
    depth++;

    for (const nodeId of frontier) {
      if (collectedNodes.length >= nodeBudget) break;

      // Get all connected edges (both directions)
      const allEdges = await edgeRepository.findConnected(nodeId);

      // Sort by layer priority (A first, then B)
      allEdges.sort((a, b) => {
        const layerA = getEdgeLayer(a.edgeType as EdgeType);
        const layerB = getEdgeLayer(b.edgeType as EdgeType);
        const priority: Record<string, number> = { A: 0, B: 1, C: 2, unknown: 3 };
        return (priority[layerA] || 3) - (priority[layerB] || 3);
      });

      for (const edge of allEdges) {
        if (collectedNodes.length >= nodeBudget) break;

        // Skip Layer C edges in focus mode
        const layer = getEdgeLayer(edge.edgeType as EdgeType);
        if (layer === 'C') continue;

        // Add edge if not seen
        if (!edgeSet.has(edge.edgeId)) {
          edgeSet.add(edge.edgeId);
          collectedEdges.push(edge);
        }

        // Determine neighbor
        const neighborId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;

        if (!visitedNodes.has(neighborId)) {
          visitedNodes.add(neighborId);
          const neighborNode = await nodeRepository.findById(neighborId);
          if (neighborNode) {
            collectedNodes.push(neighborNode);
            nextFrontier.push(neighborId);
          }
        }
      }
    }

    frontier = nextFrontier;
  }

  return {
    nodes: collectedNodes,
    edges: collectedEdges,
    focusNodeId: focusNode.nodeId,
  };
}

// ============================================================================
// Graph Data Conversion
// ============================================================================

function subgraphToGraphData(
  result: SubgraphResult,
  nodeColors: Record<string, string>
): GraphData {
  const { nodes, edges, focusNodeId } = result;

  // Calculate degree for node sizing
  const nodeWeights = new Map<string, number>();
  edges.forEach((e) => {
    nodeWeights.set(e.sourceId, (nodeWeights.get(e.sourceId) || 0) + 1);
    nodeWeights.set(e.targetId, (nodeWeights.get(e.targetId) || 0) + 1);
  });

  const graphNodes: GraphNode[] = nodes.map((n) => ({
    id: n.nodeId,
    name: n.title,
    type: n.type,
    val: n.nodeId === focusNodeId
      ? 15 // Focus node is larger
      : Math.max(1, Math.min(10, (nodeWeights.get(n.nodeId) || 0) / 2)),
    color: nodeColors[n.type] || '#94a3b8',
    path: n.path,
    metadata: (n.metadata as Record<string, unknown>) || {},
    updatedAtMs: n.updatedAt ? new Date(n.updatedAt).getTime() : undefined,
  }));

  const graphLinks: GraphLink[] = edges.map((e) => ({
    source: e.sourceId,
    target: e.targetId,
    type: e.edgeType,
    strength: e.strength ?? 1.0,
    provenance: e.provenance,
  }));

  return { nodes: graphNodes, links: graphLinks };
}

// ============================================================================
// Command Definition
// ============================================================================

export const focusCommand = new Command('focus')
  .description('Open a focus view centered on a specific note or the most recent file')
  .argument('[target]', 'File path, node title, or node ID to focus on')
  .option('-b, --budget <number>', 'Maximum number of nodes to show', '200')
  .option('-d, --depth <number>', 'Maximum expansion depth', '3')
  .option('-o, --output <path>', 'Output HTML file path')
  .option('--no-open', 'Do not open browser automatically')
  .action(
    async (
      target: string | undefined,
      options: {
        budget: string;
        depth: string;
        output?: string;
        open: boolean;
      }
    ) => {
      try {
        const ctx = await initContext();
        const nodeBudget = parseInt(options.budget, 10);
        const maxDepth = parseInt(options.depth, 10);

        // 1. Resolve target node
        const spinner = new Spinner('Resolving target...');
        spinner.start();

        const focusNode = await resolveTargetNode(ctx, target);

        if (!focusNode) {
          spinner.stop();
          if (target) {
            console.error(`Could not find node: "${target}"`);
            console.log('\nTry:');
            console.log('  - A file path relative to vault root');
            console.log('  - A note title');
            console.log('  - A node ID');
          } else {
            console.error('No nodes found in vault. Run "zs index" first.');
          }
          ctx.connectionManager.close();
          process.exit(1);
        }

        spinner.update(`Building focus view for "${focusNode.title}"...`);

        // Save focus state
        saveFocusState(ctx.vaultPath, {
          lastFocusedNodeId: focusNode.nodeId,
          lastFocusedAt: new Date().toISOString(),
        });

        // 2. Build bounded subgraph
        const subgraph = await buildBoundedSubgraph(ctx, focusNode, {
          nodeBudget,
          maxDepth,
        });

        spinner.stop(
          `Focus: "${focusNode.title}" (${subgraph.nodes.length} nodes, ${subgraph.edges.length} edges)`
        );

        // 3. Get health stats
        const statusData = await computeDoctorStats(ctx);

        // Print one-line embedding status
        printEmbeddingStatus(statusData);
        printWormholeStatus(statusData);

        // 4. Convert to graph data
        const graphData = subgraphToGraphData(subgraph, typeColors);

        // 5. Generate HTML
        const htmlContent = generateVisualizationHtml(
          graphData,
          typeColors,
          null, // No constellation
          null, // No path data
          null, // No WebSocket
          statusData
        );

        // 6. Write output
        const outputDir = options.output
          ? path.dirname(options.output)
          : getZettelScriptDir(ctx.vaultPath);

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = options.output || path.join(outputDir, 'focus.html');
        fs.writeFileSync(outputPath, htmlContent, 'utf-8');

        console.log(`\nFocus view generated: ${outputPath}`);

        // 7. Open browser
        if (options.open) {
          console.log('Opening in default browser...');
          await open(outputPath);
        }

        ctx.connectionManager.close();
      } catch (error) {
        if (error instanceof Error && error.message.includes('Not in a ZettelScript vault')) {
          console.error('Error: Not in a ZettelScript vault. Run "zs init" first.');
          process.exit(1);
        }
        console.error('Error:', error);
        process.exit(1);
      }
    }
  );
