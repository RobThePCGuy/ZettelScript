import { describe, it, expect } from 'vitest';
import { extractWikilinks, createWikilink, normalizeTarget, targetsMatch } from '../../src/parser/wikilink.js';
import { parseFrontmatter, extractTitle, extractAliases } from '../../src/parser/frontmatter.js';
import { findExclusionZones, isInExclusionZone, filterExcludedMatches } from '../../src/parser/exclusions.js';
import { parseMarkdown } from '../../src/parser/markdown.js';

describe('Wikilink Parser', () => {
  it('should extract simple wikilinks', () => {
    const content = 'This links to [[Node A]] and [[Node B]].';
    const { links } = extractWikilinks(content);

    expect(links).toHaveLength(2);
    expect(links[0]?.target).toBe('Node A');
    expect(links[1]?.target).toBe('Node B');
  });

  it('should extract wikilinks with display text', () => {
    const content = 'See [[Node A|the first node]] for details.';
    const { links } = extractWikilinks(content);

    expect(links).toHaveLength(1);
    expect(links[0]?.target).toBe('Node A');
    expect(links[0]?.display).toBe('the first node');
  });

  it('should extract id: prefixed links', () => {
    const content = 'Direct link: [[id:abc123]].';
    const { links } = extractWikilinks(content);

    expect(links).toHaveLength(1);
    expect(links[0]?.target).toBe('abc123');
    expect(links[0]?.isIdLink).toBe(true);
  });

  it('should capture link positions', () => {
    const content = 'Start [[Link]] end.';
    const { links } = extractWikilinks(content);

    expect(links[0]?.start).toBe(6);
    expect(links[0]?.end).toBe(14);
  });

  it('should create wikilinks correctly', () => {
    expect(createWikilink('Node A')).toBe('[[Node A]]');
    expect(createWikilink('Node A', 'display')).toBe('[[Node A|display]]');
    expect(createWikilink('abc123', undefined, true)).toBe('[[id:abc123]]');
  });

  it('should normalize targets', () => {
    expect(normalizeTarget('  Node A  ')).toBe('Node A');
    expect(normalizeTarget('Node   A')).toBe('Node A');
  });

  it('should match targets case-insensitively', () => {
    expect(targetsMatch('Node A', 'node a')).toBe(true);
    expect(targetsMatch('Node A', 'NODE A')).toBe(true);
    expect(targetsMatch('Node A', 'Node B')).toBe(false);
  });
});

describe('Frontmatter Parser', () => {
  it('should parse YAML frontmatter', () => {
    const source = `---
title: My Note
type: scene
tags:
  - important
  - draft
---

Content here.`;

    const result = parseFrontmatter(source, 'test.md');

    expect(result.frontmatter?.title).toBe('My Note');
    expect(result.frontmatter?.type).toBe('scene');
    expect(result.frontmatter?.tags).toEqual(['important', 'draft']);
    expect(result.content).toBe('\nContent here.');
  });

  it('should handle missing frontmatter', () => {
    const source = 'Just content, no frontmatter.';
    const result = parseFrontmatter(source, 'test.md');

    expect(result.frontmatter).toBeNull();
    expect(result.content).toBe(source);
    expect(result.contentStartOffset).toBe(0);
  });

  it('should extract title from frontmatter', () => {
    const frontmatter = { title: 'My Title' };
    expect(extractTitle(frontmatter, '# Heading', 'test.md')).toBe('My Title');
  });

  it('should extract title from first heading', () => {
    expect(extractTitle(null, '# First Heading\n\nContent', 'test.md')).toBe('First Heading');
  });

  it('should extract title from filename', () => {
    expect(extractTitle(null, 'No heading here', 'my-note.md')).toBe('my-note');
  });

  it('should extract aliases', () => {
    const frontmatter = { aliases: ['alias1', 'alias2'] };
    expect(extractAliases(frontmatter)).toEqual(['alias1', 'alias2']);
    expect(extractAliases(null)).toEqual([]);
    expect(extractAliases({})).toEqual([]);
  });
});

describe('Exclusion Zones', () => {
  it('should find code blocks', () => {
    const content = 'Text before\n```js\ncode here\n```\nText after';
    const zones = findExclusionZones(content);

    expect(zones.some(z => z.type === 'code_block')).toBe(true);
  });

  it('should find inline code', () => {
    const content = 'Use `inline code` here.';
    const zones = findExclusionZones(content);

    expect(zones.some(z => z.type === 'inline_code')).toBe(true);
  });

  it('should find URLs', () => {
    const content = 'Visit https://example.com for more.';
    const zones = findExclusionZones(content);

    expect(zones.some(z => z.type === 'url')).toBe(true);
  });

  it('should find existing wikilinks', () => {
    const content = 'See [[existing link]] here.';
    const zones = findExclusionZones(content);

    expect(zones.some(z => z.type === 'existing_link')).toBe(true);
  });

  it('should check if position is in exclusion zone', () => {
    const zones = [{ start: 10, end: 20, type: 'code_block' as const }];

    expect(isInExclusionZone(5, zones)).toBe(false);
    expect(isInExclusionZone(15, zones)).toBe(true);
    expect(isInExclusionZone(25, zones)).toBe(false);
  });

  it('should filter excluded matches', () => {
    const matches = [
      { start: 5, end: 10 },
      { start: 15, end: 18 },
      { start: 25, end: 30 },
    ];
    const zones = [{ start: 10, end: 20, type: 'code_block' as const }];

    const filtered = filterExcludedMatches(matches, zones);

    expect(filtered).toHaveLength(2);
    expect(filtered[0]?.start).toBe(5);
    expect(filtered[1]?.start).toBe(25);
  });
});

describe('Markdown Parser', () => {
  it('should parse a complete document', () => {
    const source = `---
title: Test Document
type: note
aliases:
  - test
  - doc
---

# Heading

This links to [[Another Note]].

## Subheading

More content here.`;

    const result = parseMarkdown(source, 'test.md');

    expect(result.title).toBe('Test Document');
    expect(result.type).toBe('note');
    expect(result.aliases).toEqual(['test', 'doc']);
    expect(result.links).toHaveLength(1);
    expect(result.links[0]?.target).toBe('Another Note');
    expect(result.headings).toHaveLength(2);
    expect(result.headings[0]?.text).toBe('Heading');
    expect(result.headings[0]?.level).toBe(1);
  });

  it('should handle documents without frontmatter', () => {
    const source = '# Simple Note\n\nJust content.';
    const result = parseMarkdown(source, 'simple.md');

    expect(result.frontmatter).toBeNull();
    expect(result.title).toBe('Simple Note');
    expect(result.type).toBe('note');
  });
});
