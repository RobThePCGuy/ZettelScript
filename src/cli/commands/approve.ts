import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { initContext } from '../utils.js';
import { generateSuggestionId, isUndirectedEdgeType } from '../../core/types/index.js';
import type { EdgeType } from '../../core/types/index.js';

/**
 * Response shape for JSON mode per Phase 2 Design Section 10.2
 */
interface ApproveResponse {
  success: boolean;
  warnings?: string[];
  error?: string;
  errorCode?: 'NOT_VAULT' | 'DB_ERROR' | 'INVALID_ARGS' | 'NOT_FOUND' | 'COMPUTE_ERROR';
  idempotent?: boolean;

  // Success details
  suggestionId?: string;
  fromId?: string;
  fromTitle?: string;
  toId?: string;
  toTitle?: string;
  edgeId?: string;
  edgeType?: string;

  // Writeback details
  writeback?: 'success' | 'skipped' | 'failed';
  writebackReason?: string;
  writebackPath?: string;
}

/**
 * Insert a wikilink into a markdown file at the appropriate location.
 * Per Phase 2 Design Section 5.3:
 * - Do NOT modify YAML frontmatter
 * - Use Links section in body only
 * - If ambiguous: use end of file
 * - If file read-only: skip writeback, succeed in DB
 *
 * @returns Object with status and reason
 */
async function insertWikilink(
  filePath: string,
  targetPath: string,
  targetTitle: string,
  vaultPath: string
): Promise<{ status: 'success' | 'skipped' | 'failed'; reason?: string; path?: string }> {
  const absolutePath = path.join(vaultPath, filePath);

  // Check if file exists
  if (!fs.existsSync(absolutePath)) {
    return { status: 'skipped', reason: 'Source file not found' };
  }

  // Check if file is readable
  let content: string;
  try {
    content = fs.readFileSync(absolutePath, 'utf-8');
  } catch {
    return { status: 'failed', reason: 'Could not read source file' };
  }

  // Build the wikilink text
  // Safe format: includes path when needed for disambiguation
  const linkText = targetPath.includes('/')
    ? `[[${targetPath.replace(/\.md$/, '')}|${targetTitle}]]`
    : `[[${targetTitle}]]`;

  // Check if link already exists (avoid duplicates)
  if (content.includes(linkText) || content.includes(`[[${targetTitle}]]`)) {
    return { status: 'skipped', reason: 'Link already exists in file' };
  }

  // Find insertion point
  const lines = content.split('\n');
  let insertionIndex = lines.length;
  let linksSectionFound = false;

  // Skip YAML frontmatter
  let bodyStartIndex = 0;
  if (lines[0]?.trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === '---') {
        bodyStartIndex = i + 1;
        break;
      }
    }
  }

  // Look for existing Links section
  for (let i = bodyStartIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line && /^##?\s*links?\s*$/i.test(line)) {
      linksSectionFound = true;
      // Find end of this section (next heading or end of file)
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j] && /^##?\s/.test(lines[j])) {
          insertionIndex = j;
          break;
        }
      }
      if (!linksSectionFound) {
        insertionIndex = lines.length;
      }
      insertionIndex = i + 1; // Insert right after the Links header
      break;
    }
  }

  // If no Links section, insert at end of file (before trailing blanks)
  if (!linksSectionFound) {
    // Find last non-blank line
    for (let i = lines.length - 1; i >= bodyStartIndex; i--) {
      if (lines[i]?.trim()) {
        insertionIndex = i + 1;
        break;
      }
    }
  }

  // Insert the link
  const prefix = linksSectionFound ? '- ' : '\n- ';
  lines.splice(insertionIndex, 0, prefix + linkText);
  const newContent = lines.join('\n');

  // Atomic write (tmp + rename)
  const tmpPath = absolutePath + '.tmp.' + Date.now();
  try {
    fs.writeFileSync(tmpPath, newContent, 'utf-8');
    fs.renameSync(tmpPath, absolutePath);
    return { status: 'success', path: filePath };
  } catch (err) {
    // Clean up tmp file if it exists
    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    return {
      status: 'failed',
      reason: err instanceof Error ? err.message : 'Unknown write error',
    };
  }
}

export const approveCommand = new Command('approve')
  .description('Approve a suggested link, converting it to a truth edge')
  .option('--suggestion-id <id>', 'The suggestion ID to approve')
  .option('--from <id>', 'Source node ID (alternative to --suggestion-id)')
  .option('--to <id>', 'Target node ID (alternative to --suggestion-id)')
  .option('--type <type>', 'Edge type (alternative to --suggestion-id)', 'explicit_link')
  .option('--json', 'Output JSON response')
  .option('--no-writeback', 'Skip markdown file modification')
  .action(async (options) => {
    const response: ApproveResponse = { success: false };

    const outputJson = () => {
      if (options.json) {
        console.log(JSON.stringify(response));
      }
    };

    try {
      const ctx = await initContext();

      // Determine suggestionId
      let suggestionId: string;

      if (options.suggestionId) {
        suggestionId = options.suggestionId;
      } else if (options.from && options.to) {
        // Generate suggestionId from components
        const edgeType = options.type as EdgeType;
        const isUndirected = isUndirectedEdgeType(edgeType);
        suggestionId = generateSuggestionId(options.from, options.to, edgeType, isUndirected);
      } else {
        response.error = 'Must provide --suggestion-id or both --from and --to';
        response.errorCode = 'INVALID_ARGS';
        if (options.json) {
          outputJson();
        } else {
          console.error('Error:', response.error);
        }
        ctx.connectionManager.close();
        process.exit(1);
      }

      // Load candidate edge
      const candidate = await ctx.candidateEdgeRepository.findById(suggestionId);

      if (!candidate) {
        response.error = `Suggestion not found: ${suggestionId}`;
        response.errorCode = 'NOT_FOUND';
        if (options.json) {
          outputJson();
        } else {
          console.error('Error:', response.error);
        }
        ctx.connectionManager.close();
        process.exit(1);
      }

      // Check if already approved (idempotent)
      if (candidate.status === 'approved') {
        response.success = true;
        response.idempotent = true;
        response.suggestionId = suggestionId;
        response.fromId = candidate.fromId;
        response.toId = candidate.toId;
        response.edgeType = candidate.suggestedEdgeType;
        response.edgeId = candidate.approvedEdgeId;

        if (options.json) {
          outputJson();
        } else {
          console.log('Already approved (idempotent)');
        }
        ctx.connectionManager.close();
        return;
      }

      // Check if rejected (can't approve rejected)
      if (candidate.status === 'rejected') {
        response.error = 'Cannot approve a rejected suggestion. Unreject first.';
        response.errorCode = 'INVALID_ARGS';
        if (options.json) {
          outputJson();
        } else {
          console.error('Error:', response.error);
        }
        ctx.connectionManager.close();
        process.exit(1);
      }

      // Get node info for response
      const fromNode = await ctx.nodeRepository.findById(candidate.fromId);
      const toNode = await ctx.nodeRepository.findById(candidate.toId);

      // Transaction 1: Insert truth edge and update candidate status
      const truthEdge = await ctx.edgeRepository.create({
        sourceId: candidate.fromId,
        targetId: candidate.toId,
        edgeType: candidate.suggestedEdgeType,
        provenance: 'user_approved',
        strength: candidate.signals?.semantic,
      });

      await ctx.candidateEdgeRepository.updateStatus(
        suggestionId,
        'approved',
        truthEdge.edgeId
      );

      response.success = true;
      response.suggestionId = suggestionId;
      response.fromId = candidate.fromId;
      response.fromTitle = fromNode?.title;
      response.toId = candidate.toId;
      response.toTitle = toNode?.title;
      response.edgeId = truthEdge.edgeId;
      response.edgeType = candidate.suggestedEdgeType;

      // Attempt markdown writeback (unless disabled)
      if (options.writeback !== false && fromNode && toNode && !fromNode.isGhost) {
        const writebackResult = await insertWikilink(
          fromNode.path,
          toNode.path,
          toNode.title,
          ctx.vaultPath
        );

        response.writeback = writebackResult.status;
        response.writebackReason = writebackResult.reason;
        response.writebackPath = writebackResult.path;

        // Record writeback status
        await ctx.candidateEdgeRepository.update(suggestionId, {
          writebackStatus: writebackResult.status,
          writebackReason: writebackResult.reason,
        });

        // Writeback failure is a warning, not failure
        if (writebackResult.status === 'failed') {
          response.warnings = response.warnings || [];
          response.warnings.push(`Writeback failed: ${writebackResult.reason}`);
        }
      } else {
        response.writeback = 'skipped';
        if (fromNode?.isGhost) {
          response.writebackReason = 'Source is a ghost node';
        } else if (!fromNode) {
          response.writebackReason = 'Source node not found';
        } else if (options.writeback === false) {
          response.writebackReason = 'Disabled by flag';
        }
      }

      if (options.json) {
        outputJson();
      } else {
        console.log(`Approved: ${fromNode?.title || candidate.fromId} -> ${toNode?.title || candidate.toId}`);
        console.log(`  Edge ID: ${truthEdge.edgeId}`);
        console.log(`  Type: ${candidate.suggestedEdgeType}`);
        if (response.writeback === 'success') {
          console.log(`  Writeback: Link added to ${response.writebackPath}`);
        } else if (response.writeback === 'failed') {
          console.log(`  Writeback failed: ${response.writebackReason}`);
        } else {
          console.log(`  Writeback skipped: ${response.writebackReason}`);
        }
      }

      ctx.connectionManager.close();
    } catch (error) {
      response.error = error instanceof Error ? error.message : String(error);
      response.errorCode = 'DB_ERROR';
      if (options.json) {
        outputJson();
      } else {
        console.error('Error:', response.error);
      }
      process.exit(1);
    }
  });
