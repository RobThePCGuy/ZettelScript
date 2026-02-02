# ZettelScript

**Graph-first knowledge management combining Zettelkasten-style notes and GraphRAG retrieval.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

---

## What is ZettelScript?

ZettelScript is a graph-first knowledge system where **notes are nodes**, **links are typed edges**, and **structure emerges from associations** rather than folders.

1. **Zettelkasten-style notes** — Atomic ideas connected through bidirectional links
2. **GraphRAG retrieval** — Semantic + keyword + graph traversal with bounded expansion

### Core Principles

- **Stable identity**: Nodes are referenced by immutable IDs, not titles
- **Bidirectional links**: Author forward links once; backlinks are computed
- **Discovery**: Unlinked mentions are detected, ranked, and suggested for approval
- **Safe write-back**: Models propose; humans approve; system validates

---

## Quick Start

```bash
# Initialize a vault in the current directory
zettel init

# Index all markdown files
zettel index

# View graph statistics
zettel query stats

# Find unlinked mentions
zettel discover --all
```

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

Find unlinked mentions — plain-text references that could become wikilinks.

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

GraphRAG context retrieval combining semantic search, keyword matching, and graph expansion.

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

Extract entities (characters, locations, objects, events) from prose using a local LLM.

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

| Type | Description |
|------|-------------|
| `note` | General-purpose atomic note |
| `character` | Character profile |
| `location` | Place or setting |
| `object` | Significant item or prop |
| `event` | Timeline event |
| `concept` | Abstract idea or theme |
| `moc` | Map of Content (hub note) |

### Edge Types

| Type | Description |
|------|-------------|
| `explicit_link` | User-authored wikilink |
| `backlink` | Computed incoming link |
| `sequence` | Chronological ordering |
| `hierarchy` | Parent-child relationship |
| `causes` | Causal relationship |
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

ZettelScript uses [Ollama](https://ollama.ai) for local LLM features (entity extraction, embeddings). Ollama runs as a **separate local server** on your machine — it is not bundled with ZettelScript.

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

## License

MIT
