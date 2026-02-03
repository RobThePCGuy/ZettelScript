/**
 * Reciprocal Rank Fusion (RRF) implementation
 *
 * Algorithm:
 * for each result in semantic_results:
 *     rrf_score += semantic_weight * (1 / (k + rank))
 * for each result in lexical_results:
 *     rrf_score += lexical_weight * (1 / (k + rank))
 * sort by rrf_score descending
 */

export interface RankedItem {
  id: string;
  score: number;
  source: string;
}

export interface FusionResult {
  id: string;
  score: number;
  sources: string[];
  ranks: Map<string, number>;
}

export interface RRFOptions {
  k?: number; // RRF constant (default 60)
  weights?: Record<string, number>; // Weights per source
}

/**
 * Perform Reciprocal Rank Fusion on multiple result lists
 */
export function reciprocalRankFusion(
  resultLists: Map<string, RankedItem[]>,
  options: RRFOptions = {}
): FusionResult[] {
  const k = options.k ?? 60;
  const weights = options.weights ?? {};

  // Collect scores for each item
  const scores = new Map<
    string,
    {
      score: number;
      sources: Set<string>;
      ranks: Map<string, number>;
    }
  >();

  for (const [source, items] of resultLists) {
    const weight = weights[source] ?? 1.0;

    for (let rank = 0; rank < items.length; rank++) {
      const item = items[rank];
      if (!item) continue;

      const rrfScore = weight * (1 / (k + rank + 1)); // rank is 0-indexed, formula expects 1-indexed

      const existing = scores.get(item.id);
      if (existing) {
        existing.score += rrfScore;
        existing.sources.add(source);
        existing.ranks.set(source, rank + 1);
      } else {
        scores.set(item.id, {
          score: rrfScore,
          sources: new Set([source]),
          ranks: new Map([[source, rank + 1]]),
        });
      }
    }
  }

  // Convert to results and sort
  const results: FusionResult[] = [];
  for (const [id, data] of scores) {
    results.push({
      id,
      score: data.score,
      sources: Array.from(data.sources),
      ranks: data.ranks,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Simple score combination (weighted average)
 */
export function weightedScoreFusion(
  resultLists: Map<string, RankedItem[]>,
  weights: Record<string, number>
): FusionResult[] {
  const scores = new Map<
    string,
    {
      totalScore: number;
      totalWeight: number;
      sources: Set<string>;
      ranks: Map<string, number>;
    }
  >();

  for (const [source, items] of resultLists) {
    const weight = weights[source] ?? 1.0;

    for (let rank = 0; rank < items.length; rank++) {
      const item = items[rank];
      if (!item) continue;

      const existing = scores.get(item.id);
      if (existing) {
        existing.totalScore += item.score * weight;
        existing.totalWeight += weight;
        existing.sources.add(source);
        existing.ranks.set(source, rank + 1);
      } else {
        scores.set(item.id, {
          totalScore: item.score * weight,
          totalWeight: weight,
          sources: new Set([source]),
          ranks: new Map([[source, rank + 1]]),
        });
      }
    }
  }

  const results: FusionResult[] = [];
  for (const [id, data] of scores) {
    results.push({
      id,
      score: data.totalScore / data.totalWeight,
      sources: Array.from(data.sources),
      ranks: data.ranks,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Interleave results from multiple sources
 */
export function interleave(
  resultLists: Map<string, RankedItem[]>,
  maxResults: number
): FusionResult[] {
  const seen = new Set<string>();
  const results: FusionResult[] = [];
  const sources = Array.from(resultLists.keys());
  const indices = new Map(sources.map((s) => [s, 0]));

  while (results.length < maxResults) {
    let added = false;

    for (const source of sources) {
      const items = resultLists.get(source) ?? [];
      let idx = indices.get(source) ?? 0;

      while (idx < items.length) {
        const item = items[idx];
        idx++;
        indices.set(source, idx);

        if (!item || seen.has(item.id)) continue;

        seen.add(item.id);
        results.push({
          id: item.id,
          score: item.score,
          sources: [source],
          ranks: new Map([[source, idx]]),
        });
        added = true;
        break;
      }

      if (results.length >= maxResults) break;
    }

    if (!added) break;
  }

  return results;
}

/**
 * Combine fusion results with score boosting for items in multiple sources
 */
export function boostOverlap(results: FusionResult[], boostFactor: number = 1.2): FusionResult[] {
  return results
    .map((r) => ({
      ...r,
      score: r.score * Math.pow(boostFactor, r.sources.length - 1),
    }))
    .sort((a, b) => b.score - a.score);
}
