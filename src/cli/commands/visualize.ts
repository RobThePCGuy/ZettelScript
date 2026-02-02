import { Command } from 'commander';
import process from 'node:process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import open from 'open';
import { initContext, getZettelScriptDir } from '../utils.js';

// Node type colors (Modern Palette)
export const typeColors: Record<string, string> = {
  note: '#94a3b8',      // Slate 400
  scene: '#a78bfa',     // Violet 400
  character: '#34d399', // Emerald 400
  location: '#60a5fa',  // Blue 400
  object: '#fbbf24',    // Amber 400
  event: '#f87171',     // Red 400
  concept: '#f472b6',   // Pink 400
  moc: '#fb923c',       // Orange 400
  timeline: '#818cf8',  // Indigo 400
  draft: '#52525b',     // Zinc 600
};

// Edge type styling configuration
export const edgeStyles: Record<string, { color: string; dash: number[]; label: string }> = {
  explicit_link: { color: '#22d3ee', dash: [], label: 'Links to' },           // Cyan
  backlink: { color: '#a78bfa', dash: [5, 5], label: 'Backlinks' },           // Violet
  sequence: { color: '#34d399', dash: [], label: 'Sequence' },                 // Emerald
  hierarchy: { color: '#fbbf24', dash: [], label: 'Hierarchy' },               // Amber
  participation: { color: '#f472b6', dash: [], label: 'Participation' },       // Pink
  pov_visible_to: { color: '#60a5fa', dash: [3, 3], label: 'POV Visible' },   // Blue
  causes: { color: '#f87171', dash: [], label: 'Causes' },                     // Red
  setup_payoff: { color: '#fb923c', dash: [], label: 'Setup/Payoff' },        // Orange
  semantic: { color: '#94a3b8', dash: [2, 2], label: 'Semantic' },            // Gray
  mention: { color: '#2dd4bf', dash: [2, 2], label: 'Mention' },              // Teal
  alias: { color: '#818cf8', dash: [4, 2], label: 'Alias' },                  // Indigo
};

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  val: number;
  color: string;
  path: string;
  metadata: Record<string, unknown>;
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

export function generateVisualizationHtml(graphData: GraphData, nodeTypeColors: Record<string, string>): string {
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

  <script>
    const data = ${JSON.stringify(graphData)};
    const typeColors = ${JSON.stringify(nodeTypeColors)};
    const edgeStyles = ${JSON.stringify(edgeStyles)};

    // Pre-compute adjacency index for O(1) lookups
    const adjacency = {};
    const nodeMap = {};
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

    // Navigation history
    const navHistory = [];
    let navIndex = -1;

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

    function updateGraphVisibility() {
      Graph.nodeCanvasObject((node, ctx, globalScale) => {
        if (hiddenTypes.has(node.type)) return;

        const label = node.name;
        const fontSize = 12/globalScale;
        const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node);
        const isSelected = selectedNode && selectedNode.id === node.id;

        // Node circle
        const radius = Math.sqrt(node.val) * 4;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = isHighlighted ? node.color : convertHexToRGBA(node.color, 0.2);
        ctx.fill();

        // Ring for selected/hovered
        if (hoverNode === node || isSelected) {
          ctx.strokeStyle = isSelected ? '#38bdf8' : '#fff';
          ctx.lineWidth = (isSelected ? 3 : 2) / globalScale;
          ctx.stroke();
        }

        // Text Label (only if highlighted or zoomed in)
        if (globalScale > 2.5 || (isHighlighted && highlightNodes.size > 0)) {
          ctx.font = \`\${fontSize}px Sans-Serif\`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
          ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] - radius - 2, bckgDimensions[0], bckgDimensions[1]);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isHighlighted ? '#fff' : 'rgba(255,255,255,0.4)';
          ctx.fillText(label, node.x, node.y - bckgDimensions[1]/2 - radius - 2);
        }
      });

      Graph.linkVisibility(link => {
        const srcNode = typeof link.source === 'object' ? link.source : nodeMap[link.source];
        const tgtNode = typeof link.target === 'object' ? link.target : nodeMap[link.target];
        if (!srcNode || !tgtNode) return false;
        if (hiddenTypes.has(srcNode.type) || hiddenTypes.has(tgtNode.type)) return false;
        if (hiddenEdgeTypes.has(link.type)) return false;
        return true;
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
      typeEl.innerText = node.type;
      typeEl.style.backgroundColor = node.color;

      const content = document.getElementById('sb-content');
      let html = \`
        <div class="meta-item">
          <span class="meta-key">Location</span>
          <span class="meta-val"><code>\${node.path}</code></span>
        </div>\`;

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
  .action(async (options) => {
    try {
      const ctx = await initContext();
      console.log('Generating graph data...');

      // 1. Fetch Data
      const nodes = await ctx.nodeRepository.findAll();
      const edges = await ctx.edgeRepository.findAll();

      // 2. Calculate degree centrality
      const nodeWeights = new Map<string, number>();
      edges.forEach(e => {
        nodeWeights.set(e.sourceId, (nodeWeights.get(e.sourceId) || 0) + 1);
        nodeWeights.set(e.targetId, (nodeWeights.get(e.targetId) || 0) + 1);
      });

      // 3. Prepare Graph Data Structure
      const graphData: GraphData = {
        nodes: nodes.map(n => ({
          id: n.nodeId,
          name: n.title,
          type: n.type,
          val: Math.max(1, Math.min(10, (nodeWeights.get(n.nodeId) || 0) / 2)),
          color: typeColors[n.type] || '#94a3b8',
          path: n.path,
          metadata: n.metadata as Record<string, unknown>
        })),
        links: edges.map(e => ({
          source: e.sourceId,
          target: e.targetId,
          type: e.edgeType,
          strength: e.strength ?? 1.0,
          provenance: e.provenance
        }))
      };

      // 4. Generate HTML
      const htmlContent = generateVisualizationHtml(graphData, typeColors);

      // 5. Write Output
      const outputDir = options.output
        ? path.dirname(options.output)
        : getZettelScriptDir(ctx.vaultPath);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = options.output || path.join(outputDir, 'graph.html');
      fs.writeFileSync(outputPath, htmlContent, 'utf-8');

      console.log(`\nGraph visualization generated at: ${outputPath}`);

      // 6. Open Browser
      if (options.open) {
        console.log('Opening in default browser...');
        await open(outputPath);
      }

      ctx.connectionManager.close();
    } catch (error) {
      console.error('Visualization failed:', error);
      process.exit(1);
    }
  });
