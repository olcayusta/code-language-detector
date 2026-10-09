import type { DetectionContext, LanguageRule, RuleMatch } from "./types.js";

export interface Pattern {
  id: string;
  description: string;
  score: number;
  distinctive?: boolean;
  target?: keyof DetectionContext;
  test: RegExp | ((value: string) => boolean);
}

export function matchPatterns(context: DetectionContext, patterns: readonly Pattern[]): RuleMatch[] {
  const matches: RuleMatch[] = [];
  for (const pattern of patterns) {
    const value = context[pattern.target ?? "syntax"];
    // Each rule scores once, so repeating a keyword cannot inflate its score.
    const test = pattern.test;
    const matched = typeof test === "function"
      ? test(value)
      : (test.global || test.sticky
          ? new RegExp(test.source, test.flags.replace(/[gy]/g, ""))
          : test).test(value);
    if (matched) {
      matches.push({
        rule: pattern.id,
        description: pattern.description,
        score: pattern.score,
        distinctive: pattern.distinctive ?? false,
      });
    }
  }
  return matches;
}

export function defineLanguage(name: string, aliases: readonly string[], patterns: readonly Pattern[]): LanguageRule {
  return { name, aliases, detect: (context) => matchPatterns(context, patterns) };
}
