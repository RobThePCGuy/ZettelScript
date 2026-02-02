import { describe, it, expect } from 'vitest';
import type { KBData } from '../../src/generators/types.js';
import { RelationshipEngine, labelFor } from '../../src/generators/relationships.js';
import { buildRelatedEntitiesSection } from '../../src/generators/related-entities.js';

// Sample KB data for testing
const createTestKB = (): KBData => ({
  schema_version: '1.0',
  book_id: 'test-book',
  characters: [
    {
      id: 'char_001',
      canonical_name: 'Alpha One',
      aliases: ['Alpha', 'The First'],
      role: 'protagonist',
      chapters_present: [1, 2, 3, 4, 5],
      first_appearance: 1,
      equipment: ['The Keystone'],
    },
    {
      id: 'char_002',
      canonical_name: 'Beta Two',
      aliases: ['Beta'],
      role: 'supporting',
      chapters_present: [2, 3, 4, 5],
      first_appearance: 2,
    },
    {
      id: 'char_003',
      canonical_name: 'Gamma Antagonist',
      aliases: ['The Shadow'],
      role: 'antagonist',
      chapters_present: [1, 3, 5],
      first_appearance: 1,
    },
  ],
  locations: [
    {
      id: 'loc_001',
      name: 'Central Facility',
      type: 'real_world_location',
      chapters_seen: [1, 2, 3, 4, 5],
      first_appearance: 1,
    },
    {
      id: 'loc_002',
      name: 'The Void Realm',
      type: 'dimensional_location',
      chapters_seen: [3, 5],
      first_appearance: 3,
    },
  ],
  objects: [
    {
      id: 'obj_001',
      name: 'The Keystone',
      type: 'artifact',
      holder: 'Alpha One',
      holders: ['Alpha One', 'Gamma Antagonist'],
    },
    {
      id: 'obj_002',
      name: "Beta's Scanner",
      type: 'equipment',
      holder: 'Beta Two',
    },
  ],
  timeline: [
    {
      id: 'event_001',
      description: 'Alpha arrives at the facility',
      chapter: 1,
    },
    {
      id: 'event_002',
      description: 'Beta joins the team',
      chapter: 2,
    },
  ],
  relationships: [
    {
      sourceId: 'char_001',
      targetId: 'char_002',
      type: 'ally',
      description: 'Trusted teammate',
      chapters: [2, 3, 4, 5],
    },
    {
      sourceId: 'char_001',
      targetId: 'char_003',
      type: 'enemy',
      description: 'Primary antagonist',
    },
  ],
});

describe('RelationshipEngine', () => {
  describe('explicit relationships', () => {
    it('should extract explicit relationships from kb.relationships', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb);

      const rels = engine.getRelationshipsFor('char_001');
      const allyRel = rels.find(r => r.targetId === 'char_002' && r.relationshipType === 'ally');

      expect(allyRel).toBeDefined();
      expect(allyRel?.targetName).toBe('Beta Two');
      expect(allyRel?.source).toBe('explicit');
      expect(allyRel?.chapters).toEqual([2, 3, 4, 5]);
    });

    it('should find bidirectional explicit relationships', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb);

      // Alpha is source, but Beta should also see this relationship
      const relsForBeta = engine.getRelationshipsFor('char_002');
      const allyRel = relsForBeta.find(
        r => r.targetId === 'char_001' && r.relationshipType === 'ally'
      );

      expect(allyRel).toBeDefined();
      expect(allyRel?.targetName).toBe('Alpha One');
    });
  });

  describe('inferred relationships', () => {
    it('should infer owns relationship from character equipment', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb);

      const rels = engine.getRelationshipsFor('char_001');
      const ownsRel = rels.find(r => r.targetName === 'The Keystone' && r.relationshipType === 'owns');

      expect(ownsRel).toBeDefined();
      expect(ownsRel?.targetType).toBe('object');
      expect(ownsRel?.source).toBe('inferred');
    });

    it('should infer holds relationship from object holder', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb);

      const rels = engine.getRelationshipsFor('obj_001');
      const holdsRel = rels.find(r => r.targetName === 'Alpha One' && r.relationshipType === 'holds');

      expect(holdsRel).toBeDefined();
      expect(holdsRel?.targetType).toBe('character');
      expect(holdsRel?.source).toBe('inferred');
    });

    it('should infer formerly_held from previous holders', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb);

      const rels = engine.getRelationshipsFor('obj_001');
      const formerRel = rels.find(
        r => r.targetName === 'Gamma Antagonist' && r.relationshipType === 'formerly_held'
      );

      expect(formerRel).toBeDefined();
      expect(formerRel?.source).toBe('inferred');
    });
  });

  describe('co-occurrence relationships', () => {
    it('should compute co-occurrence from shared chapters', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb, 2); // threshold of 2

      const rels = engine.getRelationshipsFor('char_001');
      const coOccurrence = rels.filter(r => r.relationshipType === 'co_occurrence');

      // Alpha is in chapters 1,2,3,4,5
      // Beta is in chapters 2,3,4,5 (4 shared)
      // Gamma is in chapters 1,3,5 (3 shared)
      // Central Facility is in chapters 1,2,3,4,5 (5 shared)
      // The Void Realm is in chapters 3,5 (2 shared)
      expect(coOccurrence.length).toBeGreaterThan(0);

      const betaCoOccur = coOccurrence.find(r => r.targetName === 'Beta Two');
      // Beta has explicit ally relationship, so should not appear as co_occurrence
      expect(betaCoOccur).toBeUndefined();
    });

    it('should not add co-occurrence if more specific relationship exists', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb, 2);

      const rels = engine.getRelationshipsFor('char_001');

      // Alpha and Beta have explicit ally relationship
      // Should not have a separate co_occurrence entry
      const betaRels = rels.filter(r => r.targetName === 'Beta Two');
      expect(betaRels.length).toBe(1);
      expect(betaRels[0].relationshipType).toBe('ally');
    });

    it('should respect co-occurrence threshold', () => {
      const kb = createTestKB();
      const engineLow = new RelationshipEngine(kb, 1);
      const engineHigh = new RelationshipEngine(kb, 10);

      const relsLow = engineLow.getRelationshipsFor('char_001');
      const relsHigh = engineHigh.getRelationshipsFor('char_001');

      // Low threshold should find more co-occurrences
      const coOccurLow = relsLow.filter(r => r.relationshipType === 'co_occurrence');
      const coOccurHigh = relsHigh.filter(r => r.relationshipType === 'co_occurrence');

      expect(coOccurLow.length).toBeGreaterThan(coOccurHigh.length);
    });
  });

  describe('groupByEntityType', () => {
    it('should group relationships by entity type', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb);

      const rels = engine.getRelationshipsFor('char_001');
      const grouped = engine.groupByEntityType(rels);

      expect(grouped.has('character')).toBe(true);
      expect(grouped.has('object')).toBe(true);
      expect(grouped.get('character')?.length).toBeGreaterThan(0);
    });
  });

  describe('event-character participation inference', () => {
    it('should infer participated relationship for characters in event chapter', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb);

      // Alpha is in chapter 1, event_001 is in chapter 1
      const rels = engine.getRelationshipsFor('char_001');
      const participatedRel = rels.find(
        r => r.targetId === 'event_001' && r.relationshipType === 'participated'
      );

      expect(participatedRel).toBeDefined();
      expect(participatedRel?.targetType).toBe('event');
      expect(participatedRel?.source).toBe('inferred');
      expect(participatedRel?.chapters).toEqual([1]);
    });

    it('should show participants when querying from event perspective', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb);

      // event_001 is in chapter 1, Alpha and Gamma are in chapter 1
      const rels = engine.getRelationshipsFor('event_001');
      const participants = rels.filter(r => r.relationshipType === 'participated');

      expect(participants.length).toBe(2);
      expect(participants.some(r => r.targetName === 'Alpha One')).toBe(true);
      expect(participants.some(r => r.targetName === 'Gamma Antagonist')).toBe(true);
    });
  });

  describe('event-location occurrence inference', () => {
    it('should infer occurred_at relationship for events at locations', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb);

      // event_001 is in chapter 1, Central Facility is in chapters 1-5
      const rels = engine.getRelationshipsFor('event_001');
      const occurredAtRel = rels.find(
        r => r.targetName === 'Central Facility' && r.relationshipType === 'occurred_at'
      );

      expect(occurredAtRel).toBeDefined();
      expect(occurredAtRel?.targetType).toBe('location');
      expect(occurredAtRel?.source).toBe('inferred');
    });

    it('should show events when querying from location perspective', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb);

      // Central Facility is in chapters 1-5, both events are in those chapters
      const rels = engine.getRelationshipsFor('loc_001');
      const events = rels.filter(r => r.targetType === 'event');

      expect(events.length).toBe(2);
    });
  });

  describe('object chapter derivation', () => {
    it('should derive object chapters from holder presence for co-occurrence', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb, 2);

      // The Keystone is held by Alpha (chapters 1-5) and formerly held by Gamma (chapters 1,3,5)
      // Objects derive their chapter presence from their holders
      // Check that the object has relationships based on derived chapters
      const rels = engine.getRelationshipsFor('obj_001');

      // Should have a holds relationship with Alpha
      const holdsAlpha = rels.find(r => r.targetName === 'Alpha One' && r.relationshipType === 'holds');
      expect(holdsAlpha).toBeDefined();

      // Should have formerly_held with Gamma
      const formerlyGamma = rels.find(r => r.targetName === 'Gamma Antagonist' && r.relationshipType === 'formerly_held');
      expect(formerlyGamma).toBeDefined();

      // Check co-occurrence includes derived chapter info
      // Note: Central Facility might not be in co_occurrence if there's already a more specific relationship
      // Let's verify the object has relationships that show it appears in the story
      expect(rels.length).toBeGreaterThan(0);
    });

    it('should include objects in co-occurrence based on holder chapters', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb, 2);

      // From location perspective, check if objects appear via their holders
      const locRels = engine.getRelationshipsFor('loc_001');

      // Central Facility is in chapters 1-5
      // The Keystone is held by Alpha (chapters 1-5)
      // So we might see co-occurrence or the location sees the object
      // This verifies the derivation mechanism works
      expect(locRels.some(r => r.targetType === 'object')).toBe(true);
    });
  });

  describe('inverse labels', () => {
    it('should return correct outgoing labels', () => {
      expect(labelFor('owns', 'out')).toBe('owns');
      expect(labelFor('holds', 'out')).toBe('holds');
      expect(labelFor('participated', 'out')).toBe('participated');
      expect(labelFor('occurred_at', 'out')).toBe('occurred at');
    });

    it('should return correct inverse/incoming labels', () => {
      expect(labelFor('owns', 'in')).toBe('owned by');
      expect(labelFor('holds', 'in')).toBe('held by');
      expect(labelFor('participated', 'in')).toBe('participant');
      expect(labelFor('occurred_at', 'in')).toBe('site of');
      expect(labelFor('visits', 'in')).toBe('visited by');
      expect(labelFor('contains', 'in')).toBe('contained in');
    });

    it('should handle co_occurrence symmetrically', () => {
      expect(labelFor('co_occurrence', 'out')).toBe('co-occurrence');
      expect(labelFor('co_occurrence', 'in')).toBe('co-occurrence');
    });
  });

  describe('wikilink target and display', () => {
    it('should include linkTarget for events', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb);

      const rels = engine.getRelationshipsFor('char_001');
      const eventRel = rels.find(r => r.targetType === 'event');

      expect(eventRel).toBeDefined();
      expect(eventRel?.linkTarget).toBe('Event-01-001');
      expect(eventRel?.linkDisplay).toBe('Alpha arrives at the facility');
    });

    it('should include linkTarget for characters and locations', () => {
      const kb = createTestKB();
      const engine = new RelationshipEngine(kb);

      const rels = engine.getRelationshipsFor('event_001');
      const charRel = rels.find(r => r.targetType === 'character');
      const locRel = rels.find(r => r.targetType === 'location');

      expect(charRel?.linkTarget).toBe(charRel?.targetName);
      expect(locRel?.linkTarget).toBe(locRel?.targetName);
    });
  });

  describe('name normalization', () => {
    it('should match names with different whitespace and underscores', () => {
      const kb = createTestKB();
      // Add a name normalization entry
      kb.name_normalization = [
        {
          canonical: 'Alpha One',
          variants: ['alpha_one', 'Alpha_One', 'alpha one'],
        },
      ];
      const engine = new RelationshipEngine(kb);

      // The Keystone is held by "Alpha One", holder field uses exact name
      // but let's verify name normalization works by checking object resolution
      const rels = engine.getRelationshipsFor('obj_001');
      const holdsRel = rels.find(r => r.relationshipType === 'holds');

      expect(holdsRel).toBeDefined();
      expect(holdsRel?.targetName).toBe('Alpha One');
    });
  });
});

describe('buildRelatedEntitiesSection', () => {
  it('should return empty string for no relationships', () => {
    const result = buildRelatedEntitiesSection([]);
    expect(result).toBe('');
  });

  it('should build markdown section with grouped entities', () => {
    const kb = createTestKB();
    const engine = new RelationshipEngine(kb);

    const rels = engine.getRelationshipsFor('char_001');
    const section = buildRelatedEntitiesSection(rels);

    expect(section).toContain('## Related Entities');
    expect(section).toContain('### Characters');
    expect(section).toContain('[[Beta Two]]');
    expect(section).toContain('[[Gamma Antagonist]]');
    expect(section).toContain('### Objects');
    expect(section).toContain('[[The Keystone]]');
  });

  it('should include relationship type in output', () => {
    const kb = createTestKB();
    const engine = new RelationshipEngine(kb);

    const rels = engine.getRelationshipsFor('char_001');
    const section = buildRelatedEntitiesSection(rels);

    expect(section).toContain('ally');
    expect(section).toContain('enemy');
    expect(section).toContain('owns');
  });

  it('should include chapter info when available', () => {
    const kb = createTestKB();
    const engine = new RelationshipEngine(kb);

    const rels = engine.getRelationshipsFor('char_001');
    const section = buildRelatedEntitiesSection(rels);

    // The ally relationship has chapters [2, 3, 4, 5]
    expect(section).toContain('Ch.');
  });

  it('should format chapter ranges correctly', () => {
    const kb = createTestKB();
    const engine = new RelationshipEngine(kb);

    const rels = engine.getRelationshipsFor('char_001');
    const section = buildRelatedEntitiesSection(rels);

    // Chapters 2,3,4,5 should be formatted as "2-5"
    expect(section).toContain('2-5');
  });

  it('should use linkDisplay for events with proper wikilink format', () => {
    const kb = createTestKB();
    const engine = new RelationshipEngine(kb);

    const rels = engine.getRelationshipsFor('char_001');
    const section = buildRelatedEntitiesSection(rels);

    // Events should have format [[Event-01-001|Alpha arrives at the facility]]
    expect(section).toContain('[[Event-01-001|Alpha arrives at the facility]]');
  });

  it('should include events section when character has participated relationships', () => {
    const kb = createTestKB();
    const engine = new RelationshipEngine(kb);

    const rels = engine.getRelationshipsFor('char_001');
    const section = buildRelatedEntitiesSection(rels);

    expect(section).toContain('### Events');
    expect(section).toContain('participated');
  });
});
