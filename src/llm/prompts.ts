/**
 * Prompt templates for LLM-assisted features
 */

export interface RewriteContext {
  sceneTitle: string;
  sceneContent: string;
  goal: string;
  characterContext: Array<{ name: string; details: string }>;
  timelineContext: Array<{ title: string; position: string }>;
  relatedContent: Array<{ title: string; excerpt: string }>;
  povCharacter?: string;
}

/**
 * Build a prompt for scene rewrite suggestions
 */
export function buildRewritePrompt(context: RewriteContext): string {
  const parts: string[] = [];

  parts.push('You are a creative writing assistant helping to rewrite a scene from a manuscript.');
  parts.push('');
  parts.push('## Current Scene');
  parts.push(`Title: ${context.sceneTitle}`);
  if (context.povCharacter) {
    parts.push(`POV Character: ${context.povCharacter}`);
  }
  parts.push('');
  parts.push('Content:');
  parts.push('```');
  parts.push(context.sceneContent);
  parts.push('```');
  parts.push('');
  parts.push(`## Rewrite Goal`);
  parts.push(context.goal);
  parts.push('');

  if (context.characterContext.length > 0) {
    parts.push('## Character Context');
    for (const char of context.characterContext) {
      parts.push(`### ${char.name}`);
      parts.push(char.details);
      parts.push('');
    }
  }

  if (context.timelineContext.length > 0) {
    parts.push('## Timeline Context');
    for (const scene of context.timelineContext) {
      parts.push(`- ${scene.title} (${scene.position})`);
    }
    parts.push('');
  }

  if (context.relatedContent.length > 0) {
    parts.push('## Related Scenes');
    for (const related of context.relatedContent.slice(0, 5)) {
      parts.push(`### ${related.title}`);
      parts.push(related.excerpt);
      parts.push('');
    }
  }

  parts.push('## Instructions');
  parts.push('Based on the context above, provide specific suggestions for how to rewrite this scene to achieve the stated goal.');
  parts.push('');
  parts.push('Please provide:');
  parts.push('1. A brief analysis of how the current scene could be improved');
  parts.push('2. Specific suggestions for changes (what to add, remove, or modify)');
  parts.push('3. An example of a rewritten opening paragraph or key section');
  parts.push('');
  parts.push('Maintain consistency with the established characters, timeline, and POV.');

  return parts.join('\n');
}

/**
 * Build a prompt for mention disambiguation
 */
export function buildDisambiguationPrompt(
  surfaceText: string,
  context: string,
  candidates: Array<{ title: string; type: string; description?: string }>
): string {
  const parts: string[] = [];

  parts.push('You are helping to identify which entity is being referenced in a piece of text.');
  parts.push('');
  parts.push('## Text containing the mention');
  parts.push('```');
  parts.push(context);
  parts.push('```');
  parts.push('');
  parts.push(`The highlighted mention is: "${surfaceText}"`);
  parts.push('');
  parts.push('## Possible matches');
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (c) {
      parts.push(`${i + 1}. ${c.title} (${c.type})${c.description ? `: ${c.description}` : ''}`);
    }
  }
  parts.push('');
  parts.push('Which entity (1-' + candidates.length + ') is most likely being referenced? Respond with just the number.');

  return parts.join('\n');
}

/**
 * Build a prompt for continuity checking
 */
export function buildContinuityCheckPrompt(
  scene1: { title: string; content: string; pov?: string },
  scene2: { title: string; content: string; pov?: string }
): string {
  const parts: string[] = [];

  parts.push('You are a continuity editor checking for consistency between two scenes in a manuscript.');
  parts.push('');
  parts.push('## Scene 1');
  parts.push(`Title: ${scene1.title}`);
  if (scene1.pov) parts.push(`POV: ${scene1.pov}`);
  parts.push('```');
  parts.push(scene1.content.slice(0, 2000));
  if (scene1.content.length > 2000) parts.push('... [truncated]');
  parts.push('```');
  parts.push('');
  parts.push('## Scene 2');
  parts.push(`Title: ${scene2.title}`);
  if (scene2.pov) parts.push(`POV: ${scene2.pov}`);
  parts.push('```');
  parts.push(scene2.content.slice(0, 2000));
  if (scene2.content.length > 2000) parts.push('... [truncated]');
  parts.push('```');
  parts.push('');
  parts.push('## Task');
  parts.push('Identify any continuity issues between these scenes, such as:');
  parts.push('- Character inconsistencies (different descriptions, abilities, or knowledge)');
  parts.push('- Timeline problems');
  parts.push('- Setting/location inconsistencies');
  parts.push('- POV violations (character knowing things they shouldn\'t)');
  parts.push('');
  parts.push('List each issue found with a brief explanation, or state "No continuity issues found."');

  return parts.join('\n');
}
