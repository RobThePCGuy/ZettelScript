/**
 * Types for vault generators
 * These types define the structure of knowledge base data used to generate vault notes
 */

// ============================================================================
// KB Data Types - Generic versions without manuscript-specific content
// ============================================================================

export interface KBCharacter {
  id: string;
  canonical_name: string;
  aliases?: string[];
  role: string;
  chapters_present?: number[];
  first_appearance?: number;
  last_appearance?: number;
  age?: number;
  physical?: Record<string, unknown>;
  personality?: string[];
  abilities?: Record<string, unknown>;
  equipment?: string[];
  backstory?: Record<string, unknown>;
  arc?: CharacterArc;
  entry_state?: Record<string, unknown>;
  exit_state?: Record<string, unknown>;
  key_quote?: string;
  final_words?: string;
  coping_mechanism?: Record<string, unknown>;
  relationship_to_protagonist?: string;
}

export interface CharacterArc {
  type: string;
  description: string;
  key_moments?: Array<{
    chapter: number;
    beat: string;
    description: string;
  }>;
  resolution?: {
    status: string;
    chapter?: number;
    key_line?: string;
    mechanism?: string;
  };
}

export interface KBLocation {
  id: string;
  name: string;
  type: string;
  description?: string;
  features?: string[];
  chapters_seen?: number[];
  first_appearance?: number;
  realm?: 'real_world' | 'dimensional' | 'liminal' | 'unknown';
}

export interface KBObject {
  id: string;
  name: string;
  type: string;
  description?: string;
  properties?: string[];
  significance?: string;
  locked?: boolean;
  holder?: string | null;
  holders?: string[];
  status?: string | null;
}

export interface KBTimelineEvent {
  id: string;
  description: string;
  chapter: number;
  locked?: boolean;
  significance?: string;
}

export interface KBPlotThread {
  id: string;
  name: string;
  type: string;
  status: string;
  chapters_touched?: number[];
  expected_resolution?: string;
  resolution_chapter?: number;
  resolution_description?: string;
}

export interface KBFact {
  id: string;
  fact: string;
  source: string;
  locked?: boolean;
}

export interface KBNameNormalization {
  canonical: string;
  variants: string[];
}

// ============================================================================
// Relationship Types
// ============================================================================

export type RelationshipKind =
  // character↔character
  | 'ally'
  | 'enemy'
  | 'family'
  | 'mentor'
  | 'rival'
  // character↔location
  | 'visits'
  | 'resides'
  // character↔object
  | 'owns'
  | 'holds'
  | 'formerly_held'
  // character↔event
  | 'participated'
  | 'witnessed'
  // location↔object/event
  | 'contains'
  | 'occurred_at'
  // generic
  | 'co_occurrence'
  | 'associated';

export interface KBRelationship {
  sourceId: string;
  targetId: string;
  type: RelationshipKind;
  description?: string;
  chapters?: number[];
}

export type EntityType = 'character' | 'location' | 'object' | 'event';

export interface ComputedRelationship {
  targetId: string;
  targetName: string;
  targetType: EntityType;
  relationshipType: RelationshipKind;
  description?: string | undefined;
  chapters?: number[] | undefined;
  source: 'explicit' | 'inferred' | 'co_occurrence';
  /** Wikilink target (e.g., "Event-01-001" for events) */
  linkTarget?: string | undefined;
  /** Optional display text for wikilink (e.g., "Alpha arrives at the facility") */
  linkDisplay?: string | undefined;
}

export interface KBData {
  schema_version: string;
  book_id: string;
  series_id?: string;
  kb_version?: string;
  created_at?: string;
  last_updated?: string;
  source?: string;
  characters: KBCharacter[];
  locations: KBLocation[];
  objects: KBObject[];
  timeline: KBTimelineEvent[];
  plot_threads?: KBPlotThread[];
  facts?: KBFact[];
  relationships?: KBRelationship[];
  contradictions?: unknown[];
  name_normalization?: KBNameNormalization[];
  cross_reference?: Record<string, unknown>;
}

// ============================================================================
// Arc Ledger Types
// ============================================================================

export interface ArcLedgerCharacter {
  character_id: string;
  canonical_name: string;
  entry_state?: Record<string, unknown>;
  arc?: CharacterArc;
  exit_state?: Record<string, unknown>;
}

export interface ArcLedgerThread {
  thread_id: string;
  name: string;
  type: string;
  status: string;
  chapters_touched?: number[];
  resolution_chapter?: number;
  resolution_description?: string;
  expected_resolution?: string;
  description?: string;
}

export interface ArcLedger {
  schema_version: string;
  book_id: string;
  series_id?: string;
  last_updated?: string;
  characters: ArcLedgerCharacter[];
  threads: ArcLedgerThread[];
  series_arc_tracking?: Record<string, unknown>;
  locked_element_compliance?: Record<string, unknown>;
}

// ============================================================================
// World Rules Types
// ============================================================================

export interface WorldRule {
  id: string;
  name: string;
  category: string;
  description: string;
  locked?: boolean;
  examples?: string[];
  exceptions?: string[];
  source?: string;
}

export interface WorldRulesData {
  schema_version: string;
  rules?: WorldRule[];
  mechanics?: WorldRule[];
  constraints?: WorldRule[];
}

// ============================================================================
// Generator Options
// ============================================================================

export interface GeneratorOptions {
  /** Path to the output vault directory */
  outputDir: string;
  /** Path to the KB JSON file */
  kbPath?: string | undefined;
  /** Path to the arc-ledger JSON file */
  arcLedgerPath?: string | undefined;
  /** Path to the world-rules JSON file */
  worldRulesPath?: string | undefined;
  /** Whether to use database as source instead of JSON files */
  fromDb?: boolean | undefined;
  /** Dry run - don't write files, just show what would be created */
  dryRun?: boolean | undefined;
  /** Overwrite existing files */
  force?: boolean | undefined;
  /** Verbose output */
  verbose?: boolean | undefined;
  /** Include Related Entities section in generated notes */
  includeRelatedEntities?: boolean | undefined;
  /** Minimum shared chapters for co-occurrence relationships (default: 2) */
  coOccurrenceThreshold?: number | undefined;
}

export interface ChapterGeneratorOptions extends GeneratorOptions {
  /** Path to the manuscript file */
  manuscriptPath: string;
  /** Output subdirectory for chapters */
  chaptersDir?: string | undefined;
}

export interface InjectLinksOptions {
  /** Path to the vault directory */
  vaultPath: string;
  /** Dry run - show changes without modifying files */
  dryRun?: boolean | undefined;
  /** Entity names to create wikilinks for */
  entities?: string[] | undefined;
  /** Pattern to match files (glob) */
  pattern?: string | undefined;
  /** Verbose output */
  verbose?: boolean | undefined;
}

// ============================================================================
// Generator Results
// ============================================================================

export interface GeneratorResult {
  /** Files that were created */
  created: string[];
  /** Files that were skipped (already exist) */
  skipped: string[];
  /** Errors encountered */
  errors: Array<{ file: string; error: string }>;
  /** Summary message */
  summary: string;
}

export interface InjectLinksResult {
  /** Files that were modified */
  modified: string[];
  /** Total links injected */
  linksInjected: number;
  /** Files that were skipped */
  skipped: string[];
  /** Errors encountered */
  errors: Array<{ file: string; error: string }>;
}

// ============================================================================
// Lock Level System
// ============================================================================

export type LockLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export function getLockLevel(entity: { locked?: boolean; significance?: string }): LockLevel {
  if (entity.locked) {
    return 'CRITICAL';
  }

  const sig = entity.significance?.toLowerCase() || '';
  if (sig.includes('critical') || sig.includes('essential')) {
    return 'HIGH';
  }
  if (sig.includes('important') || sig.includes('significant')) {
    return 'MEDIUM';
  }
  return 'LOW';
}

// ============================================================================
// Realm Classification
// ============================================================================

export type RealmType = 'real_world' | 'dimensional' | 'liminal' | 'unknown';

const DIMENSIONAL_KEYWORDS = ['dimension', 'portal', 'void', 'realm', 'prison', 'core', 'barrier'];
const LIMINAL_KEYWORDS = ['threshold', 'between', 'transition', 'edge', 'boundary'];
const REAL_WORLD_KEYWORDS = ['house', 'basement', 'bedroom', 'hospital', 'street', 'school', 'lab'];

export function classifyRealm(location: KBLocation): RealmType {
  // Explicit type takes precedence
  if (location.realm) {
    return location.realm;
  }

  // Check type field
  const locType = location.type?.toLowerCase() || '';
  if (locType.includes('dimensional') || locType === 'dimensional_location') {
    return 'dimensional';
  }
  if (locType.includes('real') || locType === 'real_world_location') {
    return 'real_world';
  }

  // Heuristic keyword detection
  const name = location.name.toLowerCase();
  const desc = (location.description || '').toLowerCase();
  const combined = `${name} ${desc}`;

  for (const keyword of DIMENSIONAL_KEYWORDS) {
    if (combined.includes(keyword)) {
      return 'dimensional';
    }
  }

  for (const keyword of LIMINAL_KEYWORDS) {
    if (combined.includes(keyword)) {
      return 'liminal';
    }
  }

  for (const keyword of REAL_WORLD_KEYWORDS) {
    if (combined.includes(keyword)) {
      return 'real_world';
    }
  }

  return 'unknown';
}
