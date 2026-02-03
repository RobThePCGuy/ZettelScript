import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkStringify from 'remark-stringify';
import type { Root, Content, Heading, Paragraph, Text } from 'mdast';
import type { WikiLink, Frontmatter, NodeType } from '../core/types/index.js';
import { parseFrontmatter, extractTitle, extractNodeType, extractAliases } from './frontmatter.js';
import { extractWikilinks, type WikiLinkParseResult } from './wikilink.js';
import type { ExclusionZone } from './exclusions.js';

export interface ParsedMarkdown {
  frontmatter: Frontmatter | null;
  title: string;
  type: NodeType;
  aliases: string[];
  content: string;
  contentStartOffset: number;
  links: WikiLink[];
  exclusionZones: ExclusionZone[];
  headings: Array<{
    level: number;
    text: string;
    position: { start: number; end: number };
  }>;
  paragraphs: Array<{
    text: string;
    position: { start: number; end: number };
  }>;
  ast: Root;
}

/**
 * Create the unified markdown processor
 */
function createProcessor() {
  return unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).use(remarkStringify);
}

/**
 * Parse a markdown document into structured data
 */
export function parseMarkdown(source: string, filePath: string): ParsedMarkdown {
  // Parse frontmatter first
  const { frontmatter, content, contentStartOffset } = parseFrontmatter(source, filePath);

  // Extract title, type, and aliases from frontmatter
  const title = extractTitle(frontmatter, content, filePath);
  const type = extractNodeType(frontmatter) as NodeType;
  const aliases = extractAliases(frontmatter);

  // Extract wikilinks
  const linkResult: WikiLinkParseResult = extractWikilinks(content, contentStartOffset);

  // Parse AST
  const processor = createProcessor();
  const ast = processor.parse(source) as Root;

  // Extract headings and paragraphs
  const headings: ParsedMarkdown['headings'] = [];
  const paragraphs: ParsedMarkdown['paragraphs'] = [];

  function visitNode(node: Content) {
    if (node.type === 'heading' && node.position) {
      const heading = node as Heading;
      const text = getTextContent(heading);
      headings.push({
        level: heading.depth,
        text,
        position: {
          start: node.position.start.offset ?? 0,
          end: node.position.end.offset ?? 0,
        },
      });
    }

    if (node.type === 'paragraph' && node.position) {
      const paragraph = node as Paragraph;
      const text = getTextContent(paragraph);
      paragraphs.push({
        text,
        position: {
          start: node.position.start.offset ?? 0,
          end: node.position.end.offset ?? 0,
        },
      });
    }

    // Recurse into children
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        visitNode(child as Content);
      }
    }
  }

  for (const node of ast.children) {
    visitNode(node);
  }

  return {
    frontmatter,
    title,
    type,
    aliases,
    content,
    contentStartOffset,
    links: linkResult.links,
    exclusionZones: linkResult.exclusionZones,
    headings,
    paragraphs,
    ast,
  };
}

/**
 * Get text content from an AST node
 */
function getTextContent(node: Content): string {
  if (node.type === 'text') {
    return (node as Text).value;
  }

  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => getTextContent(child as Content)).join('');
  }

  return '';
}

/**
 * Extract plain text from markdown (strips formatting)
 */
export function extractPlainText(source: string): string {
  const processor = createProcessor();
  const ast = processor.parse(source) as Root;

  function getText(node: Content): string {
    if (node.type === 'text') {
      return (node as Text).value;
    }

    if (node.type === 'code') {
      return ''; // Skip code blocks
    }

    if (node.type === 'yaml') {
      return ''; // Skip frontmatter
    }

    if ('children' in node && Array.isArray(node.children)) {
      return node.children.map((child) => getText(child as Content)).join(' ');
    }

    return '';
  }

  return ast.children
    .map((node) => getText(node))
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split content into sections based on headings
 */
export function splitIntoSections(parsed: ParsedMarkdown): Array<{
  heading: string | null;
  level: number;
  content: string;
  start: number;
  end: number;
}> {
  const sections: Array<{
    heading: string | null;
    level: number;
    content: string;
    start: number;
    end: number;
  }> = [];

  const source = parsed.content;

  if (parsed.headings.length === 0) {
    // No headings - entire content is one section
    return [
      {
        heading: null,
        level: 0,
        content: source,
        start: parsed.contentStartOffset,
        end: parsed.contentStartOffset + source.length,
      },
    ];
  }

  // Content before first heading
  const firstHeading = parsed.headings[0];
  if (firstHeading && firstHeading.position.start > parsed.contentStartOffset) {
    const contentBefore = source.slice(0, firstHeading.position.start - parsed.contentStartOffset);
    if (contentBefore.trim()) {
      sections.push({
        heading: null,
        level: 0,
        content: contentBefore,
        start: parsed.contentStartOffset,
        end: firstHeading.position.start,
      });
    }
  }

  // Process each heading and its content
  for (let i = 0; i < parsed.headings.length; i++) {
    const heading = parsed.headings[i];
    const nextHeading = parsed.headings[i + 1];

    if (!heading) continue;

    const start = heading.position.end;
    const end = nextHeading
      ? nextHeading.position.start
      : parsed.contentStartOffset + source.length;

    const content = source.slice(
      start - parsed.contentStartOffset,
      end - parsed.contentStartOffset
    );

    sections.push({
      heading: heading.text,
      level: heading.level,
      content: content.trim(),
      start,
      end,
    });
  }

  return sections;
}

/**
 * Split content into paragraphs
 */
export function splitIntoParagraphs(content: string): Array<{
  text: string;
  start: number;
  end: number;
}> {
  const paragraphs: Array<{ text: string; start: number; end: number }> = [];

  // Split by blank lines
  const regex = /(?:\r?\n){2,}/g;
  let lastEnd = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const text = content.slice(lastEnd, match.index).trim();
    if (text) {
      paragraphs.push({
        text,
        start: lastEnd,
        end: match.index,
      });
    }
    lastEnd = match.index + match[0].length;
  }

  // Last paragraph
  const remaining = content.slice(lastEnd).trim();
  if (remaining) {
    paragraphs.push({
      text: remaining,
      start: lastEnd,
      end: content.length,
    });
  }

  return paragraphs;
}

/**
 * Stringify markdown AST back to text
 */
export function stringifyMarkdown(ast: Root): string {
  const processor = createProcessor();
  return processor.stringify(ast);
}
