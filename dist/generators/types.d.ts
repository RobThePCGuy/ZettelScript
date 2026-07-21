/**
 * Types for vault generators
 * These types define the structure of knowledge base data used to generate vault notes
 */
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
export type RelationshipKind = 'ally' | 'enemy' | 'family' | 'mentor' | 'rival' | 'visits' | 'resides' | 'owns' | 'holds' | 'formerly_held' | 'participated' | 'witnessed' | 'contains' | 'occurred_at' | 'co_occurrence' | 'associated';
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
export interface GeneratorResult {
    /** Files that were created */
    created: string[];
    /** Files that were skipped (already exist) */
    skipped: string[];
    /** Errors encountered */
    errors: Array<{
        file: string;
        error: string;
    }>;
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
    errors: Array<{
        file: string;
        error: string;
    }>;
}
export type LockLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export declare function getLockLevel(entity: {
    locked?: boolean;
    significance?: string;
}): LockLevel;
export type RealmType = 'real_world' | 'dimensional' | 'liminal' | 'unknown';
export declare function classifyRealm(location: KBLocation): RealmType;
//# sourceMappingURL=types.d.ts.map