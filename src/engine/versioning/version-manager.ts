import type { Version, Node } from '../../core/types/index.js';
import { NodeRepository, VersionRepository } from '../../storage/database/repositories/index.js';
import { hashContent } from '../../storage/filesystem/reader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface VersionManagerOptions {
  nodeRepository: NodeRepository;
  versionRepository: VersionRepository;
  vaultPath?: string;
}

export interface VersionDiff {
  versionId: string;
  parentVersionId: string | null;
  additions: number;
  deletions: number;
  summary?: string;
}

/**
 * Manages version history for nodes
 */
export class VersionManager {
  private nodeRepo: NodeRepository;
  private versionRepo: VersionRepository;
  private vaultPath: string;

  constructor(options: VersionManagerOptions) {
    this.nodeRepo = options.nodeRepository;
    this.versionRepo = options.versionRepository;
    this.vaultPath = options.vaultPath || process.cwd();
  }

  /**
   * Create a new version for a node if content has changed
   */
  async createVersionIfChanged(
    nodeId: string,
    content: string,
    summary?: string
  ): Promise<Version | null> {
    const contentHash = hashContent(content);
    const latestVersion = await this.versionRepo.findLatest(nodeId);

    if (latestVersion?.contentHash === contentHash) {
      return null; // No change
    }

    return this.versionRepo.create({
      nodeId,
      contentHash,
      ...(latestVersion?.versionId != null && { parentVersionId: latestVersion.versionId }),
      ...(summary != null && { summary }),
    });
  }

  /**
   * Get version history for a node
   */
  async getHistory(nodeId: string): Promise<Version[]> {
    return this.versionRepo.findByNodeId(nodeId);
  }

  /**
   * Get the latest version for a node
   */
  async getLatest(nodeId: string): Promise<Version | null> {
    return this.versionRepo.findLatest(nodeId);
  }

  /**
   * Get version chain (all ancestors from a version)
   */
  async getVersionChain(versionId: string): Promise<Version[]> {
    return this.versionRepo.getVersionChain(versionId);
  }

  /**
   * Check if content matches a specific version
   */
  async matchesVersion(_nodeId: string, content: string, versionId: string): Promise<boolean> {
    const version = await this.versionRepo.findById(versionId);
    if (!version) return false;

    const contentHash = hashContent(content);
    return version.contentHash === contentHash;
  }

  /**
   * Check if node has uncommitted changes (content differs from latest version)
   */
  async hasUncommittedChanges(nodeId: string): Promise<boolean> {
    const node = await this.nodeRepo.findById(nodeId);
    if (!node) return false;

    const latestVersion = await this.versionRepo.findLatest(nodeId);
    if (!latestVersion) return true; // No versions means uncommitted

    // Read current file content
    const filePath = path.join(this.vaultPath, node.path);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const currentHash = hashContent(content);
      return currentHash !== latestVersion.contentHash;
    } catch {
      return true; // Can't read file, assume changed
    }
  }

  /**
   * Get version count for a node
   */
  async getVersionCount(nodeId: string): Promise<number> {
    const versions = await this.versionRepo.findByNodeId(nodeId);
    return versions.length;
  }

  /**
   * Get statistics about versioning
   */
  async getStats(): Promise<{
    totalVersions: number;
    nodesWithVersions: number;
    avgVersionsPerNode: number;
    maxVersions: { nodeId: string; count: number };
  }> {
    const versionCounts = await this.versionRepo.countPerNode();

    let totalVersions = 0;
    let maxVersions = { nodeId: '', count: 0 };

    for (const [nodeId, count] of versionCounts) {
      totalVersions += count;
      if (count > maxVersions.count) {
        maxVersions = { nodeId, count };
      }
    }

    return {
      totalVersions,
      nodesWithVersions: versionCounts.size,
      avgVersionsPerNode: versionCounts.size > 0 ? totalVersions / versionCounts.size : 0,
      maxVersions,
    };
  }

  /**
   * Delete old versions, keeping the most recent N
   */
  async pruneVersions(nodeId: string, keepCount: number): Promise<number> {
    const versions = await this.versionRepo.findByNodeId(nodeId);

    if (versions.length <= keepCount) {
      return 0;
    }

    // Sort by date descending
    versions.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Delete old versions
    const toDelete = versions.slice(keepCount);
    for (const version of toDelete) {
      await this.versionRepo.delete(version.versionId);
    }

    return toDelete.length;
  }

  /**
   * Find versions within a date range
   */
  async findVersionsInRange(
    nodeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Version[]> {
    const versions = await this.versionRepo.findByNodeId(nodeId);

    return versions.filter(v => {
      const date = new Date(v.createdAt);
      return date >= startDate && date <= endDate;
    });
  }

  /**
   * Restore a node to a specific version (reads from stored hash, doesn't actually restore content)
   * Returns the version info for manual restoration
   */
  async getVersionInfo(versionId: string): Promise<{
    version: Version;
    node: Node | null;
  } | null> {
    const version = await this.versionRepo.findById(versionId);
    if (!version) return null;

    const node = await this.nodeRepo.findById(version.nodeId);

    return { version, node };
  }
}
