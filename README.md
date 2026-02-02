# ZettelScript

**Your notes aren't connected. They're buried.**

Folders lie to you. They promise organization but deliver graveyards: ideas filed away, never to resurface. You've felt it: that nagging sense that you've written this before, somewhere.

ZettelScript doesn't organize your notes. It **unleashes** them.

> Notes become nodes. Links become meaning. Structure emerges from chaos.

[![npm](https://img.shields.io/npm/v/zettelscript.svg)](https://www.npmjs.com/package/zettelscript)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

---

## See Your Thinking

> **[View Demo Graph](demo-vault/.zettelscript/graph.html)** — Download and open in your browser to explore a sample knowledge graph.

One command. Your entire knowledge graph, alive in your browser.

```bash
zettel go
```

**ZettelScript Atlas** renders every note, character, location, and connection as an interactive force-directed graph. Every node is a portal to its connections—click to see related nodes, click again to navigate there. Color-coded edges show relationship types at a glance. Filter what you see. Search by name. Navigate with breadcrumbs.

This isn't a pretty picture. It's a **thinking tool**. Watch your ideas cluster. Spot the orphaned notes. Find the hidden hub you didn't know existed. Then click through to explore it.

---

## Zero to Graph in 30 Seconds

```bash
npm install -g zettelscript
cd your-notes-folder
zettel go
```

That's it. Your vault is indexed, your graph is built, and **Atlas opens in your browser**.

Your graph lives at `.zettelscript/graph.html` — a single self-contained file you can share, bookmark, or open offline anytime.

**Still organizing notes into folders?** That's archaeology, not knowledge management.

---

## Try It Now (No Install)

The repository includes a `demo-vault/` with sample characters, locations, events, and a pre-built graph.

1. Clone or download this repo
2. Open `demo-vault/.zettelscript/graph.html` in your browser
3. Explore the Atlas — click nodes, navigate connections, filter by type

No installation required. See what your notes could look like.

---

## Why Your Current System Fails

| The Problem | What You Do Now | What ZettelScript Does |
|-------------|-----------------|------------------------|
| **Lost connections** | Hope you remember related notes | Graph traversal finds them automatically |
| **Duplicate work** | Rewrite ideas you've already captured | Unlinked mention detection surfaces them |
| **Search hell** | Keyword guessing games | Semantic + graph + lexical retrieval |
| **Fragile links** | Rename a file, break everything | Immutable IDs survive restructuring |

---

## What Makes This Different

- **Stable identity**: Nodes are referenced by immutable IDs, not titles. Rename freely.
- **Bidirectional links**: Author forward links once; backlinks are computed automatically.
- **Discovery**: Unlinked mentions are detected, ranked, and suggested for approval.
- **Safe write-back**: Models propose; humans approve; system validates.

---

## Not Another Note-Taking App

- **No proprietary lock-in.** Your notes stay as plain markdown.
- **No cloud dependency.** Runs entirely local with SQLite.
- **No AI subscription.** Use free local models via Ollama.
- **No folder prison.** Graphs beat hierarchies.

---

## Installation

### Option 1: Install from npm (recommended)

```bash
npm install -g zettelscript
zettel <command>
```

### Option 2: Install from GitHub

```bash
npm install -g github:RobThePCGuy/ZettelScript
zettel <command>
```

### Option 3: Run directly with npx

```bash
# From npm
npx zettelscript <command>

# From GitHub
npx github:RobThePCGuy/ZettelScript <command>
```

### Option 4: Clone and build

```bash
git clone https://github.com/RobThePCGuy/ZettelScript.git
cd ZettelScript
npm install
npm run build
node dist/cli/index.js <command>
```

---

## CLI Commands

### `setup` / `go`

**Zero to hero.** Initialize, index, and visualize in one command.

```bash
zettel go
zettel setup --manuscript   # Enable manuscript mode
```

| Option | Description |
|--------|-------------|
| `-f, --force` | Reinitialize even if already set up |
| `--manuscript` | Enable manuscript mode with POV and timeline validation |
| `--no-viz` | Skip visualization generation |
| `-v, --verbose` | Show detailed output |

---

### `visualize` / `viz`

**See your graph.** Generates an interactive force-directed visualization and opens it in your browser.

```bash
zettel viz
zettel visualize --output ~/Desktop/my-graph.html
```

| Option | Description |
|--------|-------------|
| `-o, --output <path>` | Custom output path for the HTML file |
| `--no-open` | Generate without opening browser |

**Output location:** `.zettelscript/graph.html` in your vault directory (or custom path with `-o`).

Opens **ZettelScript Atlas**, a fully navigable knowledge exploration tool.

#### Atlas Features

**Clickable Navigation** — Every node is a portal. Click any node to see its connections in the sidebar, grouped by relationship type. Click a connected node to navigate instantly. Your graph becomes a web you can traverse.

**Navigation History** — Breadcrumb trail appears at top-center as you explore. Back/forward buttons let you retrace your steps. Jump to any previous node with a click.

**Edge Type Styling** — Relationships are color-coded by type:

| Edge Type | Color | Style |
|-----------|-------|-------|
| Links to | Cyan | Solid |
| Backlinks | Violet | Dashed |
| Sequence | Emerald | Solid |
| Hierarchy | Amber | Solid |
| Causes | Red | Solid |
| Semantic | Gray | Dotted |
| Mention | Teal | Dotted |

**Edge Filtering** — Toggle edge types on/off in the left panel. Hide backlinks to see only forward links. Show only causal relationships. Focus on what matters.

**Keyboard Shortcuts**

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `Escape` | Close sidebar |
| `Alt+Left` | Go back |
| `Alt+Right` | Go forward |

The generated HTML is a single self-contained file (~45KB) that works offline.

---

### `init`

Initialize a ZettelScript vault in the current directory.

```bash
zettel init [options]
```

| Option | Description |
|--------|-------------|
| `-f, --force` | Overwrite existing initialization |

Creates `.zettelscript/` directory containing the database and config.

---

### `index`

Index all markdown files in the vault.

```bash
zettel index [options]
```

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Show detailed output including unresolved/ambiguous links |
| `--stats` | Show nodes and edges by type after indexing |

---

### `watch`

Watch for file changes and incrementally index.

```bash
zettel watch [options]
```

| Option | Description |
|--------|-------------|
| `-v, --verbose` | Show detailed output for each file change |

Press `Ctrl+C` to stop watching.

---

### `query`

Query the knowledge graph. Has 6 subcommands:

#### `query backlinks <node>`

Show incoming links to a node.

```bash
zettel query backlinks "Note Title"
zettel query backlinks path/to/note.md
```

| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Maximum results (default: 20) |

#### `query neighbors <node>`

Show connected nodes (both incoming and outgoing).

```bash
zettel query neighbors "Note Title"
```

| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Maximum results (default: 20) |
| `-d, --direction <dir>` | Filter: `in`, `out`, or `both` (default: both) |

#### `query path <from> <to>`

Find the shortest path between two nodes.

```bash
zettel query path "Note A" "Note B"
```

#### `query stats`

Show graph statistics including node counts, edge counts, and isolated nodes.

```bash
zettel query stats
```

#### `query orphans`

Find nodes with no links.

```bash
zettel query orphans
```

| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Maximum results (default: 20) |

#### `query hubs`

Find highly-connected nodes.

```bash
zettel query hubs
```

| Option | Description |
|--------|-------------|
| `-l, --limit <n>` | Maximum results (default: 10) |
| `-t, --threshold <n>` | Minimum incoming connections (default: 5) |

---

### `validate`

Validate the vault for integrity issues.

```bash
zettel validate [options]
```

| Option | Description |
|--------|-------------|
| `--links` | Check for broken and ambiguous links |
| `--schema` | Validate frontmatter schema |
| `--all` | Run all validations (default if no options) |
| `-v, --verbose` | Show detailed output |

---

### `discover`

**Your vault is full of hidden connections.** Every time you type a character name, a concept, or a location without linking it, that's a connection lost.

`zettel discover` hunts them down.

```bash
zettel discover [options]
```

| Option | Description |
|--------|-------------|
| `-n, --node <id>` | Check specific node by title or path |
| `--all` | Check all nodes |
| `-l, --limit <n>` | Maximum mentions per node (default: 10) |
| `-t, --threshold <n>` | Minimum confidence threshold 0-1 (default: 0.5) |
| `--approve` | Interactive approval mode |
| `--batch <action>` | Batch action: `approve`, `reject`, or `defer` |

---

### `retrieve`

**Search that actually understands what you're looking for.**

Traditional search matches keywords. ZettelScript matches *meaning*, then follows the graph to find related ideas you didn't even think to search for.

```bash
zettel retrieve "<query>" [options]
```

| Option | Description |
|--------|-------------|
| `-n, --max-results <n>` | Maximum results (default: 10) |
| `-d, --depth <n>` | Graph expansion depth (default: 2) |
| `-b, --budget <n>` | Node expansion budget (default: 30) |
| `--no-semantic` | Disable semantic search |
| `--no-lexical` | Disable lexical search |
| `--no-graph` | Disable graph expansion |
| `-t, --type <types>` | Filter by node types (comma-separated) |
| `-v, --verbose` | Show detailed provenance |

Requires embeddings configuration for semantic search.

---

### `extract`

**Let AI find the entities you missed.** Extract characters, locations, objects, and events from prose using a local LLM.

```bash
zettel extract [options]
```

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Extract from specific file |
| `--all` | Extract from all markdown files |
| `-m, --model <model>` | Ollama model to use (default: llama3.2:3b) |
| `--dry-run` | Show what would be extracted without creating files |
| `-o, --output <dir>` | Output directory for entity files (default: entities/) |
| `-v, --verbose` | Show detailed output |

Creates markdown files for each entity with frontmatter, then run `zettel index` to build the graph.

```bash
# Extract entities (dry run to preview)
zettel extract --file notes.md --dry-run

# Create entity files
zettel extract --file notes.md

# Re-index to include new entities
zettel index
```

---

## Core Concepts

### Node Types

Every note is a node. But not all nodes are equal.

| Type | Description |
|------|-------------|
| `note` | General-purpose atomic note |
| `scene` | Story scene or chapter |
| `character` | Character profile |
| `location` | Place or setting |
| `object` | Significant item or prop |
| `event` | Timeline event |
| `concept` | Abstract idea or theme |
| `moc` | Map of Content (hub note) |
| `timeline` | Timeline or chronology |
| `draft` | Work in progress |

### Edge Types

Links aren't just links. They carry meaning.

| Type | Description |
|------|-------------|
| `explicit_link` | User-authored wikilink |
| `backlink` | Computed incoming link |
| `sequence` | Chronological ordering |
| `hierarchy` | Parent-child relationship |
| `participation` | Character/entity involvement |
| `pov_visible_to` | POV character visibility |
| `causes` | Causal relationship |
| `setup_payoff` | Narrative setup and payoff |
| `semantic` | Inferred semantic similarity |
| `mention` | Unlinked mention detected |
| `alias` | Alternative name reference |

### Wikilink Syntax

ZettelScript supports standard wikilink syntax:

```markdown
[[Title]]                    # Link by title
[[Title|Display Text]]       # Link with custom display
[[id:abc123]]                # Link by node ID (for ambiguity)
[[id:abc123|Display Text]]   # ID link with display text
```

**Resolution rules:**
1. If `id:` prefix is used, resolve directly to node ID
2. Otherwise, match by exact title, then by alias
3. If multiple matches exist, link is marked as ambiguous

---

## Frontmatter Reference

ZettelScript reads YAML frontmatter to populate node metadata.

```yaml
---
id: unique-node-id          # Immutable identifier (auto-generated if missing)
title: Note Title           # Display title (defaults to filename)
type: note                  # Node type (see Node Types above)
aliases:                    # Alternative titles for linking
  - Alias One
  - Alias Two
tags:                       # Classification tags
  - topic/subtopic
  - status/active
created: 2024-01-15         # Creation date
updated: 2024-03-20         # Last modified date
---
```

---

## Configuration

Configuration is stored in `.zettelscript/config.yaml`. Key sections:

### Vault Settings

```yaml
vault:
  path: "."
  excludePatterns:
    - "node_modules/**"
    - ".git/**"
    - ".zettelscript/**"
```

### Embeddings (for semantic search)

```yaml
# OpenAI embeddings
embeddings:
  provider: openai
  model: text-embedding-3-small
  dimensions: 1536
  apiKey: ${OPENAI_API_KEY}  # Or set via environment variable

# Ollama embeddings (local)
embeddings:
  provider: ollama
  model: nomic-embed-text
  dimensions: 768
  baseUrl: http://localhost:11434
```

### Retrieval Settings

```yaml
retrieval:
  defaultMaxResults: 20
  semanticWeight: 0.5        # Weight for semantic matches
  lexicalWeight: 0.3         # Weight for keyword matches
  graphWeight: 0.2           # Weight for graph expansion
  expansionMaxDepth: 3       # Max hops for graph traversal
  expansionBudget: 50        # Max nodes to expand
```

### LLM Configuration (for extract command)

```yaml
# Ollama (local)
llm:
  provider: ollama
  model: llama3.2:3b
  baseUrl: http://localhost:11434
```

### Graph Expansion

```yaml
graph:
  defaultMaxDepth: 3         # Default traversal depth
  defaultBudget: 50          # Default node budget
  decayFactor: 0.7           # Score decay per hop
  scoreThreshold: 0.01       # Minimum score to include
```

### Discovery Settings

```yaml
discovery:
  confidenceThreshold: 0.5   # Minimum confidence for mentions
  ambiguityPenalty: 0.7      # Penalty for ambiguous matches
  weights:
    locality: 0.3            # Weight for graph proximity
    centrality: 0.2          # Weight for node importance
    frequency: 0.2           # Weight for mention frequency
    matchQuality: 0.3        # Weight for string match quality
```

---

## How Ollama Integration Works

ZettelScript uses [Ollama](https://ollama.ai) for local LLM features (entity extraction, embeddings). Ollama runs as a **separate local server** on your machine. It is not bundled with ZettelScript.

```
Your Machine
┌─────────────────────────────────────────────┐
│  zettel extract / zettel retrieve           │
│       │                                     │
│       ▼ (HTTP to localhost:11434)           │
│  ┌─────────────┐                            │
│  │   Ollama    │  ← Install separately      │
│  │  (llama3.2) │                            │
│  └─────────────┘                            │
└─────────────────────────────────────────────┘
```

**Setup:**
1. Install Ollama: https://ollama.ai
2. Pull a model: `ollama pull llama3.2:3b`
3. Ollama runs automatically in the background
4. ZettelScript commands will now use it

---

## Requirements

- **Node.js** >= 20.0.0
- **SQLite** (bundled via better-sqlite3)

Optional:
- **OpenAI API key** for cloud-based semantic search
- **Ollama** for local embeddings and entity extraction

---

## For Contributors

The `dist/` directory is committed to the repository. This allows `npx github:RobThePCGuy/ZettelScript` to work without requiring users to build the project. If you modify source code, rebuild before committing:

```bash
npm run build
git add dist/
```

---

## Your Notes Deserve Better

You didn't write all those ideas just to lose them in folders. ZettelScript finds the connections you forgot existed and shows you the ones you never knew were there.

```bash
npm install -g zettelscript && zettel go
```

**Start seeing your thinking.**

---

## License

MIT
