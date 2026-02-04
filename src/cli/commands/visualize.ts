import { Command } from 'commander';
import process from 'node:process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import open from 'open';
import { initContext, getZettelScriptDir, printTable } from '../utils.js';
import type { Constellation } from '../../storage/database/repositories/index.js';
import { createVisualizeServer, type VisualizeServer } from '../server/visualize-server.js';
import { PROTOCOL_VERSION } from '../server/ws-protocol.js';
import { shouldRenderEdge, type EdgeType } from '../../core/types/index.js';
import { computeDoctorStats, type DoctorStats } from './doctor.js';

// Node type colors (Modern Palette)
export const typeColors: Record<string, string> = {
  note: '#94a3b8', // Slate 400
  scene: '#a78bfa', // Violet 400
  character: '#34d399', // Emerald 400
  location: '#60a5fa', // Blue 400
  object: '#fbbf24', // Amber 400
  event: '#f87171', // Red 400
  concept: '#f472b6', // Pink 400
  moc: '#fb923c', // Orange 400
  timeline: '#818cf8', // Indigo 400
  draft: '#52525b', // Zinc 600
  ghost: '#64748b', // Slate 500 (for ghost nodes)
};

// Edge type styling configuration
export const edgeStyles: Record<string, { color: string; dash: number[]; label: string }> = {
  explicit_link: { color: '#22d3ee', dash: [], label: 'Links to' }, // Cyan
  backlink: { color: '#a78bfa', dash: [5, 5], label: 'Backlinks' }, // Violet
  sequence: { color: '#34d399', dash: [], label: 'Sequence' }, // Emerald
  hierarchy: { color: '#fbbf24', dash: [], label: 'Hierarchy' }, // Amber
  participation: { color: '#f472b6', dash: [], label: 'Participation' }, // Pink
  pov_visible_to: { color: '#60a5fa', dash: [3, 3], label: 'POV Visible' }, // Blue
  causes: { color: '#f87171', dash: [], label: 'Causes' }, // Red
  setup_payoff: { color: '#fb923c', dash: [], label: 'Setup/Payoff' }, // Orange
  semantic: { color: '#94a3b8', dash: [2, 2], label: 'Semantic' }, // Gray (accepted wormholes)
  semantic_suggestion: { color: '#64748b', dash: [3, 3], label: 'Wormhole' }, // Slate 500 (pending wormholes)
  mention: { color: '#2dd4bf', dash: [2, 2], label: 'Mention' }, // Teal
  alias: { color: '#818cf8', dash: [4, 2], label: 'Alias' }, // Indigo
  ghost_ref: { color: '#64748b', dash: [2, 2], label: 'Ghost Reference' }, // Slate 500
};

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  val: number;
  color: string;
  path: string;
  metadata: Record<string, unknown>;
  updatedAtMs?: number | undefined; // Epoch ms for heat vision
  isGhost?: boolean;
  sourceIds?: string[];
  referenceCount?: number;
  mostRecentRef?: string | undefined;
}

export interface WebSocketConfig {
  enabled: boolean;
  port: number;
  token: string;
  protocolVersion: string;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  strength?: number;
  provenance?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface PathData {
  paths: Array<{
    path: string[];
    edges: string[];
    hopCount: number;
    score: number;
  }>;
  fromId: string;
  toId: string;
  fromLabel: string;
  toLabel: string;
}

export function generateVisualizationHtml(
  graphData: GraphData,
  nodeTypeColors: Record<string, string>,
  constellation?: Constellation | null,
  pathData?: PathData | null,
  wsConfig?: WebSocketConfig | null,
  statusData?: DoctorStats | null
): string {
  const constellationState = constellation ? JSON.stringify(constellation) : 'null';
  const pathDataJson = pathData ? JSON.stringify(pathData) : 'null';
  const wsConfigJson = wsConfig ? JSON.stringify(wsConfig) : 'null';
  const statusDataJson = statusData ? JSON.stringify(statusData) : 'null';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ZettelScript Atlas</title>
  <style>
    :root {
      --bg: #0f172a;
      --panel-bg: rgba(30, 41, 59, 0.7);
      --border: rgba(148, 163, 184, 0.2);
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
    }
    body { margin: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text-main); overflow: hidden; }

    #graph { width: 100vw; height: 100vh; cursor: crosshair; }

    /* Glassmorphism Panels */
    .panel {
      background: var(--panel-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      padding: 16px;
      position: absolute;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Breadcrumb Navigation */
    #breadcrumbs {
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      opacity: 0;
      pointer-events: none;
    }
    #breadcrumbs.active { opacity: 1; pointer-events: auto; }

    .nav-btn {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      color: var(--text-muted);
      width: 32px;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: 1rem;
    }
    .nav-btn:hover:not(:disabled) { background: rgba(56, 189, 248, 0.2); color: var(--accent); border-color: var(--accent); }
    .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .breadcrumb-trail {
      display: flex;
      align-items: center;
      gap: 4px;
      max-width: 400px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .breadcrumb-trail::-webkit-scrollbar { display: none; }

    .breadcrumb-item {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.85rem;
      cursor: pointer;
      white-space: nowrap;
      color: var(--text-muted);
      transition: all 0.2s;
    }
    .breadcrumb-item:hover { background: rgba(255,255,255,0.1); color: var(--text-main); }
    .breadcrumb-item.current { color: var(--accent); font-weight: 600; }
    .breadcrumb-sep { color: var(--text-muted); opacity: 0.5; }

    /* Sidebar */
    #sidebar {
      top: 20px;
      right: 20px;
      width: 320px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      transform: translateX(400px);
      opacity: 0;
    }
    #sidebar.active { transform: translateX(0); opacity: 1; }
    #sidebar::-webkit-scrollbar { width: 6px; }
    #sidebar::-webkit-scrollbar-track { background: transparent; }
    #sidebar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 3px; }

    .node-header { padding-bottom: 12px; border-bottom: 1px solid var(--border); margin-bottom: 12px; }
    .node-title { margin: 0; font-size: 1.25rem; font-weight: 600; line-height: 1.3; color: var(--text-main); }
    .node-badge {
      display: inline-block; margin-top: 8px; padding: 4px 8px;
      border-radius: 99px; font-size: 0.75rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em;
      color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }

    .meta-grid { display: grid; gap: 12px; }
    .meta-item { display: flex; flex-direction: column; gap: 4px; }
    .meta-key { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
    .meta-val { font-size: 0.9rem; color: var(--text-main); word-break: break-word; line-height: 1.5; }

    code {
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85em;
    }

    /* Connections Section */
    .connections-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .connections-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 12px;
      letter-spacing: 0.05em;
    }
    .connection-group {
      margin-bottom: 12px;
    }
    .connection-group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .connection-group-icon {
      font-size: 0.9rem;
    }
    .connection-group-count {
      background: rgba(255,255,255,0.1);
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 0.7rem;
    }
    .connected-node {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      margin: 2px 0;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .connected-node:hover {
      background: rgba(56, 189, 248, 0.15);
    }
    .connected-node-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .connected-node-name {
      font-size: 0.85rem;
      color: var(--text-main);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .connected-node-type {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: lowercase;
    }

    /* Controls & Legend */
    #controls {
      top: 20px;
      left: 20px;
      max-width: 250px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
    }
    #controls::-webkit-scrollbar { width: 6px; }
    #controls::-webkit-scrollbar-track { background: transparent; }
    #controls::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 3px; }

    .search-wrapper { position: relative; margin-bottom: 16px; }
    input[type="text"] {
      width: 100%;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 10px 12px;
      border-radius: 8px;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus { border-color: var(--accent); }

    .legend-title { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; }
    .legend-grid { display: grid; grid-template-columns: 1fr; gap: 4px; }
    .legend-item {
      display: flex; align-items: center; gap: 10px;
      font-size: 0.85rem; cursor: pointer; padding: 4px 8px;
      border-radius: 6px; transition: background 0.2s;
      user-select: none;
    }
    .legend-item:hover { background: rgba(255,255,255,0.05); }
    .legend-item.hidden { opacity: 0.4; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }

    /* Edge Type Filter */
    .filter-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .edge-legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.8rem;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.2s;
      user-select: none;
    }
    .edge-legend-item:hover { background: rgba(255,255,255,0.05); }
    .edge-legend-item.hidden { opacity: 0.4; }
    .edge-line {
      width: 20px;
      height: 2px;
      border-radius: 1px;
    }

    /* Keyboard shortcuts hint */
    .shortcuts-hint {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
      line-height: 1.6;
    }
    kbd {
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 5px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
    }

    /* Ghost nodes controls */
    .ghost-controls {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .toggle-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      cursor: pointer;
      padding: 4px 0;
    }
    .toggle-item input[type="checkbox"] {
      accent-color: var(--accent);
      width: 16px;
      height: 16px;
    }
    .threshold-control {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .threshold-control input[type="range"] {
      flex: 1;
      accent-color: var(--accent);
    }
    .threshold-val {
      min-width: 20px;
      text-align: center;
      color: var(--text-main);
    }
    .ghost-count {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* Heat Vision controls */
    .heat-controls {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .heat-legend {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 8px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 6px;
    }
    .heat-legend-bar {
      flex: 1;
      height: 8px;
      border-radius: 4px;
      background: linear-gradient(to right, #3b82f6, #fbbf24, #ef4444);
    }
    .heat-legend-label {
      font-size: 0.7rem;
      color: var(--text-muted);
      min-width: 40px;
    }
    .heat-legend-label:last-child {
      text-align: right;
    }

    /* Ghost sidebar action */
    .ghost-action {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .create-note-btn {
      width: 100%;
      background: rgba(56, 189, 248, 0.2);
      border: 1px solid var(--accent);
      color: var(--accent);
      padding: 10px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    .create-note-btn:hover {
      background: rgba(56, 189, 248, 0.3);
    }
    .ghost-info {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 8px;
      line-height: 1.4;
    }

    /* Constellation controls */
    .constellation-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .save-constellation-btn {
      width: 100%;
      background: rgba(251, 146, 60, 0.2);
      border: 1px solid #fb923c;
      color: #fb923c;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    .save-constellation-btn:hover {
      background: rgba(251, 146, 60, 0.3);
    }
    .constellation-name {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 8px;
      text-align: center;
    }
    .constellation-name strong {
      color: #fb923c;
    }

    /* Path Finder Panel */
    #path-panel {
      bottom: 20px;
      left: 20px;
      max-width: 400px;
      display: none;
    }
    #path-panel.active {
      display: block;
    }
    .path-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .path-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-main);
    }
    .path-close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1.2rem;
      padding: 4px;
    }
    .path-close-btn:hover {
      color: var(--text-main);
    }
    .path-selector {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }
    .path-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.4);
    }
    .path-option:hover {
      background: rgba(56, 189, 248, 0.1);
      border-color: var(--accent);
    }
    .path-option.selected {
      background: rgba(251, 191, 36, 0.2);
      border-color: #fbbf24;
    }
    .path-option-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .path-option.selected .path-option-num {
      background: #fbbf24;
      color: #000;
    }
    .path-option-info {
      flex: 1;
    }
    .path-option-route {
      font-size: 0.8rem;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .path-option-meta {
      font-size: 0.7rem;
      color: var(--text-muted);
    }
    .path-show-all {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .path-show-all input[type="checkbox"] {
      accent-color: var(--accent);
    }

    /* Backlog Panel */
    .backlog-panel {
      bottom: 20px;
      right: 20px;
      width: 280px;
      max-height: 400px;
    }
    .backlog-header {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }
    .backlog-toggle {
      transition: transform 0.2s;
      font-size: 0.7rem;
      color: var(--text-muted);
    }
    .backlog-panel:not(.expanded) .backlog-toggle {
      transform: rotate(-90deg);
    }
    .backlog-panel:not(.expanded) .backlog-content {
      display: none;
    }
    .backlog-sort {
      margin-left: auto;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.7rem;
      cursor: pointer;
    }
    .backlog-search {
      margin: 8px 0;
    }
    .backlog-search input {
      width: 100%;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      box-sizing: border-box;
    }
    .backlog-list {
      max-height: 280px;
      overflow-y: auto;
    }
    .backlog-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 4px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .backlog-row:hover {
      background: rgba(56, 189, 248, 0.1);
    }
    .backlog-row.pending {
      opacity: 0.6;
    }
    .backlog-row-main {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      overflow: hidden;
    }
    .backlog-title {
      flex: 1;
      font-size: 0.85rem;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .backlog-badges {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }
    .backlog-ref-count {
      background: rgba(56, 189, 248, 0.2);
      color: var(--accent);
      padding: 1px 5px;
      border-radius: 10px;
      font-size: 0.7rem;
      font-weight: 600;
    }
    .backlog-recency {
      color: var(--text-muted);
      font-size: 0.7rem;
    }
    .backlog-create-btn {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(56, 189, 248, 0.2);
      border: 1px solid var(--accent);
      color: var(--accent);
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .backlog-create-btn:hover:not(:disabled) {
      background: rgba(56, 189, 248, 0.3);
    }
    .backlog-create-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .backlog-more {
      padding: 8px 4px;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
    }

    /* Create Panel Modal */
    .create-panel {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .create-panel.active {
      display: flex;
    }
    .create-panel-inner {
      width: 340px;
      position: relative;
    }
    .create-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
    }
    .create-panel-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .create-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .create-field span {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .create-field input,
    .create-field select {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 0.9rem;
    }
    .create-field input:focus,
    .create-field select:focus {
      border-color: var(--accent);
      outline: none;
    }
    .create-panel-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .create-cancel-btn {
      background: none;
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
    }
    .create-cancel-btn:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .create-submit-btn {
      background: rgba(56, 189, 248, 0.2);
      border: 1px solid var(--accent);
      color: var(--accent);
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
    .create-submit-btn:hover {
      background: rgba(56, 189, 248, 0.3);
    }

    /* Health Status Panel */
    #status-panel {
      position: fixed;
      bottom: 20px;
      left: 20px;
      min-width: 200px;
      max-width: 300px;
      z-index: 1000;
    }
    #status-panel .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--panel-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
    }
    #status-panel .panel-header:hover {
      background: rgba(30, 41, 59, 0.9);
    }
    #status-panel .panel-content {
      margin-top: 8px;
      padding: 12px;
      border-radius: 8px;
      background: var(--panel-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      display: none;
    }
    #status-panel.expanded .panel-content {
      display: block;
    }
    #status-panel .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 0.85rem;
    }
    #status-panel .status-row:last-child {
      margin-bottom: 0;
    }
    #status-panel .status-label {
      color: var(--text-muted);
    }
    #status-panel .status-value {
      font-weight: 500;
    }
    #status-panel .status-ok { color: #34d399; }
    #status-panel .status-warn { color: #fbbf24; }
    #status-panel .status-fail { color: #f87171; }
    #status-panel .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    #status-panel .badge-ok {
      background: rgba(52, 211, 153, 0.2);
      color: #34d399;
    }
    #status-panel .badge-warn {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }
    #status-panel .badge-fail {
      background: rgba(248, 113, 113, 0.2);
      color: #f87171;
    }
    #status-panel .mode-toggle {
      display: flex;
      gap: 4px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }
    #status-panel .mode-btn {
      flex: 1;
      padding: 6px 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }
    #status-panel .mode-btn:hover {
      background: rgba(56, 189, 248, 0.1);
      color: var(--text-main);
    }
    #status-panel .mode-btn.active {
      background: rgba(56, 189, 248, 0.2);
      color: var(--accent);
      border-color: var(--accent);
    }
    #status-panel .help-link {
      display: block;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 0.75rem;
      text-decoration: none;
    }
    #status-panel .help-link code {
      background: rgba(0,0,0,0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }

    /* WebSocket Status Indicator */
    .ws-status {
      position: fixed;
      top: 20px;
      right: 350px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      transition: all 0.3s;
    }
    .ws-status.connected {
      background: #34d399;
      box-shadow: 0 0 8px #34d399;
    }
    .ws-status.disconnected {
      background: #fbbf24;
      box-shadow: 0 0 8px #fbbf24;
      animation: pulse 1.5s infinite;
    }
    .ws-status.error {
      background: #f87171;
      box-shadow: 0 0 8px #f87171;
    }

    /* Upgrade Banner */
    #upgrade-banner {
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      max-width: 500px;
      padding: 16px 20px;
      background: rgba(56, 189, 248, 0.1);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 12px;
      z-index: 1002;
      display: none;
    }
    #upgrade-banner.show {
      display: block;
      animation: slideDown 0.3s ease;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    #upgrade-banner h3 {
      margin: 0 0 8px 0;
      font-size: 1rem;
      color: var(--accent);
    }
    #upgrade-banner p {
      margin: 0 0 12px 0;
      font-size: 0.9rem;
      color: var(--text-main);
      line-height: 1.4;
    }
    #upgrade-banner .banner-actions {
      display: flex;
      gap: 8px;
    }
    #upgrade-banner .banner-btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    #upgrade-banner .banner-btn-primary {
      background: var(--accent);
      color: var(--bg);
      border: none;
      font-weight: 600;
    }
    #upgrade-banner .banner-btn-primary:hover {
      background: #7dd3fc;
    }
    #upgrade-banner .banner-btn-secondary {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
    }
    #upgrade-banner .banner-btn-secondary:hover {
      border-color: var(--text-main);
      color: var(--text-main);
    }

    /* Toast Notifications */
    .toast {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--panel-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 0.9rem;
      opacity: 0;
      transition: all 0.3s;
      z-index: 1001;
    }
    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .toast-error {
      border-color: #f87171;
      color: #f87171;
    }
    .toast-warning {
      border-color: #fbbf24;
      color: #fbbf24;
    }
    .toast-success {
      border-color: #34d399;
      color: #34d399;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
  <script src="https://unpkg.com/force-graph"></script>
</head>
<body>
  <div id="breadcrumbs" class="panel">
    <button class="nav-btn" id="btn-back" onclick="goBack()" disabled title="Go back (Alt+Left)">&#8592;</button>
    <button class="nav-btn" id="btn-forward" onclick="goForward()" disabled title="Go forward (Alt+Right)">&#8594;</button>
    <div class="breadcrumb-trail" id="breadcrumb-trail"></div>
  </div>

  <div id="controls" class="panel">
    <div class="search-wrapper">
      <input type="text" id="search" placeholder="Search nodes... (/)" oninput="searchNode(this.value)">
    </div>
    <div class="legend-title">Filter by Node Type</div>
    <div class="legend-grid" id="legend"></div>

    <div class="filter-section">
      <div class="legend-title">Filter by Edge Type</div>
      <div class="legend-grid" id="edge-legend"></div>
    </div>

    <div class="ghost-controls" id="ghost-controls">
      <div class="legend-title">Ghost Nodes</div>
      <label class="toggle-item">
        <input type="checkbox" id="show-ghosts" checked onchange="toggleGhosts()">
        <span>Show unresolved links</span>
      </label>
      <div class="threshold-control" id="threshold-container">
        <span>Min refs:</span>
        <input type="range" id="ghost-threshold" min="1" max="10" value="1"
               oninput="updateGhostThreshold(this.value)">
        <span class="threshold-val" id="threshold-val">1</span>
      </div>
      <div class="ghost-count" id="ghost-count"></div>
    </div>

    <div class="heat-controls" id="heat-controls">
      <div class="legend-title">Heat Vision</div>
      <label class="toggle-item">
        <input type="checkbox" id="heat-toggle" onchange="toggleHeat()">
        <span>Show recency</span>
      </label>
      <div class="threshold-control">
        <span>Window:</span>
        <input type="range" id="heat-window-slider" min="7" max="180" value="30"
               oninput="updateHeatWindow(this.value)">
        <span class="threshold-val" id="heat-window-val">30 days</span>
      </div>
      <label class="toggle-item" id="heat-auto-label">
        <input type="checkbox" id="heat-auto" checked onchange="toggleHeatAuto()">
        <span>Auto (vault activity)</span>
      </label>
      <div class="heat-legend" id="heat-legend" style="display: none;">
        <span class="heat-legend-label" id="heat-legend-cold">>= 30d</span>
        <div class="heat-legend-bar"></div>
        <span class="heat-legend-label">now</span>
      </div>
    </div>

    <div class="constellation-section">
      <div class="legend-title">Constellations</div>
      <button class="save-constellation-btn" onclick="showSaveConstellationDialog()">
        Save Current View
      </button>
      <div class="constellation-name" id="constellation-name"></div>
    </div>

    <div class="shortcuts-hint">
      <kbd>/</kbd> Search &nbsp; <kbd>Esc</kbd> Close<br>
      <kbd>Alt+&#8592;</kbd> Back &nbsp; <kbd>Alt+&#8594;</kbd> Forward
    </div>
  </div>

  <div id="graph"></div>

  <div id="sidebar" class="panel">
    <div class="node-header">
      <h2 class="node-title" id="sb-title"></h2>
      <span class="node-badge" id="sb-type"></span>
    </div>
    <div id="sb-content" class="meta-grid"></div>
    <div id="sb-connections" class="connections-section"></div>
  </div>

  <div id="path-panel" class="panel">
    <div class="path-header">
      <span class="path-title" id="path-title">Paths</span>
      <button class="path-close-btn" onclick="closePathPanel()">&times;</button>
    </div>
    <div class="path-selector" id="path-selector"></div>
    <label class="path-show-all">
      <input type="checkbox" id="path-show-all" onchange="toggleShowAllPaths()">
      <span>Show all paths</span>
    </label>
  </div>

  <!-- Backlog Panel -->
  <div id="backlog-panel" class="panel backlog-panel">
    <div class="backlog-header" onclick="toggleBacklog()">
      <span class="backlog-toggle">&#9660;</span>
      <span class="legend-title">Unresolved (<span id="backlog-count">0</span>)</span>
      <select id="backlog-sort" class="backlog-sort" onclick="event.stopPropagation()" onchange="setBacklogSort(this.value)">
        <option value="importance">Importance</option>
        <option value="refs">Most referenced</option>
        <option value="recent">Most recent</option>
        <option value="alpha">Alphabetical</option>
      </select>
    </div>
    <div class="backlog-content">
      <div class="backlog-search">
        <input type="text" placeholder="Filter..." oninput="filterBacklog(this.value)">
      </div>
      <div id="backlog-list" class="backlog-list"></div>
    </div>
  </div>

  <!-- Create Panel Modal -->
  <div id="create-panel" class="create-panel">
    <div class="create-panel-inner panel">
      <div class="create-panel-header">
        <span class="legend-title">Create Note</span>
        <button class="path-close-btn" onclick="hideCreatePanel()">&times;</button>
      </div>
      <div class="create-panel-body">
        <label class="create-field">
          <span>Title</span>
          <input type="text" id="create-title" placeholder="Note title">
        </label>
        <label class="create-field">
          <span>Folder</span>
          <select id="create-folder"></select>
        </label>
      </div>
      <div class="create-panel-footer">
        <button class="create-cancel-btn" onclick="hideCreatePanel()">Cancel</button>
        <button class="create-submit-btn" onclick="submitCreate()">Create</button>
      </div>
    </div>
  </div>

  <!-- Upgrade Banner (first-run) -->
  <div id="upgrade-banner">
    <h3>New: Focus-first view</h3>
    <p>Suggestion edges (mentions, pending wormholes) are now hidden by default for a cleaner graph. Toggle <strong>Classic mode</strong> in the Status panel to see all edges.</p>
    <div class="banner-actions">
      <button class="banner-btn banner-btn-secondary" onclick="dismissUpgradeBanner()">Got it</button>
      <button class="banner-btn banner-btn-primary" onclick="switchToClassicFromBanner()">Switch to Classic</button>
    </div>
  </div>

  <!-- Health Status Panel -->
  <div id="status-panel" class="panel">
    <div class="panel-header" onclick="toggleStatusPanel()">
      <span id="status-header-text">Status</span>
      <span id="status-toggle-icon">▼</span>
    </div>
    <div class="panel-content">
      <div class="status-row">
        <span class="status-label">Mode</span>
        <span id="status-mode" class="status-value"></span>
      </div>
      <div class="status-row">
        <span class="status-label">Nodes</span>
        <span id="status-nodes" class="status-value"></span>
      </div>
      <div class="status-row">
        <span class="status-label">Edges</span>
        <span id="status-edges" class="status-value"></span>
      </div>
      <div class="status-row">
        <span class="status-label">Embeddings</span>
        <span id="status-embeddings" class="status-value"></span>
      </div>
      <div class="status-row">
        <span class="status-label">Wormholes</span>
        <span id="status-wormholes" class="status-value"></span>
      </div>
      <div class="mode-toggle">
        <button id="mode-focus-btn" class="mode-btn" onclick="setVisualizationMode('focus')">Focus</button>
        <button id="mode-classic-btn" class="mode-btn" onclick="setVisualizationMode('classic')">Classic</button>
      </div>
      <span class="help-link">Run <code>zs doctor</code> for details</span>
    </div>
  </div>

  <!-- WebSocket Status Indicator -->
  <div id="ws-status" class="ws-status disconnected" title="Disconnected"></div>

  <script>
    const data = ${JSON.stringify(graphData)};
    const typeColors = ${JSON.stringify(nodeTypeColors)};
    const edgeStyles = ${JSON.stringify(edgeStyles)};
    const loadedConstellation = ${constellationState};
    const pathData = ${pathDataJson};
    const wsConfig = ${wsConfigJson};
    const statusData = ${statusDataJson};

    // Status panel state
    let statusPanelExpanded = false;

    function toggleStatusPanel() {
      const panel = document.getElementById('status-panel');
      const icon = document.getElementById('status-toggle-icon');
      statusPanelExpanded = !statusPanelExpanded;
      panel.classList.toggle('expanded', statusPanelExpanded);
      icon.textContent = statusPanelExpanded ? '▲' : '▼';
    }

    function updateStatusPanel() {
      if (!statusData) {
        document.getElementById('status-panel').style.display = 'none';
        return;
      }

      // Mode
      document.getElementById('status-mode').textContent = statusData.visualization.mode;

      // Nodes/Edges
      document.getElementById('status-nodes').textContent = statusData.index.nodeCount;
      const { A, B, C } = statusData.index.edgesByLayer;
      const hiddenCount = statusData.visualization.totalEdgeCount - statusData.visualization.filteredEdgeCount;
      document.getElementById('status-edges').innerHTML =
        statusData.visualization.mode === 'focus' && hiddenCount > 0
          ? \`\${statusData.visualization.filteredEdgeCount} <span style="color:var(--text-muted)">(\${hiddenCount} hidden)</span>\`
          : statusData.index.edgeCount;

      // Embeddings
      const embEl = document.getElementById('status-embeddings');
      const embLevel = statusData.embeddings.level;
      const embPct = statusData.embeddings.coverage.toFixed(0);
      const badgeClass = embLevel === 'ok' ? 'badge-ok' : embLevel === 'warn' ? 'badge-warn' : 'badge-fail';
      embEl.innerHTML = \`<span class="status-badge \${badgeClass}">\${embLevel.toUpperCase()} \${embPct}%</span>\`;

      // Wormholes
      const whEl = document.getElementById('status-wormholes');
      if (statusData.wormholes.enabled) {
        whEl.innerHTML = \`<span style="color:#34d399">\${statusData.wormholes.count} edges</span>\`;
      } else {
        whEl.innerHTML = \`<span style="color:#fbbf24">disabled</span>\`;
      }

      // Mode buttons
      document.getElementById('mode-focus-btn').classList.toggle('active', statusData.visualization.mode === 'focus');
      document.getElementById('mode-classic-btn').classList.toggle('active', statusData.visualization.mode === 'classic');

      // Header badge
      const headerText = document.getElementById('status-header-text');
      if (embLevel === 'fail') {
        headerText.innerHTML = 'Status <span class="status-badge badge-fail">!</span>';
      } else if (embLevel === 'warn') {
        headerText.innerHTML = 'Status <span class="status-badge badge-warn">!</span>';
      } else {
        headerText.textContent = 'Status';
      }
    }

    function setVisualizationMode(mode) {
      // Note: This just updates UI state. The actual mode switch requires
      // re-running the visualize command with different config.
      // Show a toast indicating how to switch modes
      showToast(\`To switch to \${mode} mode, update config: visualization.mode: "\${mode}"\`, 'info', 5000);
    }

    // Initialize status panel on load
    setTimeout(updateStatusPanel, 100);

    // Upgrade banner logic
    const UPGRADE_BANNER_KEY = 'zs-upgrade-banner-dismissed';
    const CURRENT_VERSION = statusData ? statusData.version : '0.4.1';

    function shouldShowUpgradeBanner() {
      if (!statusData) return false;
      if (statusData.visualization.mode !== 'focus') return false;

      const dismissed = localStorage.getItem(UPGRADE_BANNER_KEY);
      if (!dismissed) return true;

      // Check if dismissed for older version
      try {
        const { version } = JSON.parse(dismissed);
        // Simple version comparison - show if current is newer
        return version !== CURRENT_VERSION;
      } catch {
        return true;
      }
    }

    function dismissUpgradeBanner() {
      localStorage.setItem(UPGRADE_BANNER_KEY, JSON.stringify({
        version: CURRENT_VERSION,
        dismissedAt: new Date().toISOString()
      }));
      document.getElementById('upgrade-banner').classList.remove('show');
    }

    function switchToClassicFromBanner() {
      dismissUpgradeBanner();
      showToast('To switch to Classic mode: edit .zettelscript/config.yaml → visualization.mode: "classic"', 'info', 6000);
    }

    // Show upgrade banner if conditions met
    setTimeout(() => {
      if (shouldShowUpgradeBanner()) {
        document.getElementById('upgrade-banner').classList.add('show');
      }
    }, 500);

    // Pre-compute adjacency index for O(1) lookups
    const adjacency = {};
    const nodeMap = {};
    const ghostIdMap = {}; // Track ghost -> new node ID mappings
    data.nodes.forEach(n => {
      nodeMap[n.id] = n;
      adjacency[n.id] = { outgoing: [], incoming: [] };
    });
    data.links.forEach(link => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source;
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
      if (adjacency[srcId]) adjacency[srcId].outgoing.push({ nodeId: tgtId, type: link.type, link });
      if (adjacency[tgtId]) adjacency[tgtId].incoming.push({ nodeId: srcId, type: link.type, link });
    });

    // State
    const hiddenTypes = new Set();
    const hiddenEdgeTypes = new Set();
    const highlightNodes = new Set();
    const highlightLinks = new Set();
    let hoverNode = null;
    let selectedNode = null;
    let showGhosts = true;
    let ghostThreshold = 1;

    // Navigation history
    const navHistory = [];
    let navIndex = -1;

    // WebSocket state
    let ws = null;
    let wsSessionNonce = null;
    let wsConnected = false;
    let wsReconnectAttempts = 0;
    const wsMaxReconnectAttempts = 10;
    let wsPatchSeq = 0;
    const pendingCreates = new Set();

    // ========================================================================
    // Heat Vision State & Functions
    // ========================================================================

    const MS_PER_DAY = 86400000;
    const HEAT_STORAGE_KEYS = {
      enabled: 'zs-heat-enabled',
      autoMode: 'zs-heat-auto',
      manualWindow: 'zs-heat-window',
    };

    let heatEnabled = false;
    let heatAutoMode = true;
    let heatManualWindowDays = 30;
    let computedWindowDays = 30;

    function loadHeatSettings() {
      heatEnabled = localStorage.getItem(HEAT_STORAGE_KEYS.enabled) === 'true';
      heatAutoMode = localStorage.getItem(HEAT_STORAGE_KEYS.autoMode) !== 'false';

      const parsed = parseInt(localStorage.getItem(HEAT_STORAGE_KEYS.manualWindow) || '', 10);
      heatManualWindowDays = (Number.isNaN(parsed) || parsed < 7 || parsed > 180) ? 30 : parsed;
    }

    function saveHeatSettings() {
      localStorage.setItem(HEAT_STORAGE_KEYS.enabled, String(heatEnabled));
      localStorage.setItem(HEAT_STORAGE_KEYS.autoMode, String(heatAutoMode));
      localStorage.setItem(HEAT_STORAGE_KEYS.manualWindow, String(heatManualWindowDays));
    }

    function getEffectiveWindow() {
      return heatAutoMode ? computedWindowDays : heatManualWindowDays;
    }

    function computeAutoWindow(nodes) {
      const now = Date.now();
      const ages = nodes
        .filter(n => n.updatedAtMs && !n.isGhost)
        .map(n => Math.max(0, (now - n.updatedAtMs) / MS_PER_DAY))
        .sort((a, b) => a - b);

      if (ages.length < 10) return 30;

      const idx = Math.floor((ages.length - 1) * 0.85);
      const p85Value = ages[idx];

      return Math.round(Math.min(Math.max(p85Value, 7), 180));
    }

    function computeHeat(nodes, windowDays) {
      const now = Date.now();

      for (const node of nodes) {
        if (!node.updatedAtMs || node.isGhost) {
          node.heat = 0;
          continue;
        }
        const ageDays = Math.max(0, (now - node.updatedAtMs) / MS_PER_DAY);
        node.heat = 1 - Math.min(Math.max(ageDays / windowDays, 0), 1);
      }
    }

    function recomputeHeatAndRedraw() {
      if (heatEnabled) {
        computeHeat(data.nodes, getEffectiveWindow());
      }
      if (Graph) Graph.refresh();
    }

    function initHeatVision() {
      loadHeatSettings();

      // Compute auto window on load (for UI display), even if heat is disabled
      if (heatAutoMode) {
        computedWindowDays = computeAutoWindow(data.nodes);
      }

      // Only compute heat values if enabled
      if (heatEnabled) {
        computeHeat(data.nodes, getEffectiveWindow());
      }

      updateHeatUI();
    }

    function toggleHeat() {
      heatEnabled = document.getElementById('heat-toggle').checked;
      saveHeatSettings();

      if (heatEnabled && !data.nodes.some(n => n.heat !== undefined && n.heat > 0)) {
        computeHeat(data.nodes, getEffectiveWindow());
      }

      updateHeatUI();
      recomputeHeatAndRedraw();
    }

    function updateHeatWindow(val) {
      heatManualWindowDays = parseInt(val, 10);
      document.getElementById('heat-window-val').innerText = val + ' days';
      saveHeatSettings();
      recomputeHeatAndRedraw();
    }

    function toggleHeatAuto() {
      heatAutoMode = document.getElementById('heat-auto').checked;

      if (heatAutoMode) {
        computedWindowDays = computeAutoWindow(data.nodes);
        document.getElementById('heat-window-slider').value = computedWindowDays;
        document.getElementById('heat-window-val').innerText = computedWindowDays + ' days';
      } else {
        document.getElementById('heat-window-slider').value = heatManualWindowDays;
        document.getElementById('heat-window-val').innerText = heatManualWindowDays + ' days';
      }

      saveHeatSettings();
      updateHeatUI();
      recomputeHeatAndRedraw();
    }

    function updateHeatUI() {
      const toggle = document.getElementById('heat-toggle');
      const slider = document.getElementById('heat-window-slider');
      const autoCheckbox = document.getElementById('heat-auto');
      const autoLabel = document.getElementById('heat-auto-label');
      const sliderVal = document.getElementById('heat-window-val');

      if (toggle) toggle.checked = heatEnabled;
      if (autoCheckbox) autoCheckbox.checked = heatAutoMode;

      const effectiveWindow = getEffectiveWindow();
      if (slider) {
        slider.disabled = !heatEnabled || heatAutoMode;
        slider.value = effectiveWindow;
      }
      if (sliderVal) {
        sliderVal.innerText = effectiveWindow + ' days';
      }
      if (autoCheckbox) {
        autoCheckbox.disabled = !heatEnabled;
      }
      if (autoLabel) {
        autoLabel.style.opacity = heatEnabled ? '1' : '0.5';
      }

      // Update legend
      updateHeatLegend();
    }

    function updateHeatLegend() {
      const legend = document.getElementById('heat-legend');
      if (!legend) return;

      if (!heatEnabled) {
        legend.style.display = 'none';
        return;
      }

      legend.style.display = 'flex';
      const windowLabel = document.getElementById('heat-legend-cold');
      if (windowLabel) {
        windowLabel.innerText = '>= ' + getEffectiveWindow() + 'd';
      }
    }

    // Ghost node functions
    function toggleGhosts() {
      showGhosts = document.getElementById('show-ghosts').checked;
      updateGhostCount();
      updateGraphVisibility();
    }

    function updateGhostThreshold(val) {
      ghostThreshold = parseInt(val, 10);
      document.getElementById('threshold-val').innerText = val;
      updateGhostCount();
      updateGraphVisibility();
    }

    function updateGhostCount() {
      const ghostNodes = data.nodes.filter(n => n.isGhost);
      const visibleGhosts = ghostNodes.filter(n => showGhosts && (n.referenceCount || 1) >= ghostThreshold);
      const countEl = document.getElementById('ghost-count');
      if (ghostNodes.length === 0) {
        document.getElementById('ghost-controls').style.display = 'none';
      } else {
        countEl.innerText = \`Showing \${visibleGhosts.length} of \${ghostNodes.length} ghost nodes\`;
      }
    }

    function isGhostVisible(node) {
      if (!node.isGhost) return true;
      return showGhosts && (node.referenceCount || 1) >= ghostThreshold;
    }

    // Path highlighting state
    let selectedPathIndex = 0;
    let showAllPaths = false;
    const pathNodes = new Set();
    const pathLinks = new Set();
    const pathNodeOrder = new Map(); // nodeId -> order number in selected path

    // Path highlighting functions
    function initPathPanel() {
      if (!pathData || !pathData.paths || pathData.paths.length === 0) return;

      const panel = document.getElementById('path-panel');
      const title = document.getElementById('path-title');
      const selector = document.getElementById('path-selector');

      panel.classList.add('active');
      title.innerText = \`\${pathData.fromLabel} → \${pathData.toLabel}\`;

      // Build path options
      let html = '';
      pathData.paths.forEach((p, i) => {
        const route = p.path.map(id => {
          const node = nodeMap[id];
          return node ? node.name : id.slice(0, 8);
        });
        const shortRoute = route.length > 4
          ? route[0] + ' → ... → ' + route[route.length - 1]
          : route.join(' → ');

        html += \`
          <div class="path-option \${i === 0 ? 'selected' : ''}" onclick="selectPath(\${i})" data-index="\${i}">
            <div class="path-option-num">\${i + 1}</div>
            <div class="path-option-info">
              <div class="path-option-route">\${shortRoute}</div>
              <div class="path-option-meta">\${p.hopCount} hops • score \${p.score.toFixed(1)}</div>
            </div>
          </div>\`;
      });
      selector.innerHTML = html;

      // Select first path
      selectPath(0);
    }

    function selectPath(index) {
      selectedPathIndex = index;

      // Update UI
      document.querySelectorAll('.path-option').forEach((el, i) => {
        el.classList.toggle('selected', i === index);
      });

      updatePathHighlight();
    }

    function toggleShowAllPaths() {
      showAllPaths = document.getElementById('path-show-all').checked;
      updatePathHighlight();
    }

    function closePathPanel() {
      const panel = document.getElementById('path-panel');
      panel.classList.remove('active');
      pathNodes.clear();
      pathLinks.clear();
      pathNodeOrder.clear();
      updateGraphVisibility();
    }

    function updatePathHighlight() {
      pathNodes.clear();
      pathLinks.clear();
      pathNodeOrder.clear();

      if (!pathData || !pathData.paths || pathData.paths.length === 0) return;

      if (showAllPaths) {
        // Highlight all paths
        pathData.paths.forEach((p, pathIdx) => {
          p.path.forEach((nodeId, nodeIdx) => {
            pathNodes.add(nodeId);
            if (pathIdx === selectedPathIndex) {
              pathNodeOrder.set(nodeId, nodeIdx + 1);
            }
          });
          // Add edges
          for (let i = 0; i < p.path.length - 1; i++) {
            pathLinks.add(\`\${p.path[i]}->\${p.path[i+1]}\`);
          }
        });
      } else {
        // Highlight only selected path
        const p = pathData.paths[selectedPathIndex];
        if (p) {
          p.path.forEach((nodeId, nodeIdx) => {
            pathNodes.add(nodeId);
            pathNodeOrder.set(nodeId, nodeIdx + 1);
          });
          for (let i = 0; i < p.path.length - 1; i++) {
            pathLinks.add(\`\${p.path[i]}->\${p.path[i+1]}\`);
          }
        }
      }

      // Pin path nodes to prevent layout wiggle
      data.nodes.forEach(n => {
        if (pathNodes.has(n.id)) {
          n.fx = n.x;
          n.fy = n.y;
        } else {
          n.fx = undefined;
          n.fy = undefined;
        }
      });

      updateGraphVisibility();
    }

    function isOnPath(nodeId) {
      return pathNodes.has(nodeId);
    }

    function isPathEdge(srcId, tgtId) {
      return pathLinks.has(\`\${srcId}->\${tgtId}\`) || pathLinks.has(\`\${tgtId}->\${srcId}\`);
    }

    // Navigation functions
    function navigateToNode(nodeId, addToHistory = true) {
      const node = nodeMap[nodeId];
      if (!node) return;

      // Unhide type if hidden
      if (hiddenTypes.has(node.type)) {
        hiddenTypes.delete(node.type);
        updateLegendUI();
      }

      // Update history
      if (addToHistory) {
        // Remove any forward history
        navHistory.splice(navIndex + 1);
        navHistory.push(nodeId);
        navIndex = navHistory.length - 1;
      }

      selectedNode = node;
      showSidebar(node);
      updateBreadcrumbs();

      // Center and zoom
      Graph.centerAt(node.x, node.y, 1000);
      Graph.zoom(6, 2000);

      // Highlight
      highlightNodes.clear();
      highlightLinks.clear();
      highlightNodes.add(node);
      data.links.forEach(link => {
        const srcId = typeof link.source === 'object' ? link.source.id : link.source;
        const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
        if (srcId === node.id || tgtId === node.id) {
          highlightLinks.add(link);
          highlightNodes.add(nodeMap[srcId]);
          highlightNodes.add(nodeMap[tgtId]);
        }
      });
      hoverNode = node;
      updateGraphVisibility();
    }

    function goBack() {
      if (navIndex > 0) {
        navIndex--;
        navigateToNode(navHistory[navIndex], false);
      }
    }

    function goForward() {
      if (navIndex < navHistory.length - 1) {
        navIndex++;
        navigateToNode(navHistory[navIndex], false);
      }
    }

    function updateBreadcrumbs() {
      const panel = document.getElementById('breadcrumbs');
      const trail = document.getElementById('breadcrumb-trail');
      const btnBack = document.getElementById('btn-back');
      const btnForward = document.getElementById('btn-forward');

      if (navHistory.length === 0) {
        panel.classList.remove('active');
        return;
      }

      panel.classList.add('active');
      btnBack.disabled = navIndex <= 0;
      btnForward.disabled = navIndex >= navHistory.length - 1;

      // Show last 5 items max
      const startIdx = Math.max(0, navHistory.length - 5);
      const visibleHistory = navHistory.slice(startIdx);
      const offset = startIdx;

      trail.innerHTML = visibleHistory.map((nodeId, i) => {
        const node = nodeMap[nodeId];
        const actualIndex = i + offset;
        const isCurrent = actualIndex === navIndex;
        const name = node ? node.name : nodeId;
        return \`<span class="breadcrumb-item \${isCurrent ? 'current' : ''}" onclick="jumpToBreadcrumb(\${actualIndex})">\${name}</span>\` +
          (i < visibleHistory.length - 1 ? '<span class="breadcrumb-sep">/</span>' : '');
      }).join('');
    }

    function jumpToBreadcrumb(index) {
      if (index >= 0 && index < navHistory.length) {
        navIndex = index;
        navigateToNode(navHistory[index], false);
      }
    }

    // Node type filter
    function toggleType(type) {
      if (hiddenTypes.has(type)) {
        hiddenTypes.delete(type);
      } else {
        hiddenTypes.add(type);
      }
      updateGraphVisibility();
      updateLegendUI();
    }

    // Edge type filter
    function toggleEdgeType(type) {
      if (hiddenEdgeTypes.has(type)) {
        hiddenEdgeTypes.delete(type);
      } else {
        hiddenEdgeTypes.add(type);
      }
      updateGraphVisibility();
      updateEdgeLegendUI();
    }

    function updateLegendUI() {
      const legend = document.getElementById('legend');
      legend.innerHTML = '';
      Object.entries(typeColors).forEach(([type, color]) => {
        // Skip ghost type - it has its own controls
        if (type === 'ghost') return;
        const item = document.createElement('div');
        item.className = \`legend-item \${hiddenTypes.has(type) ? 'hidden' : ''}\`;
        item.onclick = () => toggleType(type);
        item.innerHTML = \`<div class="legend-dot" style="background: \${color}; color: \${color}"></div>\${type.charAt(0).toUpperCase() + type.slice(1)}\`;
        legend.appendChild(item);
      });
    }

    function updateEdgeLegendUI() {
      const legend = document.getElementById('edge-legend');
      legend.innerHTML = '';
      Object.entries(edgeStyles).forEach(([type, style]) => {
        // Skip ghost_ref - it's controlled by ghost toggle
        if (type === 'ghost_ref') return;
        const item = document.createElement('div');
        item.className = \`edge-legend-item \${hiddenEdgeTypes.has(type) ? 'hidden' : ''}\`;
        item.onclick = () => toggleEdgeType(type);
        const dashStyle = style.dash.length > 0
          ? \`background: repeating-linear-gradient(90deg, \${style.color} 0px, \${style.color} \${style.dash[0]}px, transparent \${style.dash[0]}px, transparent \${style.dash[0] + style.dash[1]}px)\`
          : \`background: \${style.color}\`;
        item.innerHTML = \`<div class="edge-line" style="\${dashStyle}"></div>\${style.label}\`;
        legend.appendChild(item);
      });
    }

    // Initial Legend
    updateLegendUI();
    updateEdgeLegendUI();
    updateGhostCount();

    // Apply loaded constellation state
    function applyConstellationState() {
      if (!loadedConstellation) return;

      // Apply hidden node types
      if (loadedConstellation.hiddenNodeTypes) {
        loadedConstellation.hiddenNodeTypes.forEach(t => hiddenTypes.add(t));
      }

      // Apply hidden edge types
      if (loadedConstellation.hiddenEdgeTypes) {
        loadedConstellation.hiddenEdgeTypes.forEach(t => hiddenEdgeTypes.add(t));
      }

      // Apply ghost settings
      showGhosts = loadedConstellation.showGhosts !== false;
      ghostThreshold = loadedConstellation.ghostThreshold || 1;
      document.getElementById('show-ghosts').checked = showGhosts;
      document.getElementById('ghost-threshold').value = ghostThreshold;
      document.getElementById('threshold-val').innerText = ghostThreshold;

      // Update UI
      updateLegendUI();
      updateEdgeLegendUI();
      updateGhostCount();

      // Show constellation name
      const nameEl = document.getElementById('constellation-name');
      nameEl.innerHTML = \`Viewing: <strong>\${loadedConstellation.name}</strong>\`;
    }

    // Apply constellation state before graph init
    applyConstellationState();

    // Save constellation dialog
    function showSaveConstellationDialog() {
      const name = prompt('Enter constellation name:');
      if (!name || !name.trim()) return;

      const state = {
        hiddenNodeTypes: Array.from(hiddenTypes),
        hiddenEdgeTypes: Array.from(hiddenEdgeTypes),
        showGhosts,
        ghostThreshold,
        cameraX: Graph ? Graph.centerAt().x : null,
        cameraY: Graph ? Graph.centerAt().y : null,
        cameraZoom: Graph ? Graph.zoom() : null,
      };

      const stateJson = JSON.stringify(state);
      const cmd = \`zs constellation save "\${name.trim()}" --state '\${stateJson}'\`;

      // Try to copy to clipboard
      navigator.clipboard.writeText(cmd).then(() => {
        alert(\`Run this command to save the constellation:\\n\\n\${cmd}\\n\\n(Copied to clipboard)\`);
      }).catch(() => {
        alert(\`Run this command to save the constellation:\\n\\n\${cmd}\`);
      });
    }

    // ========================================================================
    // WebSocket Client for Live Updates
    // ========================================================================

    function initWebSocket() {
      if (!wsConfig || !wsConfig.enabled) return;

      const url = \`ws://127.0.0.1:\${wsConfig.port}\`;
      console.log('[WS] Connecting to', url);

      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[WS] Connected, sending hello');
        ws.send(JSON.stringify({
          type: 'hello',
          protocolVersion: wsConfig.protocolVersion,
          atlasVersion: '2.0.0',
          token: wsConfig.token,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleWsMessage(msg);
        } catch (e) {
          console.error('[WS] Failed to parse message:', e);
        }
      };

      ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        wsConnected = false;
        wsSessionNonce = null;
        updateConnectionStatus('disconnected');

        // Attempt reconnect with exponential backoff
        if (wsReconnectAttempts < wsMaxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts), 30000);
          wsReconnectAttempts++;
          console.log(\`[WS] Reconnecting in \${delay}ms (attempt \${wsReconnectAttempts})\`);
          setTimeout(initWebSocket, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    }

    function handleWsMessage(msg) {
      switch (msg.type) {
        case 'hello_ok':
          wsConnected = true;
          wsSessionNonce = msg.sessionNonce;
          wsReconnectAttempts = 0;
          console.log('[WS] Authenticated, features:', msg.features);
          updateConnectionStatus('connected');
          break;

        case 'hello_error':
          console.error('[WS] Auth failed:', msg.error);
          updateConnectionStatus('error');
          break;

        case 'create_ack':
          handleCreateAck(msg);
          break;

        case 'patch':
          handlePatch(msg);
          break;

        case 'error':
          handleWsError(msg);
          break;

        case 'sync_response':
          handleSyncResponse(msg);
          break;

        case 'pong':
          // Heartbeat response
          break;

        default:
          console.log('[WS] Unknown message type:', msg.type);
      }
    }

    function handleCreateAck(msg) {
      if (msg.status === 'pending') {
        console.log('[WS] Create pending for ghost:', msg.ghostId);
      } else if (msg.status === 'success') {
        console.log('[WS] Create succeeded for ghost:', msg.ghostId);
        pendingCreates.delete(msg.ghostId);
        hideCreatePanel();
      } else if (msg.status === 'error') {
        console.error('[WS] Create failed for ghost:', msg.ghostId);
        pendingCreates.delete(msg.ghostId);
        revertGhostState(msg.ghostId);
      }
      updateBacklogRow(msg.ghostId);
    }

    function handlePatch(msg) {
      // Ignore out-of-order patches
      if (msg.patchSeq <= wsPatchSeq) {
        console.log('[WS] Ignoring out-of-order patch:', msg.patchSeq, 'current:', wsPatchSeq);
        return;
      }
      wsPatchSeq = msg.patchSeq;

      console.log('[WS] Applying patch:', msg.patchSeq, 'ops:', msg.ops.length);

      for (const op of msg.ops) {
        switch (op.op) {
          case 'node_replace':
            applyNodeReplace(op);
            break;
          case 'edge_replace':
            applyEdgeReplace(op);
            break;
          case 'node_remove':
            applyNodeRemove(op);
            break;
          case 'edge_remove':
            applyEdgeRemove(op);
            break;
        }
      }

      // Refresh the graph visualization
      updateGraphVisibility();
      updateBacklog();
    }

    function applyNodeReplace(op) {
      const ghostNode = nodeMap[op.ghostId];
      if (!ghostNode) {
        console.warn('[WS] Ghost node not found:', op.ghostId);
        return;
      }

      // Store mapping
      ghostIdMap[op.ghostId] = op.newNodeId;

      // Preserve position
      const x = ghostNode.x;
      const y = ghostNode.y;
      const vx = ghostNode.vx || 0;
      const vy = ghostNode.vy || 0;

      // Update node in place
      ghostNode.id = op.newNodeId;
      ghostNode.name = op.label;
      ghostNode.path = op.filePath;
      ghostNode.type = op.type;
      ghostNode.color = typeColors[op.type] || '#94a3b8';
      ghostNode.isGhost = false;
      ghostNode.isPending = false;
      delete ghostNode.sourceIds;
      delete ghostNode.referenceCount;
      delete ghostNode.mostRecentRef;

      // Set updatedAtMs for heat vision (newly created nodes are "hot")
      ghostNode.updatedAtMs = op.updatedAt ? new Date(op.updatedAt).getTime() : Date.now();

      // Compute heat for this node if heat vision is enabled
      if (heatEnabled) {
        const ageDays = Math.max(0, (Date.now() - ghostNode.updatedAtMs) / MS_PER_DAY);
        const windowDays = getEffectiveWindow();
        ghostNode.heat = 1 - Math.min(Math.max(ageDays / windowDays, 0), 1);
      }

      // Preserve position
      ghostNode.x = x;
      ghostNode.y = y;
      ghostNode.vx = vx;
      ghostNode.vy = vy;

      // Update nodeMap with new ID
      delete nodeMap[op.ghostId];
      nodeMap[op.newNodeId] = ghostNode;

      // Update adjacency
      adjacency[op.newNodeId] = adjacency[op.ghostId] || { outgoing: [], incoming: [] };
      delete adjacency[op.ghostId];

      // Unpin after brief delay
      setTimeout(() => {
        if (ghostNode.fx != null) {
          ghostNode.fx = undefined;
          ghostNode.fy = undefined;
        }
      }, 800);

      console.log('[WS] Replaced ghost', op.ghostId, 'with node', op.newNodeId, op.linkedExisting ? '(linked to existing)' : '');
    }

    function applyEdgeReplace(op) {
      // Find and update edge
      for (const link of data.links) {
        const srcId = typeof link.source === 'object' ? link.source.id : link.source;
        const tgtId = typeof link.target === 'object' ? link.target.id : link.target;

        // Check if this is a ghost_ref edge that should be replaced
        if (link.type === 'ghost_ref' || link.type === 'pending_link') {
          const oldTargetId = ghostIdMap[tgtId] ? tgtId : null;
          if (oldTargetId && srcId === op.fromId) {
            link.type = op.type;
            link.edgeId = op.newEdgeId;
            if (typeof link.target === 'object') {
              link.target.id = op.toId;
            } else {
              link.target = op.toId;
            }
            console.log('[WS] Replaced edge from', op.fromId, 'to', op.toId);
            break;
          }
        }
      }
    }

    function applyNodeRemove(op) {
      const node = nodeMap[op.nodeId];
      if (node) {
        const idx = data.nodes.indexOf(node);
        if (idx !== -1) {
          data.nodes.splice(idx, 1);
        }
        delete nodeMap[op.nodeId];
        delete adjacency[op.nodeId];
      }
    }

    function applyEdgeRemove(op) {
      const idx = data.links.findIndex(l => l.edgeId === op.edgeId);
      if (idx !== -1) {
        data.links.splice(idx, 1);
      }
    }

    function handleWsError(msg) {
      console.error('[WS] Server error:', msg.message);
      if (msg.ghostId) {
        pendingCreates.delete(msg.ghostId);
        revertGhostState(msg.ghostId);
        showToast('Error: ' + msg.message, 'error');
      }
    }

    function handleSyncResponse(msg) {
      console.log('[WS] Sync response:', msg.unresolvedList.length, 'ghosts,', msg.recentCreations.length, 'recent');
      // Update ghost ID mappings from recent creations
      for (const creation of msg.recentCreations) {
        ghostIdMap[creation.ghostId] = creation.newNodeId;
      }
      updateBacklog();
    }

    function updateConnectionStatus(status) {
      const indicator = document.getElementById('ws-status');
      if (!indicator) return;

      indicator.className = 'ws-status ' + status;
      indicator.title = status === 'connected' ? 'Live updates active'
        : status === 'disconnected' ? 'Disconnected - reconnecting...'
        : 'Connection error';
    }

    function revertGhostState(ghostId) {
      const node = nodeMap[ghostId];
      if (!node) return;

      // Revert styling
      node.isPending = false;

      // Unpin
      node.fx = undefined;
      node.fy = undefined;

      // Revert edges
      for (const link of data.links) {
        const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
        if (tgtId === ghostId && link.type === 'pending_link') {
          link.type = 'ghost_ref';
        }
      }

      updateGraphVisibility();
    }

    // ========================================================================
    // Create Panel UI
    // ========================================================================

    let createPanelTarget = null;

    function showCreatePanel(ghostId, title, sourceNodeId) {
      if (!wsConnected) {
        showToast('Not connected to server', 'error');
        return;
      }

      if (pendingCreates.has(ghostId)) {
        showToast('Create already in progress', 'warning');
        return;
      }

      createPanelTarget = { ghostId, title, sourceNodeId };

      const panel = document.getElementById('create-panel');
      const titleInput = document.getElementById('create-title');
      const folderSelect = document.getElementById('create-folder');

      titleInput.value = title;

      // Populate folder dropdown (could be enhanced with actual folders)
      folderSelect.innerHTML = '<option value="">Root</option>';

      panel.classList.add('active');
      titleInput.focus();
      titleInput.select();
    }

    function hideCreatePanel() {
      const panel = document.getElementById('create-panel');
      panel.classList.remove('active');
      createPanelTarget = null;
    }

    function submitCreate() {
      if (!createPanelTarget || !wsConnected) return;

      const titleInput = document.getElementById('create-title');
      const folderSelect = document.getElementById('create-folder');

      const title = titleInput.value.trim();
      if (!title) {
        showToast('Title is required', 'warning');
        return;
      }

      const { ghostId, sourceNodeId } = createPanelTarget;

      // Mark as pending
      pendingCreates.add(ghostId);
      const node = nodeMap[ghostId];
      if (node) {
        node.isPending = true;
        // Pin at current position
        node.fx = node.x;
        node.fy = node.y;
      }

      // Update edge types to pending
      for (const link of data.links) {
        const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
        if (tgtId === ghostId && link.type === 'ghost_ref') {
          link.type = 'pending_link';
        }
      }

      updateGraphVisibility();
      updateBacklogRow(ghostId);

      // Send create request
      ws.send(JSON.stringify({
        type: 'create_from_ghost',
        sessionNonce: wsSessionNonce,
        ghostId: ghostId,
        title: title,
        sourceNodeId: sourceNodeId,
        targetFolder: folderSelect.value || undefined,
      }));

      hideCreatePanel();
    }

    function showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = 'toast toast-' + type;
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    // ========================================================================
    // Sidebar Backlog
    // ========================================================================

    let backlogExpanded = localStorage.getItem('backlogExpanded') !== 'false';
    let backlogSort = localStorage.getItem('backlogSort') || 'importance';
    let backlogSearch = '';

    function initBacklog() {
      const backlogPanel = document.getElementById('backlog-panel');
      if (!backlogPanel) return;

      // Restore state
      if (backlogExpanded) {
        backlogPanel.classList.add('expanded');
      }

      updateBacklog();
    }

    function toggleBacklog() {
      const backlogPanel = document.getElementById('backlog-panel');
      backlogExpanded = !backlogExpanded;
      backlogPanel.classList.toggle('expanded', backlogExpanded);
      localStorage.setItem('backlogExpanded', backlogExpanded);
    }

    function setBacklogSort(sort) {
      backlogSort = sort;
      localStorage.setItem('backlogSort', sort);
      updateBacklog();
    }

    function filterBacklog(query) {
      backlogSearch = query.toLowerCase();
      updateBacklog();
    }

    function updateBacklog() {
      const list = document.getElementById('backlog-list');
      const countEl = document.getElementById('backlog-count');
      if (!list) return;

      // Get ghost nodes
      let ghosts = data.nodes.filter(n => n.isGhost && !ghostIdMap[n.id]);

      // Apply search filter
      if (backlogSearch) {
        ghosts = ghosts.filter(g => g.name.toLowerCase().includes(backlogSearch));
      }

      // Sort
      ghosts = sortGhosts(ghosts, backlogSort);

      // Update count
      if (countEl) {
        countEl.textContent = ghosts.length;
      }

      // Render list
      list.innerHTML = ghosts.slice(0, 10).map(ghost => {
        const isPending = pendingCreates.has(ghost.id);
        const recency = formatRecency(ghost.mostRecentRef || ghost.metadata?.firstSeen);
        const refCount = ghost.referenceCount || (ghost.sourceIds ? ghost.sourceIds.length : 0);

        return \`
          <div class="backlog-row \${isPending ? 'pending' : ''}" data-ghost-id="\${ghost.id}">
            <div class="backlog-row-main" onclick="focusGhost('\${ghost.id}')">
              <span class="backlog-title">\${escapeHtml(ghost.name)}</span>
              <span class="backlog-badges">
                <span class="backlog-ref-count">\${refCount}</span>
                <span class="backlog-recency">\${recency}</span>
              </span>
            </div>
            <button class="backlog-create-btn" onclick="event.stopPropagation(); showCreatePanelFromBacklog('\${ghost.id}')"
                    \${isPending || !wsConnected ? 'disabled' : ''}>
              \${isPending ? '...' : '+'}
            </button>
          </div>
        \`;
      }).join('');

      if (ghosts.length > 10) {
        list.innerHTML += \`<div class="backlog-more">and \${ghosts.length - 10} more...</div>\`;
      }
    }

    function updateBacklogRow(ghostId) {
      const row = document.querySelector(\`.backlog-row[data-ghost-id="\${ghostId}"]\`);
      if (!row) return;

      const isPending = pendingCreates.has(ghostId);
      row.classList.toggle('pending', isPending);

      const btn = row.querySelector('.backlog-create-btn');
      if (btn) {
        btn.disabled = isPending || !wsConnected;
        btn.textContent = isPending ? '...' : '+';
      }
    }

    function sortGhosts(ghosts, sortBy) {
      switch (sortBy) {
        case 'importance':
          return ghosts.sort((a, b) => calculateImportance(b) - calculateImportance(a));
        case 'refs':
          return ghosts.sort((a, b) => (b.referenceCount || 0) - (a.referenceCount || 0));
        case 'recent':
          return ghosts.sort((a, b) => {
            const aTime = a.mostRecentRef || a.metadata?.firstSeen || '';
            const bTime = b.mostRecentRef || b.metadata?.firstSeen || '';
            return bTime.localeCompare(aTime);
          });
        case 'alpha':
          return ghosts.sort((a, b) => a.name.localeCompare(b.name));
        default:
          return ghosts;
      }
    }

    function calculateImportance(ghost) {
      const refCount = ghost.referenceCount || (ghost.sourceIds ? ghost.sourceIds.length : 0);
      const refWeight = 2 * Math.log2(1 + refCount);
      const recencyScore = getRecencyScore(ghost.mostRecentRef || ghost.metadata?.firstSeen);
      return refWeight + recencyScore;
    }

    function getRecencyScore(timestamp) {
      if (!timestamp) return 0;
      const now = Date.now();
      const then = new Date(timestamp).getTime();
      const daysDiff = (now - then) / (1000 * 60 * 60 * 24);

      if (daysDiff <= 7) return 1.0;
      if (daysDiff <= 30) return 0.5;
      if (daysDiff <= 90) return 0.25;
      return 0.1;
    }

    function formatRecency(timestamp) {
      if (!timestamp) return '';
      const now = Date.now();
      const then = new Date(timestamp).getTime();
      const diff = now - then;

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      const weeks = Math.floor(days / 7);
      const months = Math.floor(days / 30);

      if (minutes < 60) return minutes + 'm';
      if (hours < 24) return hours + 'h';
      if (days < 7) return days + 'd';
      if (weeks < 4) return weeks + 'w';
      return months + 'mo';
    }

    function focusGhost(ghostId) {
      const node = nodeMap[ghostId];
      if (!node) return;

      navigateToNode(ghostId);
    }

    function showCreatePanelFromBacklog(ghostId) {
      const node = nodeMap[ghostId];
      if (!node) return;

      const sourceId = node.sourceIds && node.sourceIds[0] ? node.sourceIds[0] : '';
      showCreatePanel(ghostId, node.name, sourceId);
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    // ========================================================================
    // Centroid Anchoring for Ghost Nodes
    // ========================================================================

    function initGhostCentroids() {
      // Set initial positions for ghost nodes at centroid of their referencers
      for (const node of data.nodes) {
        if (!node.isGhost) continue;

        const refs = (node.sourceIds || [])
          .map(id => nodeMap[id])
          .filter(n => n && n.x != null);

        if (refs.length > 0) {
          node.x = refs.reduce((sum, n) => sum + n.x, 0) / refs.length;
          node.y = refs.reduce((sum, n) => sum + n.y, 0) / refs.length;
        }

        // Cache referencer nodes
        node._refNodes = refs;
      }
    }

    function centroidTetherForce(strength = 0.03) {
      let ghosts = [];

      function force(alpha) {
        const effectiveAlpha = Math.max(alpha, 0.1);

        for (const ghost of ghosts) {
          // Skip if pinned
          if (ghost.fx != null || ghost.fy != null) continue;

          // Use cached refs
          const refs = ghost._refNodes;
          if (!refs || refs.length === 0) continue;

          // Calculate centroid
          let cx = 0, cy = 0, validCount = 0;
          for (const ref of refs) {
            if (ref.x != null && ref.y != null) {
              cx += ref.x;
              cy += ref.y;
              validCount++;
            }
          }
          if (validCount === 0) continue;
          cx /= validCount;
          cy /= validCount;

          // Clamp delta to prevent slingshots
          const maxDelta = 50;
          const dx = Math.max(-maxDelta, Math.min(maxDelta, cx - ghost.x));
          const dy = Math.max(-maxDelta, Math.min(maxDelta, cy - ghost.y));

          ghost.vx = (ghost.vx || 0) + dx * strength * effectiveAlpha;
          ghost.vy = (ghost.vy || 0) + dy * strength * effectiveAlpha;
        }
      }

      force.initialize = (nodes) => {
        ghosts = nodes.filter(n => n.isGhost);
        // Cache referencer node references
        for (const ghost of ghosts) {
          ghost._refNodes = (ghost.sourceIds || [])
            .map(id => nodeMap[id])
            .filter(n => n != null);
        }
      };

      return force;
    }

    function refreshGhostRefCache() {
      for (const node of data.nodes) {
        if (!node.isGhost) continue;
        node._refNodes = (node.sourceIds || [])
          .map(id => nodeMap[id])
          .filter(n => n != null);
      }
    }

    // Init Graph
    const Graph = ForceGraph()
      (document.getElementById('graph'))
      .graphData(data)
      .nodeId('id')
      .nodeLabel('name')
      .nodeColor(node => hiddenTypes.has(node.type) ? 'rgba(0,0,0,0)' : node.color)
      .nodeVal('val')
      .nodeRelSize(4)
      .linkWidth(link => highlightLinks.has(link) ? 3 : 1.5)
      .linkDirectionalParticles(link => highlightLinks.has(link) ? 4 : 0)
      .linkDirectionalParticleWidth(3)
      .linkLineDash(link => {
        const style = edgeStyles[link.type];
        return style ? style.dash : [];
      })
      .linkColor(link => {
        if (hiddenEdgeTypes.has(link.type)) return 'rgba(0,0,0,0)';
        if (highlightLinks.has(link)) return '#38bdf8';
        const style = edgeStyles[link.type];
        return style ? style.color : 'rgba(148, 163, 184, 0.3)';
      })
      .backgroundColor('#0f172a')
      .onNodeHover(node => {
        if ((!node && !highlightNodes.size) || (node && hoverNode === node)) return;

        highlightNodes.clear();
        highlightLinks.clear();
        if (node) {
          highlightNodes.add(node);
          data.links.forEach(link => {
            const srcId = typeof link.source === 'object' ? link.source.id : link.source;
            const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
            if (srcId === node.id || tgtId === node.id) {
              highlightLinks.add(link);
              highlightNodes.add(nodeMap[srcId]);
              highlightNodes.add(nodeMap[tgtId]);
            }
          });
        }

        hoverNode = node || null;
        updateGraphVisibility();
      })
      .onNodeClick(node => {
        navigateToNode(node.id);
      })
      .onBackgroundClick(() => {
        document.getElementById('sidebar').classList.remove('active');
        selectedNode = null;
        highlightNodes.clear();
        highlightLinks.clear();
        hoverNode = null;
        updateGraphVisibility();
      });

    // Physics
    Graph.d3Force('charge').strength(-150);
    Graph.d3Force('link').distance(70);

    // Add centroid tether force for ghost nodes
    Graph.d3Force('centroidTether', centroidTetherForce(0.03));

    // Initialize ghost node positions at centroid before simulation starts
    initGhostCentroids();

    // Apply camera position from constellation after graph initializes
    if (loadedConstellation && loadedConstellation.cameraX != null && loadedConstellation.cameraY != null) {
      setTimeout(() => {
        Graph.centerAt(loadedConstellation.cameraX, loadedConstellation.cameraY, 0);
        if (loadedConstellation.cameraZoom) {
          Graph.zoom(loadedConstellation.cameraZoom, 0);
        }
      }, 500);
    }

    // Initialize path panel if path data is available
    setTimeout(() => {
      initPathPanel();
    }, 100);

    // Initialize WebSocket connection if enabled
    setTimeout(() => {
      initWebSocket();
      initBacklog();
      initHeatVision();
    }, 200);

    function updateGraphVisibility() {
      const pathMode = pathNodes.size > 0;

      Graph.nodeCanvasObject((node, ctx, globalScale) => {
        // Skip hidden types
        if (hiddenTypes.has(node.type)) return;
        // Skip invisible ghost nodes
        if (node.isGhost && !isGhostVisible(node)) return;

        const label = node.name;
        const fontSize = 12/globalScale;
        const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node);
        const isSelected = selectedNode && selectedNode.id === node.id;
        const nodeOnPath = isOnPath(node.id);
        const radius = Math.sqrt(node.val) * 4;

        // In path mode, fade non-path nodes
        const pathFade = pathMode && !nodeOnPath;

        // Ghost node rendering
        if (node.isGhost) {
          const isPending = node.isPending || pendingCreates.has(node.id);

          // Pulse effect for pending state
          let pulseScale = 1;
          if (isPending) {
            const pulse = (Date.now() % 1000) / 1000;
            pulseScale = 1 + 0.1 * Math.sin(pulse * Math.PI * 2);
          }

          const effectiveRadius = radius * pulseScale;

          // Dashed outline circle (or solid cyan for pending)
          if (isPending) {
            ctx.setLineDash([]);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2 / globalScale;
          } else {
            ctx.setLineDash([4 / globalScale, 4 / globalScale]);
            ctx.strokeStyle = pathFade ? 'rgba(100, 116, 139, 0.3)' : '#64748b';
            ctx.lineWidth = 1.5 / globalScale;
          }
          ctx.beginPath();
          ctx.arc(node.x, node.y, effectiveRadius, 0, 2 * Math.PI);
          ctx.fillStyle = isPending
            ? 'rgba(56, 189, 248, 0.15)'
            : (pathFade
              ? 'rgba(148, 163, 184, 0.05)'
              : (isHighlighted ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)'));
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);

          // Icon in center (spinner for pending, + for normal)
          ctx.font = \`bold \${fontSize * 1.5}px Sans-Serif\`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (isPending) {
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('...', node.x, node.y);
          } else {
            ctx.fillStyle = pathFade
              ? 'rgba(148, 163, 184, 0.2)'
              : (isHighlighted ? 'rgba(148, 163, 184, 0.8)' : 'rgba(148, 163, 184, 0.5)');
            ctx.fillText('+', node.x, node.y);
          }

          // Selection ring
          if (hoverNode === node || isSelected) {
            ctx.setLineDash([]);
            ctx.strokeStyle = isSelected ? '#38bdf8' : '#94a3b8';
            ctx.lineWidth = (isSelected ? 3 : 2) / globalScale;
            ctx.beginPath();
            ctx.arc(node.x, node.y, effectiveRadius + 2 / globalScale, 0, 2 * Math.PI);
            ctx.stroke();
          }

          // Label for ghost nodes
          if (!pathFade && (globalScale > 2.5 || (isHighlighted && highlightNodes.size > 0))) {
            ctx.font = \`\${fontSize}px Sans-Serif\`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] - effectiveRadius - 2, bckgDimensions[0], bckgDimensions[1]);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isPending ? '#38bdf8' : (isHighlighted ? '#94a3b8' : 'rgba(148, 163, 184, 0.4)');
            ctx.fillText(label, node.x, node.y - bckgDimensions[1]/2 - effectiveRadius - 2);
          }
          return;
        }

        // Heat glow (drawn BEFORE node fill so it appears as halo behind)
        // Skip if: heat disabled, node is highlighted (path/selection takes precedence), heat below threshold
        const shouldShowHeat = heatEnabled && node.heat > 0.05 && !nodeOnPath && !isSelected && !(hoverNode === node);
        if (shouldShowHeat) {
          const glowRadius = radius + (node.heat * 8);
          const glowAlpha = node.heat * 0.4;

          const gradient = ctx.createRadialGradient(
            node.x, node.y, radius,
            node.x, node.y, glowRadius
          );
          gradient.addColorStop(0, \`rgba(255, 100, 50, \${glowAlpha})\`);
          gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(node.x, node.y, glowRadius, 0, 2 * Math.PI);
          ctx.fill();
        }

        // Regular node rendering
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);

        if (pathFade) {
          ctx.fillStyle = convertHexToRGBA(node.color, 0.15);
        } else if (nodeOnPath) {
          ctx.fillStyle = node.color;
        } else {
          ctx.fillStyle = isHighlighted ? node.color : convertHexToRGBA(node.color, 0.2);
        }
        ctx.fill();

        // Gold outline for path nodes
        if (nodeOnPath) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3 / globalScale;
          ctx.stroke();
        }

        // Ring for selected/hovered (on top of path outline)
        if (hoverNode === node || isSelected) {
          ctx.strokeStyle = isSelected ? '#38bdf8' : '#fff';
          ctx.lineWidth = (isSelected ? 3 : 2) / globalScale;
          ctx.stroke();
        }

        // Path order number
        if (nodeOnPath && pathNodeOrder.has(node.id)) {
          const orderNum = pathNodeOrder.get(node.id);
          const numSize = fontSize * 0.8;
          ctx.font = \`bold \${numSize}px Sans-Serif\`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Circle background for number
          const numRadius = numSize * 0.7;
          ctx.beginPath();
          ctx.arc(node.x + radius + numRadius, node.y - radius - numRadius, numRadius, 0, 2 * Math.PI);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();

          ctx.fillStyle = '#000';
          ctx.fillText(orderNum, node.x + radius + numRadius, node.y - radius - numRadius);
        }

        // Text Label
        const showLabel = !pathFade && (globalScale > 2.5 || nodeOnPath || (isHighlighted && highlightNodes.size > 0));
        if (showLabel) {
          ctx.font = \`\${fontSize}px Sans-Serif\`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
          ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] - radius - 2, bckgDimensions[0], bckgDimensions[1]);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = nodeOnPath ? '#fbbf24' : (isHighlighted ? '#fff' : 'rgba(255,255,255,0.4)');
          ctx.fillText(label, node.x, node.y - bckgDimensions[1]/2 - radius - 2);
        }
      });

      Graph.linkVisibility(link => {
        const srcNode = typeof link.source === 'object' ? link.source : nodeMap[link.source];
        const tgtNode = typeof link.target === 'object' ? link.target : nodeMap[link.target];
        if (!srcNode || !tgtNode) return false;
        if (hiddenTypes.has(srcNode.type) || hiddenTypes.has(tgtNode.type)) return false;
        if (hiddenEdgeTypes.has(link.type)) return false;
        // Hide ghost reference edges when ghost is not visible
        if (link.type === 'ghost_ref') {
          const ghostNode = srcNode.isGhost ? srcNode : tgtNode;
          if (!isGhostVisible(ghostNode)) return false;
        }
        return true;
      });

      // Update link colors and widths for path mode
      Graph.linkColor(link => {
        if (hiddenEdgeTypes.has(link.type)) return 'rgba(0,0,0,0)';
        if (highlightLinks.has(link)) return '#38bdf8';

        const srcId = typeof link.source === 'object' ? link.source.id : link.source;
        const tgtId = typeof link.target === 'object' ? link.target.id : link.target;

        if (pathMode) {
          if (isPathEdge(srcId, tgtId)) {
            return '#fbbf24'; // Gold for path edges
          }
          return 'rgba(148, 163, 184, 0.1)'; // Faded for non-path edges
        }

        const style = edgeStyles[link.type];
        return style ? style.color : 'rgba(148, 163, 184, 0.3)';
      });

      Graph.linkWidth(link => {
        if (highlightLinks.has(link)) return 3;

        const srcId = typeof link.source === 'object' ? link.source.id : link.source;
        const tgtId = typeof link.target === 'object' ? link.target.id : link.target;

        if (pathMode && isPathEdge(srcId, tgtId)) {
          return 3;
        }
        return 1.5;
      });
    }

    function buildConnectionsUI(node) {
      const adj = adjacency[node.id];
      if (!adj) return '';

      // Group connections by edge type
      const outgoingByType = {};
      const incomingByType = {};

      adj.outgoing.forEach(conn => {
        const targetNode = nodeMap[conn.nodeId];
        if (!targetNode) return;
        if (!outgoingByType[conn.type]) outgoingByType[conn.type] = [];
        outgoingByType[conn.type].push(targetNode);
      });

      adj.incoming.forEach(conn => {
        const sourceNode = nodeMap[conn.nodeId];
        if (!sourceNode) return;
        if (!incomingByType[conn.type]) incomingByType[conn.type] = [];
        incomingByType[conn.type].push(sourceNode);
      });

      const totalConnections = adj.outgoing.length + adj.incoming.length;
      if (totalConnections === 0) return '';

      let html = '<div class="connections-title">Connections</div>';

      // Helper to render a connection group
      const renderGroup = (label, icon, nodes, edgeType) => {
        if (!nodes || nodes.length === 0) return '';
        const style = edgeStyles[edgeType] || { color: '#94a3b8', label: edgeType };
        return \`
          <div class="connection-group">
            <div class="connection-group-header">
              <span class="connection-group-icon">\${icon}</span>
              <span>\${label}</span>
              <span class="connection-group-count">\${nodes.length}</span>
            </div>
            \${nodes.map(n => \`
              <div class="connected-node" onclick="navigateToNode('\${n.id}')">
                <div class="connected-node-dot" style="background: \${n.color}"></div>
                <span class="connected-node-name">\${n.name}</span>
                <span class="connected-node-type">\${n.type}</span>
              </div>
            \`).join('')}
          </div>
        \`;
      };

      // Outgoing connections (Links to)
      Object.entries(outgoingByType).forEach(([type, nodes]) => {
        const style = edgeStyles[type] || { label: type };
        html += renderGroup(style.label + ' (out)', '→', nodes, type);
      });

      // Incoming connections (Backlinks from)
      Object.entries(incomingByType).forEach(([type, nodes]) => {
        const style = edgeStyles[type] || { label: type };
        html += renderGroup(style.label + ' (in)', '←', nodes, type);
      });

      return html;
    }

    function showSidebar(node) {
      const sb = document.getElementById('sidebar');
      document.getElementById('sb-title').innerText = node.name;

      const typeEl = document.getElementById('sb-type');
      typeEl.innerText = node.isGhost ? 'ghost (unresolved)' : node.type;
      typeEl.style.backgroundColor = node.color;

      const content = document.getElementById('sb-content');
      let html = '';

      // Ghost node sidebar
      if (node.isGhost) {
        const refCount = node.referenceCount || (node.sourceIds ? node.sourceIds.length : 0);
        html = \`
          <div class="meta-item">
            <span class="meta-key">Status</span>
            <span class="meta-val">Unresolved wikilink</span>
          </div>
          <div class="meta-item">
            <span class="meta-key">References</span>
            <span class="meta-val">\${refCount} note\${refCount === 1 ? '' : 's'} link to this</span>
          </div>
          <div class="ghost-action">
            <button class="create-note-btn" onclick="createNoteFromGhost('\${node.name.replace(/'/g, "\\\\'")}')">
              + Create Note
            </button>
            <div class="ghost-info">
              Click to create a new note with this title. The link will be resolved automatically on the next index.
            </div>
          </div>\`;

        content.innerHTML = html;

        // Show which nodes reference this ghost
        const connectionsEl = document.getElementById('sb-connections');
        if (node.sourceIds && node.sourceIds.length > 0) {
          let connHtml = '<div class="connections-title">Referenced By</div>';
          connHtml += '<div class="connection-group">';
          node.sourceIds.forEach(srcId => {
            const srcNode = nodeMap[srcId];
            if (srcNode) {
              connHtml += \`
                <div class="connected-node" onclick="navigateToNode('\${srcNode.id}')">
                  <div class="connected-node-dot" style="background: \${srcNode.color}"></div>
                  <span class="connected-node-name">\${srcNode.name}</span>
                  <span class="connected-node-type">\${srcNode.type}</span>
                </div>\`;
            }
          });
          connHtml += '</div>';
          connectionsEl.innerHTML = connHtml;
        } else {
          connectionsEl.innerHTML = '';
        }

        sb.classList.add('active');
        return;
      }

      // Regular node sidebar
      html = \`
        <div class="meta-item">
          <span class="meta-key">Location</span>
          <span class="meta-val"><code>\${node.path}</code></span>
        </div>\`;

      // Add "Last updated" when heat vision is enabled
      if (heatEnabled && node.updatedAtMs) {
        const ageDays = Math.max(0, (Date.now() - node.updatedAtMs) / MS_PER_DAY);
        const updatedDate = new Date(node.updatedAtMs);
        const dateStr = updatedDate.toISOString().split('T')[0];
        let relativeStr;
        if (ageDays < 1) {
          relativeStr = 'today';
        } else if (ageDays < 2) {
          relativeStr = '1 day ago';
        } else if (ageDays < 30) {
          relativeStr = Math.floor(ageDays) + ' days ago';
        } else if (ageDays < 60) {
          relativeStr = '1 month ago';
        } else if (ageDays < 365) {
          relativeStr = Math.floor(ageDays / 30) + ' months ago';
        } else {
          relativeStr = Math.floor(ageDays / 365) + ' year' + (ageDays >= 730 ? 's' : '') + ' ago';
        }
        html += \`
          <div class="meta-item">
            <span class="meta-key">Last updated</span>
            <span class="meta-val">\${relativeStr} (\${dateStr})</span>
          </div>\`;
      }

      if (node.metadata) {
        const priority = ['id', 'tags', 'aliases', 'role'];
        const sortedKeys = Object.keys(node.metadata).sort((a, b) => {
          const ai = priority.indexOf(a);
          const bi = priority.indexOf(b);
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return a.localeCompare(b);
        });

        sortedKeys.forEach(key => {
          if (['title', 'type'].includes(key)) return;
          const val = node.metadata[key];
          if (!val && val !== 0) return;

          let displayVal = val;
          if (Array.isArray(val)) {
            displayVal = val.map(v => \`<code>\${v}</code>\`).join(' ');
          } else if (typeof val === 'object') {
            displayVal = JSON.stringify(val);
          }

          html += \`
            <div class="meta-item">
              <span class="meta-key">\${key.replace(/_/g, ' ')}</span>
              <span class="meta-val">\${displayVal}</span>
            </div>\`;
        });
      }

      content.innerHTML = html;

      // Build connections UI
      const connectionsEl = document.getElementById('sb-connections');
      connectionsEl.innerHTML = buildConnectionsUI(node);

      sb.classList.add('active');
    }

    // Ghost node creation handler
    function createNoteFromGhost(ghostName) {
      // Find the ghost node
      const ghostNode = data.nodes.find(n => n.isGhost && n.name === ghostName);
      if (!ghostNode) {
        console.error('Ghost node not found:', ghostName);
        return;
      }

      // If WebSocket connected, use live creation
      if (wsConnected) {
        const sourceId = ghostNode.sourceIds && ghostNode.sourceIds[0] ? ghostNode.sourceIds[0] : '';
        showCreatePanel(ghostNode.id, ghostName, sourceId);
      } else {
        // Fallback to CLI command
        alert('Note creation requested for: ' + ghostName + '\\n\\nTo create this note, run:\\n  zs create "' + ghostName + '"\\n\\nOr create the file manually in your vault.');
      }
    }

    function searchNode(query) {
      if (!query) return;
      const node = data.nodes.find(n => n.name.toLowerCase().includes(query.toLowerCase()));
      if (node) {
        navigateToNode(node.id);
      }
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Alt+Left: Go back
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      }
      // Alt+Right: Go forward
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goForward();
      }
      // Escape: Close sidebar
      if (e.key === 'Escape') {
        document.getElementById('sidebar').classList.remove('active');
        selectedNode = null;
        highlightNodes.clear();
        highlightLinks.clear();
        hoverNode = null;
        updateGraphVisibility();
      }
      // /: Focus search
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('search').focus();
      }
    });

    // Helper
    function convertHexToRGBA(hex, opacity) {
      let c;
      if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
          c= hex.substring(1).split('');
          if(c.length== 3){
              c= [c[0], c[0], c[1], c[1], c[2], c[2]];
          }
          c= '0x'+c.join('');
          return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+opacity+')';
      }
      return hex;
    }
  </script>
</body>
</html>
  `;
}

export const visualizeCommand = new Command('visualize')
  .alias('viz')
  .description('Visualize the knowledge graph in the browser')
  .option('-o, --output <path>', 'Custom output path for the HTML file')
  .option('--no-open', 'Do not open the browser automatically')
  .option('-l, --live', 'Enable live updates via WebSocket (allows creating notes from ghosts)')
  .option('-c, --constellation <name>', 'Load a saved constellation view')
  .option('--list-constellations', 'List all saved constellations')
  .option('--path-from <node>', 'Starting node for path highlighting (title or path)')
  .option('--path-to <node>', 'Ending node for path highlighting (title or path)')
  .option('--path-k <n>', 'Number of paths to compute', '3')
  .action(
    async (options: {
      output?: string;
      open?: boolean;
      live?: boolean;
      constellation?: string;
      listConstellations?: boolean;
      pathFrom?: string;
      pathTo?: string;
      pathK?: string;
    }) => {
      try {
        const ctx = await initContext();

        // Handle --list-constellations
        if (options.listConstellations) {
          const constellations = await ctx.constellationRepository.findAll();
          if (constellations.length === 0) {
            console.log('No constellations saved yet.');
            console.log('\nTo save one, open the visualizer and click "Save Current View".');
          } else {
            const rows = constellations.map((c) => [
              c.name,
              c.description || '-',
              new Date(c.updatedAt).toLocaleDateString(),
            ]);
            printTable(['Name', 'Description', 'Updated'], rows);
          }
          ctx.connectionManager.close();
          return;
        }

        // Load constellation if specified
        let constellation: Constellation | null = null;
        if (options.constellation) {
          constellation = await ctx.constellationRepository.findByName(options.constellation);
          if (!constellation) {
            console.error(`Constellation "${options.constellation}" not found.`);
            console.log('\nAvailable constellations:');
            const all = await ctx.constellationRepository.findAll();
            if (all.length === 0) {
              console.log('  (none)');
            } else {
              all.forEach((c) => console.log(`  - ${c.name}`));
            }
            ctx.connectionManager.close();
            process.exit(1);
          }
          console.log(`Loading constellation "${constellation.name}"...`);
        }

        console.log('Generating graph data...');

        // 1. Fetch Data
        const nodes = await ctx.nodeRepository.findAll();
        const edges = await ctx.edgeRepository.findAll();
        const ghostNodeData = await ctx.unresolvedLinkRepository.getGhostNodesWithRecency();

        // 2. Calculate degree centrality
        const nodeWeights = new Map<string, number>();
        edges.forEach((e) => {
          nodeWeights.set(e.sourceId, (nodeWeights.get(e.sourceId) || 0) + 1);
          nodeWeights.set(e.targetId, (nodeWeights.get(e.targetId) || 0) + 1);
        });

        // 3. Prepare Graph Data Structure
        const graphNodes: GraphNode[] = nodes.map((n) => ({
          id: n.nodeId,
          name: n.title,
          type: n.type,
          val: Math.max(1, Math.min(10, (nodeWeights.get(n.nodeId) || 0) / 2)),
          color: typeColors[n.type] || '#94a3b8',
          path: n.path,
          metadata: n.metadata as Record<string, unknown>,
          updatedAtMs: n.updatedAt ? new Date(n.updatedAt).getTime() : undefined,
        }));

        // Filter edges based on visualization mode (focus vs classic)
        const vizMode = ctx.config.visualization.mode;
        const filteredEdges = edges.filter((e) =>
          shouldRenderEdge(e.edgeType as EdgeType, vizMode)
        );

        if (vizMode === 'focus' && edges.length !== filteredEdges.length) {
          console.log(
            `Focus mode: showing ${filteredEdges.length}/${edges.length} edges (Layer C edges hidden)`
          );
        }

        const graphLinks: GraphLink[] = filteredEdges.map((e) => ({
          source: e.sourceId,
          target: e.targetId,
          type: e.edgeType,
          strength: e.strength ?? 1.0,
          provenance: e.provenance,
        }));

        // 4. Add ghost nodes (unresolved links)
        const nodeIdSet = new Set(nodes.map((n) => n.nodeId));
        for (const ghost of ghostNodeData) {
          // Skip if target text is empty
          if (!ghost.targetText.trim()) continue;

          const ghostId = `ghost:${ghost.targetText}`;

          // Create ghost node
          graphNodes.push({
            id: ghostId,
            name: ghost.targetText,
            type: 'ghost',
            val: Math.max(1, Math.min(5, ghost.referenceCount)),
            color: typeColors['ghost'] ?? '#64748b',
            path: '',
            metadata: {
              referenceCount: ghost.referenceCount,
              firstSeen: ghost.firstSeen,
            },
            isGhost: true,
            sourceIds: ghost.sourceIds.filter((id) => nodeIdSet.has(id)),
            referenceCount: ghost.referenceCount,
            mostRecentRef: ghost.mostRecentRef,
          });

          // Create edges from source nodes to ghost
          for (const sourceId of ghost.sourceIds) {
            if (nodeIdSet.has(sourceId)) {
              graphLinks.push({
                source: sourceId,
                target: ghostId,
                type: 'ghost_ref',
                strength: 0.3,
                provenance: 'unresolved_link',
              });
            }
          }
        }

        const graphData: GraphData = {
          nodes: graphNodes,
          links: graphLinks,
        };

        if (ghostNodeData.length > 0) {
          console.log(`Found ${ghostNodeData.length} unresolved links (ghost nodes)`);
        }

        // 5. Compute paths if requested
        let computedPathData: PathData | null = null;
        if (options.pathFrom && options.pathTo) {
          console.log('Computing paths...');

          // Resolve from node
          let fromNode = await ctx.nodeRepository.findByPath(options.pathFrom);
          if (!fromNode) {
            const byTitle = await ctx.nodeRepository.findByTitle(options.pathFrom);
            fromNode = byTitle[0] ?? null;
          }
          if (!fromNode) {
            const byAlias = await ctx.nodeRepository.findByTitleOrAlias(options.pathFrom);
            fromNode = byAlias[0] ?? null;
          }

          // Resolve to node
          let toNode = await ctx.nodeRepository.findByPath(options.pathTo);
          if (!toNode) {
            const byTitle = await ctx.nodeRepository.findByTitle(options.pathTo);
            toNode = byTitle[0] ?? null;
          }
          if (!toNode) {
            const byAlias = await ctx.nodeRepository.findByTitleOrAlias(options.pathTo);
            toNode = byAlias[0] ?? null;
          }

          if (fromNode && toNode) {
            const k = parseInt(options.pathK || '3', 10);
            const { paths } = await ctx.graphEngine.findKShortestPaths(
              fromNode.nodeId,
              toNode.nodeId,
              { k, edgeTypes: ['explicit_link', 'sequence', 'causes', 'semantic'] }
            );

            if (paths.length > 0) {
              computedPathData = {
                paths: paths.map((p) => ({
                  path: p.path,
                  edges: p.edges,
                  hopCount: p.hopCount,
                  score: p.score,
                })),
                fromId: fromNode.nodeId,
                toId: toNode.nodeId,
                fromLabel: fromNode.title,
                toLabel: toNode.title,
              };
              console.log(
                `Found ${paths.length} path(s) from "${fromNode.title}" to "${toNode.title}"`
              );
            } else {
              console.log(`No paths found from "${fromNode.title}" to "${toNode.title}"`);
            }
          } else {
            if (!fromNode) console.error(`Could not find node: "${options.pathFrom}"`);
            if (!toNode) console.error(`Could not find node: "${options.pathTo}"`);
          }
        }

        // 6. Start WebSocket server if live mode enabled
        let wsConfig: WebSocketConfig | null = null;
        let wsServer: VisualizeServer | null = null;

        if (options.live) {
          console.log('Starting live update server...');
          const { server, info } = await createVisualizeServer(ctx, {
            onClose: () => {
              console.log('\nBrowser disconnected. Server stopped.');
              ctx.connectionManager.close();
              process.exit(0);
            },
          });
          wsServer = server;
          wsConfig = {
            enabled: true,
            port: info.port,
            token: info.token,
            protocolVersion: PROTOCOL_VERSION,
          };
          console.log(`Live updates enabled on port ${info.port}`);
        }

        // 7. Compute health stats for status panel
        const statusData = await computeDoctorStats(ctx);

        // 8. Generate HTML
        const htmlContent = generateVisualizationHtml(
          graphData,
          typeColors,
          constellation,
          computedPathData,
          wsConfig,
          statusData
        );

        // 9. Write Output
        const outputDir = options.output
          ? path.dirname(options.output)
          : getZettelScriptDir(ctx.vaultPath);

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = options.output || path.join(outputDir, 'graph.html');
        fs.writeFileSync(outputPath, htmlContent, 'utf-8');

        console.log(`\nGraph visualization generated at: ${outputPath}`);

        // 10. Open Browser
        if (options.open) {
          console.log('Opening in default browser...');
          await open(outputPath);
        }

        // 11. Keep process alive if live mode, otherwise close
        if (options.live && wsServer) {
          console.log('\nLive mode active. Press Ctrl+C to stop.');

          // Handle graceful shutdown
          const shutdown = async () => {
            console.log('\nShutting down...');
            if (wsServer) {
              await wsServer.stop();
            }
            ctx.connectionManager.close();
            process.exit(0);
          };

          process.on('SIGINT', shutdown);
          process.on('SIGTERM', shutdown);

          // Keep process alive
          await new Promise(() => {});
        } else {
          ctx.connectionManager.close();
        }
      } catch (error) {
        console.error('Visualization failed:', error);
        process.exit(1);
      }
    }
  );
