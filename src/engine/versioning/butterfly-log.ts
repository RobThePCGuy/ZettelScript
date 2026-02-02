import type { Node, Edge } from '../../core/types/index.js';
import { nanoid } from 'nanoid';

export interface ChangeEntry {
  changeId: string;
  timestamp: string;
  type: 'node_created' | 'node_updated' | 'node_deleted' | 'edge_created' | 'edge_deleted';
  nodeId?: string;
  edgeId?: string;
  details: Record<string, unknown>;
  versionId?: string;
}

export interface ButterflyLogOptions {
  maxEntries?: number;
  defaultRecentCount?: number;
}

/**
 * Butterfly log for tracking changes and their cascading effects
 * Named after the butterfly effect - small changes can have large impacts
 */
export class ButterflyLog {
  private entries: ChangeEntry[] = [];
  private maxEntries: number;
  private defaultRecentCount: number;

  constructor(options: ButterflyLogOptions = {}) {
    this.maxEntries = options.maxEntries ?? 1000;
    this.defaultRecentCount = options.defaultRecentCount ?? 50;
  }

  /**
   * Log a node creation
   */
  logNodeCreated(node: Node, versionId?: string): ChangeEntry {
    return this.addEntry({
      type: 'node_created',
      nodeId: node.nodeId,
      details: {
        title: node.title,
        type: node.type,
        path: node.path,
      },
      ...(versionId != null && { versionId }),
    });
  }

  /**
   * Log a node update
   */
  logNodeUpdated(
    node: Node,
    changes: Record<string, { old: unknown; new: unknown }>,
    versionId?: string
  ): ChangeEntry {
    return this.addEntry({
      type: 'node_updated',
      nodeId: node.nodeId,
      details: {
        title: node.title,
        changes,
      },
      ...(versionId != null && { versionId }),
    });
  }

  /**
   * Log a node deletion
   */
  logNodeDeleted(nodeId: string, nodeTitle: string): ChangeEntry {
    return this.addEntry({
      type: 'node_deleted',
      nodeId,
      details: {
        title: nodeTitle,
      },
    });
  }

  /**
   * Log an edge creation
   */
  logEdgeCreated(edge: Edge): ChangeEntry {
    return this.addEntry({
      type: 'edge_created',
      edgeId: edge.edgeId,
      nodeId: edge.sourceId,
      details: {
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        edgeType: edge.edgeType,
      },
    });
  }

  /**
   * Log an edge deletion
   */
  logEdgeDeleted(edge: Edge): ChangeEntry {
    return this.addEntry({
      type: 'edge_deleted',
      edgeId: edge.edgeId,
      nodeId: edge.sourceId,
      details: {
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        edgeType: edge.edgeType,
      },
    });
  }

  /**
   * Add an entry to the log
   */
  private addEntry(entry: Omit<ChangeEntry, 'changeId' | 'timestamp'>): ChangeEntry {
    const fullEntry: ChangeEntry = {
      changeId: nanoid(),
      timestamp: new Date().toISOString(),
      ...entry,
    };

    this.entries.push(fullEntry);

    // Trim if over max
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    return fullEntry;
  }

  /**
   * Get all entries
   */
  getEntries(): ChangeEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries for a specific node
   */
  getEntriesForNode(nodeId: string): ChangeEntry[] {
    return this.entries.filter(e => e.nodeId === nodeId);
  }

  /**
   * Get entries within a time range
   */
  getEntriesInRange(startTime: Date, endTime: Date): ChangeEntry[] {
    return this.entries.filter(e => {
      const time = new Date(e.timestamp);
      return time >= startTime && time <= endTime;
    });
  }

  /**
   * Get recent entries
   */
  getRecentEntries(count?: number): ChangeEntry[] {
    const recentCount = count ?? this.defaultRecentCount;
    return this.entries.slice(-recentCount);
  }

  /**
   * Get entry by ID
   */
  getEntry(changeId: string): ChangeEntry | null {
    return this.entries.find(e => e.changeId === changeId) ?? null;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get change statistics
   */
  getStats(): {
    totalEntries: number;
    entriesByType: Record<string, number>;
    uniqueNodesChanged: number;
    recentActivity: { date: string; count: number }[];
  } {
    const entriesByType: Record<string, number> = {};
    const nodesChanged = new Set<string>();
    const activityByDate = new Map<string, number>();

    for (const entry of this.entries) {
      // Count by type
      entriesByType[entry.type] = (entriesByType[entry.type] ?? 0) + 1;

      // Track unique nodes
      if (entry.nodeId) {
        nodesChanged.add(entry.nodeId);
      }

      // Activity by date
      const date = entry.timestamp.split('T')[0];
      if (date) {
        activityByDate.set(date, (activityByDate.get(date) ?? 0) + 1);
      }
    }

    // Get recent 7 days of activity
    const recentActivity = Array.from(activityByDate.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 7)
      .map(([date, count]) => ({ date, count }));

    return {
      totalEntries: this.entries.length,
      entriesByType,
      uniqueNodesChanged: nodesChanged.size,
      recentActivity,
    };
  }

  /**
   * Export log to JSON
   */
  export(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      entries: this.entries,
    }, null, 2);
  }

  /**
   * Import log from JSON
   */
  import(json: string): number {
    try {
      const data = JSON.parse(json) as { entries: ChangeEntry[] };
      if (Array.isArray(data.entries)) {
        this.entries = data.entries;
        return data.entries.length;
      }
      return 0;
    } catch {
      return 0;
    }
  }
}
