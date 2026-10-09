export interface DetectionReason {
  rule: string;
  description: string;
  score: number;
}

export interface LanguageCandidate {
  language: string;
  score: number;
  reasons: DetectionReason[];
}

export interface DetectionResult {
  language: string;
  score: number;
  source: "metadata" | "content" | "unknown";
  candidates: LanguageCandidate[];
  reasons: DetectionReason[];
}

export interface DetectionContext {
  /** Original trimmed text; useful for strict JSON validation. */
  code: string;
  /** Comments removed, quoted strings preserved. */
  text: string;
  /** Payloads/comments masked; template expressions and JSX structure retained, with aligned line breaks. */
  syntax: string;
}

export interface RuleMatch extends DetectionReason {
  /** A compound, characteristic structure can qualify on its own. */
  distinctive: boolean;
}

export interface LanguageRule {
  name: string;
  aliases: readonly string[];
  detect(context: DetectionContext): readonly RuleMatch[];
}

export interface DetectorOptions {
  minimumScore?: number;
  minimumMargin?: number;
}

export interface CodeBlockResult extends DetectionResult {
  element: HTMLPreElement;
  codeElement: HTMLElement | null;
  code: string;
}
