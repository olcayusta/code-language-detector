import type { DetectionContext, LanguageRule, RuleMatch } from "./types.js";

export interface Pattern {
  id: string;
  description: string;
  score: number;
  distinctive?: boolean;
  /** Alternative rules describing the same evidence score only once. */
  group?: string;
  target?: keyof DetectionContext;
  test: RegExp | ((value: string) => boolean);
}

export function matchPatterns(context: DetectionContext, patterns: readonly Pattern[]): RuleMatch[] {
  const matches: RuleMatch[] = [];
  const groups = new Map<string, number>();
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
      const result = {
        rule: pattern.id,
        description: pattern.description,
        score: pattern.score,
        distinctive: pattern.distinctive ?? false,
      };
      const index = pattern.group ? groups.get(pattern.group) : undefined;
      if (index === undefined) {
        if (pattern.group) groups.set(pattern.group, matches.length);
        matches.push(result);
      } else if (result.score > matches[index]!.score
          || (result.score === matches[index]!.score && result.distinctive && !matches[index]!.distinctive)) matches[index] = result;
    }
  }
  return matches;
}

export function defineLanguage(name: string, aliases: readonly string[], patterns: readonly Pattern[]): LanguageRule {
  return { name, aliases, detect: (context) => matchPatterns(context, patterns) };
}
