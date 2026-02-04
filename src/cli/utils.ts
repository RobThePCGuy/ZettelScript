import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { ConnectionManager } from '../storage/database/connection.js';
import {
  NodeRepository,
  EdgeRepository,
  VersionRepository,
  ChunkRepository,
  MentionRepository,
  UnresolvedLinkRepository,
  ConstellationRepository,
  EmbeddingRepository,
  WormholeRepository,
  CandidateEdgeRepository,
} from '../storage/database/repositories/index.js';
import { IndexingPipeline } from '../indexer/pipeline.js';
import { GraphEngine } from '../core/graph/engine.js';
import type { ZettelScriptConfig } from '../core/types/index.js';
import { DEFAULT_CONFIG } from '../core/types/index.js';

const ZETTELSCRIPT_DIR = '.zettelscript';
const CONFIG_FILE = 'config.yaml';
const DB_FILE = 'zettelscript.db';

/**
 * Find the vault root by looking for .zettelscript directory
 */
export function findVaultRoot(startPath: string = process.cwd()): string | null {
  let currentPath = path.resolve(startPath);

  while (currentPath !== path.dirname(currentPath)) {
    const zettelDir = path.join(currentPath, ZETTELSCRIPT_DIR);
    if (fs.existsSync(zettelDir)) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}

/**
 * Get the .zettelscript directory path
 */
export function getZettelScriptDir(vaultPath: string): string {
  return path.join(vaultPath, ZETTELSCRIPT_DIR);
}

/**
 * Get the database path
 */
export function getDbPath(vaultPath: string): string {
  return path.join(vaultPath, ZETTELSCRIPT_DIR, DB_FILE);
}

/**
 * Get the config file path
 */
export function getConfigPath(vaultPath: string): string {
  return path.join(vaultPath, ZETTELSCRIPT_DIR, CONFIG_FILE);
}

/**
 * Load configuration
 */
export function loadConfig(vaultPath: string): ZettelScriptConfig {
  const configPath = getConfigPath(vaultPath);

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG, vault: { ...DEFAULT_CONFIG.vault, path: vaultPath } };
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const userConfig = parseYaml(content) as Partial<ZettelScriptConfig>;

    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      vault: { ...DEFAULT_CONFIG.vault, ...userConfig.vault, path: vaultPath },
      database: { ...DEFAULT_CONFIG.database, ...userConfig.database },
      embeddings: { ...DEFAULT_CONFIG.embeddings, ...userConfig.embeddings },
      retrieval: { ...DEFAULT_CONFIG.retrieval, ...userConfig.retrieval },
      manuscript: { ...DEFAULT_CONFIG.manuscript, ...userConfig.manuscript },
      graph: { ...DEFAULT_CONFIG.graph, ...userConfig.graph },
      chunking: { ...DEFAULT_CONFIG.chunking, ...userConfig.chunking },
      discovery: {
        ...DEFAULT_CONFIG.discovery,
        ...userConfig.discovery,
        weights: { ...DEFAULT_CONFIG.discovery.weights, ...userConfig.discovery?.weights },
      },
      cache: { ...DEFAULT_CONFIG.cache, ...userConfig.cache },
      impact: { ...DEFAULT_CONFIG.impact, ...userConfig.impact },
      moc: { ...DEFAULT_CONFIG.moc, ...userConfig.moc },
      versioning: { ...DEFAULT_CONFIG.versioning, ...userConfig.versioning },
      search: { ...DEFAULT_CONFIG.search, ...userConfig.search },
      llm: { ...DEFAULT_CONFIG.llm, ...userConfig.llm },
      visualization: { ...DEFAULT_CONFIG.visualization, ...userConfig.visualization },
    };
  } catch (error) {
    console.warn(`Warning: Could not parse config file: ${error}`);
    return { ...DEFAULT_CONFIG, vault: { ...DEFAULT_CONFIG.vault, path: vaultPath } };
  }
}

/**
 * Save configuration
 */
export function saveConfig(vaultPath: string, config: ZettelScriptConfig): void {
  const configPath = getConfigPath(vaultPath);
  const content = stringifyYaml(config);
  fs.writeFileSync(configPath, content, 'utf-8');
}

/**
 * Context object containing all initialized components
 */
export interface CLIContext {
  vaultPath: string;
  config: ZettelScriptConfig;
  connectionManager: ConnectionManager;
  nodeRepository: NodeRepository;
  edgeRepository: EdgeRepository;
  versionRepository: VersionRepository;
  chunkRepository: ChunkRepository;
  mentionRepository: MentionRepository;
  unresolvedLinkRepository: UnresolvedLinkRepository;
  constellationRepository: ConstellationRepository;
  embeddingRepository: EmbeddingRepository;
  wormholeRepository: WormholeRepository;
  candidateEdgeRepository: CandidateEdgeRepository;
  pipeline: IndexingPipeline;
  graphEngine: GraphEngine;
}

/**
 * Initialize CLI context
 */
export async function initContext(vaultPath?: string): Promise<CLIContext> {
  // Find vault root
  const resolvedPath = vaultPath ? path.resolve(vaultPath) : findVaultRoot();

  if (!resolvedPath) {
    throw new Error('Not in a ZettelScript vault. Run "zettel init" to create one.');
  }

  // Load config
  const config = loadConfig(resolvedPath);

  // Initialize database
  const dbPath = getDbPath(resolvedPath);
  const connectionManager = ConnectionManager.getInstance(dbPath);
  await connectionManager.initialize();

  const db = connectionManager.getDb();
  const sqlite = connectionManager.getSqlite();

  // Initialize repositories
  const nodeRepository = new NodeRepository(db);
  const edgeRepository = new EdgeRepository(db);
  const versionRepository = new VersionRepository(db);
  const chunkRepository = new ChunkRepository(db, sqlite);
  const mentionRepository = new MentionRepository(db);
  const unresolvedLinkRepository = new UnresolvedLinkRepository(db);
  const constellationRepository = new ConstellationRepository(db);
  const embeddingRepository = new EmbeddingRepository(db);
  const wormholeRepository = new WormholeRepository(db);
  const candidateEdgeRepository = new CandidateEdgeRepository(db);

  // Initialize pipeline
  const pipeline = new IndexingPipeline({
    nodeRepository,
    edgeRepository,
    versionRepository,
  });

  // Initialize graph engine
  const graphEngine = new GraphEngine({
    nodeRepository,
    edgeRepository,
  });

  return {
    vaultPath: resolvedPath,
    config,
    connectionManager,
    nodeRepository,
    edgeRepository,
    versionRepository,
    chunkRepository,
    mentionRepository,
    unresolvedLinkRepository,
    constellationRepository,
    embeddingRepository,
    wormholeRepository,
    candidateEdgeRepository,
    pipeline,
    graphEngine,
  };
}

/**
 * Format a duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format a file size
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Simple spinner for CLI feedback
 */
export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private frameIndex = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stdout.write(`\r${frame} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  update(message: string): void {
    this.message = message;
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\r' + ' '.repeat(this.message.length + 10) + '\r');
    if (finalMessage) {
      console.log(finalMessage);
    }
  }
}

/**
 * Print a table
 */
export function printTable(
  headers: string[],
  rows: string[][],
  options: { padding?: number } = {}
): void {
  const { padding = 2 } = options;

  // Calculate column widths
  const widths = headers.map((h, i) => {
    const values = [h, ...rows.map((r) => r[i] || '')];
    return Math.max(...values.map((v) => v.length));
  });

  // Print header
  const headerLine = headers.map((h, i) => h.padEnd(widths[i] ?? 0)).join(' '.repeat(padding));
  console.log(headerLine);
  console.log('-'.repeat(headerLine.length));

  // Print rows
  for (const row of rows) {
    const line = row
      .map((cell, i) => (cell || '').padEnd(widths[i] ?? 0))
      .join(' '.repeat(padding));
    console.log(line);
  }
}
