# Heat Vision Design

## Overview

Nodes glow based on recency - recently updated nodes appear "hot" (warm glow), older nodes appear "cold" (no glow). This provides instant visual feedback on what areas of the vault are actively being worked on.

---

## Architecture & Data Flow

### Server-side changes
- Add `updatedAt` to the `GraphNode` interface and pass it through when building graph data
- No new database queries needed - `findAll()` already returns timestamps

### Client-side state
```javascript
// Heat Vision state
let heatEnabled = false;
let heatAutoMode = true;
let heatManualWindowDays = 30;
let computedWindowDays = 30;  // Auto-calculated value (derived, not persisted)
```

### Computation flow
1. On graph load, store `node.updatedAtMs` (parsed once) for each node
2. If Auto mode enabled: calculate 85th percentile of age distribution, clamp to [7, 180]
3. When heat enabled: for each node compute `heat = 1 - clamp(ageDays / windowDays, 0, 1)`
4. Heat drives glow radius/alpha in canvas rendering

### When things update
- Toggle heat on/off → compute heat values (if enabling), trigger repaint
- Slider change → recalculate heat values, trigger repaint
- Auto checkbox → if enabled, recompute window from distribution, recalculate heat
- WebSocket patch (new node) → compute that node's heat with current window, no global recompute

### Integration point
The existing `nodeCanvasObject` callback handles custom node rendering. Heat glow uses the same pattern but driven by `node.heat` instead of `isHighlighted`.

---

## UI Components

### Control Panel
Add to existing controls area (near ghost nodes toggle and type legend). Grouped as a collapsible "Heat Vision" section.

```
┌─ Heat Vision ──────────────────────────┐
│ [Toggle] Enable Heat Vision            │
│                                         │
│ Window: [====●========] 30 days         │
│         7d              180d            │
│                                         │
│ [✓] Auto (uses vault activity)         │
│     Currently: 47 days                  │
└─────────────────────────────────────────┘
```

### Behavior
- **Toggle**: Enables/disables heat rendering. When off, slider and auto are grayed out.
- **Slider**: 7-180 days, linear. Disabled when Auto is checked. Shows current value as label.
- **Auto checkbox**: When checked, slider becomes read-only and thumb shows computed value. "Currently: X days" displays the percentile result.
- When Auto is unchecked, slider reverts to last manual value (or 30 if never set).

### Heat Legend
Small gradient bar below controls:
```
Cold ▓▓▓▓▓▓▓▓▓▓ Hot
>= 30 days     now
```
Labels reflect active window (manual or auto), not slider max.

### Tooltip Enhancement
Node tooltip/sidebar adds: "Last updated: 3 days ago (2026-01-31)" when heat mode is on.
- Relative is what people read
- Absolute is what they trust when debugging

### Empty Vault
Show disabled toggle with tooltip "No nodes to visualize" rather than hiding.

---

## Heat Calculation

### Constants
```javascript
const MS_PER_DAY = 86400000;
```

### Compute Auto Window (85th Percentile)
```javascript
function computeAutoWindow(nodes) {
  const now = Date.now();
  const ages = nodes
    .filter(n => n.updatedAtMs && !n.isGhost)
    .map(n => Math.max(0, (now - n.updatedAtMs) / MS_PER_DAY))
    .sort((a, b) => a - b);

  if (ages.length < 10) return 30;  // Fallback for small vaults

  const idx = Math.floor((ages.length - 1) * 0.85);
  const p85Value = ages[idx];

  return Math.round(Math.min(Math.max(p85Value, 7), 180));  // Clamp [7, 180], round for display
}
```

### Compute Heat Values
```javascript
function computeHeat(nodes, windowDays) {
  const now = Date.now();

  for (const node of nodes) {
    if (!node.updatedAtMs || node.isGhost) {
      node.heat = 0;  // Cold for ghosts and unknown
      continue;
    }
    const ageDays = Math.max(0, (now - node.updatedAtMs) / MS_PER_DAY);
    node.heat = 1 - Math.min(Math.max(ageDays / windowDays, 0), 1);
  }
}

function getEffectiveWindow() {
  return heatAutoMode ? computedWindowDays : heatManualWindowDays;
}
```

---

## Rendering

### Glow Rendering (in nodeCanvasObject callback)
Draw glow BEFORE node fill (halo behind, not fog overlay):

```javascript
// Before drawing the base node circle...

if (heatEnabled && node.heat > 0.05 && !isHighlighted) {
  // Heat glow: radius and alpha scale with heat
  const glowRadius = radius + (node.heat * 8);  // Up to 8px extra
  const glowAlpha = node.heat * 0.4;            // Up to 0.4 opacity

  const gradient = ctx.createRadialGradient(
    node.x, node.y, radius,
    node.x, node.y, glowRadius
  );
  gradient.addColorStop(0, `rgba(255, 100, 50, ${glowAlpha})`);  // Warm orange
  gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(node.x, node.y, glowRadius, 0, 2 * Math.PI);
  ctx.fill();
}

// Then draw the base node circle...
```

### Color Tint (Optional, Subtle)
```javascript
// Optional: tint base fill slightly toward warm when hot
const tintStrength = heatEnabled ? node.heat * 0.15 : 0;
const baseColor = blendTowardWarm(node.color, tintStrength);
```

`blendTowardWarm` must fall back gracefully on unparseable colors.

### Performance Considerations
- Skip glow render below threshold (`node.heat < 0.05`)
- At far zoom levels, consider skipping gradients or using simpler rings
- Radial gradient per hot node per frame can be expensive on very large graphs

### Interaction with Highlights
- Heat is a background layer
- Selection/path highlight is foreground
- When a node is highlighted (search, path mode, selection), suppress heat glow to avoid visual mush

---

## State Management & Persistence

### localStorage Keys
```javascript
const STORAGE_KEYS = {
  heatEnabled: 'zs-heat-enabled',
  heatAutoMode: 'zs-heat-auto',
  heatManualWindow: 'zs-heat-window',
};
```

### Load on Init
```javascript
function loadHeatSettings() {
  heatEnabled = localStorage.getItem(STORAGE_KEYS.heatEnabled) === 'true';
  heatAutoMode = localStorage.getItem(STORAGE_KEYS.heatAutoMode) !== 'false';  // Default true

  const parsed = parseInt(localStorage.getItem(STORAGE_KEYS.heatManualWindow) || '');
  heatManualWindowDays = (Number.isNaN(parsed) || parsed < 7 || parsed > 180) ? 30 : parsed;
}
```

### Save on Change
```javascript
function saveHeatSettings() {
  localStorage.setItem(STORAGE_KEYS.heatEnabled, String(heatEnabled));
  localStorage.setItem(STORAGE_KEYS.heatAutoMode, String(heatAutoMode));
  localStorage.setItem(STORAGE_KEYS.heatManualWindow, String(heatManualWindowDays));
}
```

### State Transitions

| Action | Effect |
|--------|--------|
| Page load | Load settings, if Auto: compute window, if enabled: compute heat, render |
| Toggle heat on | Save, compute heat if not already, trigger repaint |
| Toggle heat off | Save, trigger repaint (glow disappears) |
| Slider change | Update `heatManualWindowDays`, save, recompute heat, repaint |
| Auto checked | Recompute window from percentile, save, recompute heat, repaint |
| Auto unchecked | Revert to `heatManualWindowDays`, save, recompute heat, repaint |
| WS patch (new node) | Set `node.updatedAtMs`, compute its heat with current window, no global recompute |

### Coordination with Constellations
Heat Vision is a personal preference, not part of saved constellation state. When loading a constellation, heat mode persists independently.

---

## Testing

### Unit Tests (`tests/unit/heat-vision.test.ts`)

| Test | What it verifies |
|------|------------------|
| `computeAutoWindow` with varied distributions | Returns 85th percentile clamped to [7, 180] |
| `computeAutoWindow` with <10 nodes | Falls back to 30 |
| `computeAutoWindow` ignores ghosts and null timestamps | Only real nodes contribute |
| `computeAutoWindow` deterministic fixtures | `[1..10]` → idx=7 → value=8; `[0..99]` → idx=84 → value=84 |
| `computeHeat` linear scaling | `ageDays=0` → `heat=1`, `ageDays=window` → `heat=0` |
| `computeHeat` clamps future timestamps | Clock skew → `heat=1` not `>1` |
| `computeHeat` skips ghosts | Ghost nodes get `heat=0` |
| Percentile index correctness | No out-of-bounds on edge cases (1 node, 10 nodes, 100 nodes) |
| Manual window clamping | Loading `NaN`, `0`, `9999`, `-5` → clamps to [7, 180] or defaults to 30 |
| Lazy heat computation | `heatEnabled=false` on init → `node.heat` not computed; toggle on → values assigned |

### Integration Tests (Manual Verification)

| Scenario | Expected |
|----------|----------|
| Load with heat off | No glow visible, slider shows last manual value or 30 |
| Toggle heat on | Glow appears on recent nodes, cold nodes unchanged |
| Adjust slider | Glow distribution shifts (more/fewer hot nodes) |
| Enable Auto | Slider thumb moves to computed value, "Currently: X days" updates |
| Disable Auto | Slider reverts to manual value, heat recalculates |
| Create note via WS | New node appears hot (heat=1), existing heat unchanged |
| Path mode + heat | Path nodes highlighted, heat glow suppressed for them |
| Refresh page | Settings persist, same heat state restored |
| Large vault (500+ nodes) | Interaction remains smooth, no FPS collapse |

### Edge Cases

- Empty vault (0 nodes): Toggle disabled with tooltip "No nodes to visualize"
- Single node: Auto falls back to 30 days
- All nodes same timestamp: All get same heat value
- Very old vault (5+ years): Auto window caps at 180, most nodes cold
- Future timestamps: Treated as "just now" (heat=1)

---

## Implementation Order

1. **Data passthrough** - Add `updatedAt` to GraphNode, pass through in visualize.ts
2. **Heat calculation functions** - `computeAutoWindow`, `computeHeat`, unit tests
3. **UI controls** - Toggle, slider, Auto checkbox, legend
4. **Rendering** - Glow before node fill, threshold check, highlight suppression
5. **Persistence** - localStorage load/save, state transitions
6. **Tooltip** - "Last updated: X days ago (YYYY-MM-DD)"
7. **Polish** - Empty vault handling, performance tuning, accessibility check

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/cli/commands/visualize.ts` | Add `updatedAt` to GraphNode, heat UI controls, heat calculation, glow rendering |
| `tests/unit/heat-vision.test.ts` | New file with unit tests for heat calculation |

---

## Accessibility

- Glow radius/alpha does heavy lifting (not just color)
- Hot/cold contrast works on dark and light backgrounds
- Color tint is subtle, not primary signal
- Consider multiple palettes for color vision deficiencies (future enhancement)
