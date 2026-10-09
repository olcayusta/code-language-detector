import { createContext } from "./context.js";
import type { LanguageRegistry } from "./registry.js";
import type { DetectionResult, DetectorOptions, LanguageCandidate } from "./types.js";

function unknown(candidates: LanguageCandidate[] = []): DetectionResult {
  return { language: "unknown", score: 0, source: "unknown", candidates, reasons: [] };
}

export function createDetector(registry: LanguageRegistry, options: DetectorOptions = {}) {
  const minimumScore = options.minimumScore ?? 5;
  const minimumMargin = options.minimumMargin ?? 2;
  if (!Number.isFinite(minimumScore) || minimumScore <= 0 || !Number.isFinite(minimumMargin) || minimumMargin < 1) {
    throw new Error("minimumScore must be positive; minimumMargin must be at least 1.");
  }

  return (code: string): DetectionResult => {
    const context = createContext(code);
    if (!context.code) return unknown();

    const candidates: LanguageCandidate[] = [];
    const qualified = new Set<string>();
    for (const language of registry.getAll()) {
      // Custom rules may return duplicate IDs; count each evidence item once.
      const unique = new Map<string, ReturnType<typeof language.detect>[number]>();
      for (const match of language.detect(context)) {
        const previous = unique.get(match.rule);
        if (!previous || match.score > previous.score
            || (match.score === previous.score && match.distinctive && !previous.distinctive)) unique.set(match.rule, match);
      }
      const matches = [...unique.values()];
      const score = matches.reduce((sum, match) => sum + match.score, 0);
      if (score <= 0) continue;
      candidates.push({
        language: language.name,
        score,
        reasons: matches.map(({ rule, description, score }) => ({ rule, description, score })),
      });
      if (score >= minimumScore && (matches.some((match) => match.distinctive) || matches.length >= 2)) {
        qualified.add(language.name);
      }
    }
    candidates.sort((a, b) => b.score - a.score || a.language.localeCompare(b.language));
    const best = candidates[0];
    const runnerUp = candidates[1];
    if (!best || !qualified.has(best.language) || (runnerUp && best.score - runnerUp.score < minimumMargin)) {
      return unknown(candidates);
    }
    return { language: best.language, score: best.score, source: "content", candidates, reasons: best.reasons };
  };
}
