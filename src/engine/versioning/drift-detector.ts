import type { Node, Version, Frontmatter } from '../../core/types/index.js';
import { NodeRepository, VersionRepository } from '../../storage/database/repositories/index.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DriftIssue {
  nodeId: string;
  nodeTitle: string;
  type: 'content_drift' | 'metadata_drift' | 'structure_drift' | 'frequency_anomaly';
  severity: 'info' | 'warning' | 'error';
  description: string;
  details?: Record<string, unknown>;
}

export interface DriftDetectorOptions {
  nodeRepository: NodeRepository;
  versionRepository: VersionRepository;
  vaultPath?: string;
}

/**
 * Detects semantic drift and anomalies in node content over time
 */
export class DriftDetector {
  private nodeRepo: NodeRepository;
  private versionRepo: VersionRepository;
  private vaultPath: string;

  constructor(options: DriftDetectorOptions) {
    this.nodeRepo = options.nodeRepository;
    this.versionRepo = options.versionRepository;
    this.vaultPath = options.vaultPath || process.cwd();
  }

  /**
   * Detect drift issues across all nodes
   */
  async detectAll(): Promise<DriftIssue[]> {
    const issues: DriftIssue[] = [];
    const nodes = await this.nodeRepo.findAll();

    for (const node of nodes) {
      const nodeIssues = await this.detectForNode(node.nodeId);
      issues.push(...nodeIssues);
    }

    return issues;
  }

  /**
   * Detect drift issues for a specific node
   */
  async detectForNode(nodeId: string): Promise<DriftIssue[]> {
    const issues: DriftIssue[] = [];
    const node = await this.nodeRepo.findById(nodeId);

    if (!node) return issues;

    // Get version history
    const versions = await this.versionRepo.findByNodeId(nodeId);

    if (versions.length < 2) {
      return issues; // Need history to detect drift
    }

    // Check for frequency anomalies
    const frequencyIssue = this.checkFrequencyAnomaly(node, versions);
    if (frequencyIssue) {
      issues.push(frequencyIssue);
    }

    // Check for metadata changes
    const metadataIssue = await this.checkMetadataDrift(node);
    if (metadataIssue) {
      issues.push(metadataIssue);
    }

    // Check for content structure changes
    const structureIssue = await this.checkStructureDrift(node);
    if (structureIssue) {
      issues.push(structureIssue);
    }

    return issues;
  }

  /**
   * Check for unusual version frequency
   */
  private checkFrequencyAnomaly(node: Node, versions: Version[]): DriftIssue | null {
    if (versions.length < 5) return null;

    // Calculate average time between versions
    const intervals: number[] = [];
    for (let i = 1; i < versions.length; i++) {
      const prev = versions[i - 1];
      const curr = versions[i];
      if (prev && curr) {
        const interval = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
        intervals.push(interval);
      }
    }

    if (intervals.length === 0) return null;

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const lastInterval = intervals[intervals.length - 1] ?? 0;

    // Check if last interval is significantly different (10x average)
    if (lastInterval > avgInterval * 10) {
      return {
        nodeId: node.nodeId,
        nodeTitle: node.title,
        type: 'frequency_anomaly',
        severity: 'info',
        description: 'Node has been inactive for unusually long time',
        details: {
          avgIntervalDays: Math.round(avgInterval / (1000 * 60 * 60 * 24)),
          lastIntervalDays: Math.round(lastInterval / (1000 * 60 * 60 * 24)),
        },
      };
    }

    // Check for burst of changes
    const recentVersions = versions.slice(-5);
    if (recentVersions.length === 5) {
      const recentInterval =
        new Date(recentVersions[4]?.createdAt ?? 0).getTime() -
        new Date(recentVersions[0]?.createdAt ?? 0).getTime();

      if (recentInterval < avgInterval / 10) {
        return {
          nodeId: node.nodeId,
          nodeTitle: node.title,
          type: 'frequency_anomaly',
          severity: 'warning',
          description: 'Node has unusual burst of recent changes',
          details: {
            recentChanges: 5,
            timeframeMinutes: Math.round(recentInterval / (1000 * 60)),
          },
        };
      }
    }

    return null;
  }

  /**
   * Check for metadata drift (type changes, missing required fields)
   */
  private async checkMetadataDrift(node: Node): Promise<DriftIssue | null> {
    const metadata = node.metadata as Frontmatter | undefined;

    // Check for type-specific missing fields
    if (node.type === 'scene' && metadata) {
      const missingFields: string[] = [];

      if (!metadata.pov) missingFields.push('pov');
      if (metadata.scene_order === undefined) missingFields.push('scene_order');

      if (missingFields.length > 0) {
        return {
          nodeId: node.nodeId,
          nodeTitle: node.title,
          type: 'metadata_drift',
          severity: 'warning',
          description: `Scene missing recommended fields: ${missingFields.join(', ')}`,
          details: { missingFields },
        };
      }
    }

    if (node.type === 'character' && metadata) {
      if (!metadata.aliases || metadata.aliases.length === 0) {
        return {
          nodeId: node.nodeId,
          nodeTitle: node.title,
          type: 'metadata_drift',
          severity: 'info',
          description: 'Character has no aliases defined',
        };
      }
    }

    return null;
  }

  /**
   * Check for structural drift (heading changes, major reorganization)
   */
  private async checkStructureDrift(node: Node): Promise<DriftIssue | null> {
    const filePath = path.join(this.vaultPath, node.path);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract headings
      const headings = content.match(/^#{1,6}\s+.+$/gm) || [];

      // Check for unusually deep nesting
      const maxDepth = Math.max(...headings.map((h) => h.match(/^#+/)?.[0].length ?? 0), 0);
      if (maxDepth > 4) {
        return {
          nodeId: node.nodeId,
          nodeTitle: node.title,
          type: 'structure_drift',
          severity: 'info',
          description: `Deep heading nesting (${maxDepth} levels) may indicate organizational issues`,
          details: { maxHeadingDepth: maxDepth, headingCount: headings.length },
        };
      }

      // Check for very large documents
      const lines = content.split('\n').length;
      if (lines > 500) {
        return {
          nodeId: node.nodeId,
          nodeTitle: node.title,
          type: 'structure_drift',
          severity: 'warning',
          description: `Document is unusually large (${lines} lines) - consider splitting`,
          details: { lineCount: lines },
        };
      }
    } catch {
      // Can't read file
    }

    return null;
  }

  /**
   * Get summary of drift across the vault
   */
  async getSummary(): Promise<{
    totalNodes: number;
    nodesWithIssues: number;
    issuesByType: Record<string, number>;
    issuesBySeverity: Record<string, number>;
  }> {
    const issues = await this.detectAll();
    const nodesWithIssues = new Set(issues.map((i) => i.nodeId)).size;

    const issuesByType: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = {};

    for (const issue of issues) {
      issuesByType[issue.type] = (issuesByType[issue.type] ?? 0) + 1;
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] ?? 0) + 1;
    }

    const totalNodes = await this.nodeRepo.count();

    return {
      totalNodes,
      nodesWithIssues,
      issuesByType,
      issuesBySeverity,
    };
  }
}
