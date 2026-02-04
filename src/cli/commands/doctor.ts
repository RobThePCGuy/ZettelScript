import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { initContext, getZettelScriptDir, getDbPath } from '../utils.js';
import type { CLIContext } from '../utils.js';
import { getEdgeLayer, type EdgeType } from '../../core/types/index.js';
import { getCircuitBreaker, CircuitState } from '../../core/circuit-breaker.js';

// ============================================================================
// Version from package.json
// ============================================================================

export function getVersionFromPath(packageJsonPath: string): string {
  try {
    const content = fs.readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content) as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export function getVersion(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageJsonPath = path.join(__dirname, '..', '..', '..', 'package.json');
  return getVersionFromPath(packageJsonPath);
}

// ============================================================================
// Health Status Types (reusable by Atlas and other commands)
// ============================================================================

export type HealthLevel = 'ok' | 'warn' | 'fail';

export interface EmbeddingHealth {
  level: HealthLevel;
  total: number;
  embedded: number;
  coverage: number; // 0-100
  pending: number;
  errorCount: number;
  lastError?: string;
  model?: string;
}

export interface WormholeHealth {
  enabled: boolean;
  count: number;
  threshold: number;
  disabledReason?: string;
}

export interface IndexHealth {
  lastIndexTime?: Date;
  nodeCount: number;
  edgeCount: number;
  edgesByLayer: { A: number; B: number; C: number };
  dbPath: string;
  dbSizeBytes: number;
}

export interface ExtractionHealth {
  badChunksPath?: string;
  parseFailCount: number;
}

export interface VisualizationHealth {
  mode: 'focus' | 'classic';
  filteredEdgeCount: number;
  totalEdgeCount: number;
}

export interface DoctorStats {
  version: string;
  vaultPath: string;
  overallLevel: HealthLevel;
  index: IndexHealth;
  embeddings: EmbeddingHealth;
  wormholes: WormholeHealth;
  extraction: ExtractionHealth;
  visualization: VisualizationHealth;
}

// ============================================================================
// Health Thresholds (per DESIGN.md)
// ============================================================================

const EMBEDDING_OK_THRESHOLD = 95; // >= 95% = OK
const EMBEDDING_WARN_THRESHOLD = 60; // 60-95% = WARN, < 60% = FAIL

/**
 * Compute embedding health level based on coverage percentage.
 */
export function getEmbeddingHealthLevel(coverage: number): HealthLevel {
  if (coverage >= EMBEDDING_OK_THRESHOLD) return 'ok';
  if (coverage >= EMBEDDING_WARN_THRESHOLD) return 'warn';
  return 'fail';
}

// ============================================================================
// Stats Computation (reusable)
// ============================================================================

/**
 * Compute comprehensive health stats for a vault.
 * This is the canonical source of truth for health data.
 */
export async function computeDoctorStats(ctx: CLIContext): Promise<DoctorStats> {
  const { vaultPath, config, nodeRepository, edgeRepository, embeddingRepository } = ctx;

  // Index stats
  const nodeCount = await nodeRepository.count();
  const edgeCount = await edgeRepository.count();
  const edgesByType = await edgeRepository.countByType();

  // Categorize edges by layer
  const edgesByLayer = { A: 0, B: 0, C: 0 };
  for (const [edgeType, count] of Object.entries(edgesByType)) {
    const layer = getEdgeLayer(edgeType as EdgeType);
    if (layer === 'A') edgesByLayer.A += count;
    else if (layer === 'B') edgesByLayer.B += count;
    else if (layer === 'C') edgesByLayer.C += count;
  }

  // Get db file stats
  const dbPath = getDbPath(vaultPath);
  let dbSizeBytes = 0;
  try {
    const stat = fs.statSync(dbPath);
    dbSizeBytes = stat.size;
  } catch {
    // DB might not exist yet
  }

  // Embedding stats
  const embeddingCount = await embeddingRepository.count();
  const embeddingCoverage = nodeCount > 0 ? (embeddingCount / nodeCount) * 100 : 0;
  const embeddingLevel = getEmbeddingHealthLevel(embeddingCoverage);
  const pendingEmbeddings = await embeddingRepository.findDirtyNodeIds();

  // Get model info
  let embeddingModel: string | undefined;
  const byModel = await embeddingRepository.countByModel();
  const models = Object.keys(byModel);
  if (models.length > 0) {
    embeddingModel = models[0];
  }

  // Wormhole stats
  const wormholeCount = edgesByType['semantic'] || 0;
  const wormholeThreshold = 0.75; // Default threshold from wormhole command
  let wormholeDisabledReason: string | undefined;
  if (embeddingLevel === 'fail') {
    wormholeDisabledReason = 'Insufficient embeddings';
  } else if (embeddingCount === 0) {
    wormholeDisabledReason = 'No embeddings computed';
  }

  // Extraction stats - check for bad-chunks file
  const zettelDir = getZettelScriptDir(vaultPath);
  const badChunksPath = path.join(zettelDir, 'extract-bad-chunks.jsonl');
  let parseFailCount = 0;
  if (fs.existsSync(badChunksPath)) {
    try {
      const content = fs.readFileSync(badChunksPath, 'utf-8');
      parseFailCount = content.split('\n').filter((line) => line.trim()).length;
    } catch {
      // Ignore read errors
    }
  }

  // Visualization stats
  const vizMode = config.visualization.mode;
  let filteredEdgeCount = edgesByLayer.A + edgesByLayer.B;
  if (vizMode === 'classic') {
    filteredEdgeCount = edgeCount;
  }

  // Compute overall health level
  let overallLevel: HealthLevel = 'ok';
  if (embeddingLevel === 'fail' || parseFailCount > 10) {
    overallLevel = 'fail';
  } else if (embeddingLevel === 'warn' || parseFailCount > 0) {
    overallLevel = 'warn';
  }

  return {
    version: getVersion(),
    vaultPath,
    overallLevel,
    index: {
      nodeCount,
      edgeCount,
      edgesByLayer,
      dbPath,
      dbSizeBytes,
    },
    embeddings: {
      level: embeddingLevel,
      total: nodeCount,
      embedded: embeddingCount,
      coverage: embeddingCoverage,
      pending: pendingEmbeddings.length,
      errorCount: getCircuitBreaker().getStatus('embeddings').totalFailures,
      model: embeddingModel,
    },
    wormholes: {
      enabled: !wormholeDisabledReason,
      count: wormholeCount,
      threshold: wormholeThreshold,
      disabledReason: wormholeDisabledReason,
    },
    extraction: {
      badChunksPath: parseFailCount > 0 ? badChunksPath : undefined,
      parseFailCount,
    },
    visualization: {
      mode: vizMode,
      filteredEdgeCount,
      totalEdgeCount: edgeCount,
    },
  };
}

// ============================================================================
// CLI Output Formatting
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function levelIcon(level: HealthLevel): string {
  switch (level) {
    case 'ok':
      return '✓';
    case 'warn':
      return '⚠';
    case 'fail':
      return '✗';
  }
}

function levelColor(level: HealthLevel): string {
  switch (level) {
    case 'ok':
      return '\x1b[32m'; // green
    case 'warn':
      return '\x1b[33m'; // yellow
    case 'fail':
      return '\x1b[31m'; // red
  }
}

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

function printStats(stats: DoctorStats): void {
  console.log('');
  console.log('ZettelScript Health Check');
  console.log('─────────────────────────');
  console.log('');

  // Index section
  console.log(`${DIM}Index${RESET}`);
  console.log(`  Nodes:       ${stats.index.nodeCount}`);
  console.log(
    `  Edges:       ${stats.index.edgeCount} (A: ${stats.index.edgesByLayer.A}, B: ${stats.index.edgesByLayer.B}, C: ${stats.index.edgesByLayer.C})`
  );
  console.log(`  Database:    ${formatBytes(stats.index.dbSizeBytes)}`);
  console.log('');

  // Embeddings section
  const embColor = levelColor(stats.embeddings.level);
  const embIcon = levelIcon(stats.embeddings.level);
  console.log(`${DIM}Embeddings${RESET}`);
  console.log(
    `  Coverage:    ${embColor}${stats.embeddings.embedded}/${stats.embeddings.total} (${stats.embeddings.coverage.toFixed(0)}%) ${embIcon}${RESET}`
  );
  if (stats.embeddings.pending > 0) {
    console.log(`  Pending:     ${stats.embeddings.pending} nodes`);
  }
  if (stats.embeddings.model) {
    console.log(`  Model:       ${stats.embeddings.model}`);
  }
  if (stats.embeddings.level !== 'ok') {
    console.log(`  ${DIM}Run: zs embed compute${RESET}`);
  }
  console.log('');

  // Wormholes section
  console.log(`${DIM}Wormholes${RESET}`);
  if (stats.wormholes.enabled) {
    console.log(`  Status:      \x1b[32menabled\x1b[0m`);
    console.log(`  Count:       ${stats.wormholes.count} edges`);
    console.log(`  Threshold:   ${stats.wormholes.threshold}`);
  } else {
    console.log(`  Status:      \x1b[33mdisabled\x1b[0m (${stats.wormholes.disabledReason})`);
    console.log(`  ${DIM}Run: zs embed compute && zs wormhole detect${RESET}`);
  }
  console.log('');

  // Extraction section
  if (stats.extraction.parseFailCount > 0) {
    console.log(`${DIM}Extraction${RESET}`);
    console.log(`  Parse fails: \x1b[33m${stats.extraction.parseFailCount}\x1b[0m`);
    if (stats.extraction.badChunksPath) {
      console.log(`  Log:         ${stats.extraction.badChunksPath}`);
    }
    console.log(`  ${DIM}Run: zs extract --retry-failed${RESET}`);
    console.log('');
  }

  // Visualization section
  console.log(`${DIM}Visualization${RESET}`);
  console.log(`  Mode:        ${stats.visualization.mode}`);
  if (stats.visualization.mode === 'focus') {
    const hidden = stats.visualization.totalEdgeCount - stats.visualization.filteredEdgeCount;
    console.log(
      `  Visible:     ${stats.visualization.filteredEdgeCount}/${stats.visualization.totalEdgeCount} edges (${hidden} Layer C hidden)`
    );
  }
  console.log('');

  // Circuit breaker section
  const circuitBreaker = getCircuitBreaker();
  const allStatus = circuitBreaker.getAllStatus();
  const subsystems = Object.keys(allStatus) as Array<keyof typeof allStatus>;

  if (subsystems.length > 0) {
    console.log(`${DIM}Circuit Breakers${RESET}`);
    for (const subsystem of subsystems) {
      const status = allStatus[subsystem];
      let stateColor: string;
      let stateIcon: string;

      switch (status.state) {
        case CircuitState.CLOSED:
          stateColor = '\x1b[32m'; // green
          stateIcon = '✓';
          break;
        case CircuitState.HALF_OPEN:
          stateColor = '\x1b[33m'; // yellow
          stateIcon = '⚠';
          break;
        case CircuitState.OPEN:
          stateColor = '\x1b[31m'; // red
          stateIcon = '✗';
          break;
      }

      console.log(`  ${subsystem}: ${stateColor}${status.state} ${stateIcon}${RESET}`);

      if (status.state === CircuitState.OPEN) {
        if (status.lastError) {
          console.log(`    Error:     ${status.lastError}`);
        }
        if (status.cooldownRemainingMs !== null) {
          const cooldownSeconds = Math.ceil(status.cooldownRemainingMs / 1000);
          const cooldownMinutes = Math.floor(cooldownSeconds / 60);
          const remainingSeconds = cooldownSeconds % 60;
          const timeStr =
            cooldownMinutes > 0
              ? `${cooldownMinutes}m ${remainingSeconds}s`
              : `${cooldownSeconds}s`;
          console.log(`    Cooldown:  ${timeStr} remaining`);
        }
        // Actionable fix for embeddings
        if (subsystem === 'embeddings') {
          console.log(`    ${DIM}Run: zs embed compute${RESET}`);
        }
      }
    }
    console.log('');
  }

  // Summary
  const overallColor = levelColor(stats.overallLevel);
  const overallIcon = levelIcon(stats.overallLevel);
  console.log('─────────────────────────');
  console.log(`Overall: ${overallColor}${stats.overallLevel.toUpperCase()} ${overallIcon}${RESET}`);
  console.log('');
}

/**
 * Print a one-line embedding status summary (for use in other commands).
 */
export function printEmbeddingStatus(stats: DoctorStats): void {
  const { embeddings } = stats;
  const color = levelColor(embeddings.level);

  let line = `Embeddings: ${color}${embeddings.level.toUpperCase()}${RESET} (${embeddings.coverage.toFixed(0)}% in view)`;

  if (embeddings.pending > 0) {
    line += `, ${embeddings.pending} pending`;
  }

  if (embeddings.level === 'fail') {
    line += `. Run: zs embed compute`;
  }

  console.log(line);
}

/**
 * Print wormhole status if there's a problem.
 */
export function printWormholeStatus(stats: DoctorStats): void {
  if (!stats.wormholes.enabled && stats.embeddings.level !== 'ok') {
    console.log(
      `\x1b[33mWormholes disabled in view (${stats.wormholes.disabledReason}). See: zs doctor\x1b[0m`
    );
  }
}

// ============================================================================
// Command Definition
// ============================================================================

export const doctorCommand = new Command('doctor')
  .description('Check vault health and diagnose issues')
  .option('--json', 'Output as JSON')
  .action(async (options: { json?: boolean }) => {
    try {
      const ctx = await initContext();
      const stats = await computeDoctorStats(ctx);

      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        printStats(stats);
      }

      ctx.connectionManager.close();

      // Exit with appropriate code
      if (stats.overallLevel === 'fail') {
        process.exit(2);
      } else if (stats.overallLevel === 'warn') {
        process.exit(1);
      }
      process.exit(0);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not in a ZettelScript vault')) {
        console.error('Error: Not in a ZettelScript vault. Run "zs init" first.');
        process.exit(2);
      }
      console.error('Error:', error);
      process.exit(2);
    }
  });
