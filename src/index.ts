import { createDetector } from "./core/detector.js";
import { LanguageRegistry } from "./core/registry.js";
import { defaultLanguages } from "./languages/index.js";
import { createCodeBlockDetector } from "./dom/code-blocks.js";

export const defaultRegistry = new LanguageRegistry(defaultLanguages);
export const detectLanguage = createDetector(defaultRegistry);
export const detectCodeBlocks = createCodeBlockDetector(defaultRegistry, detectLanguage);

export { createDetector, LanguageRegistry, createCodeBlockDetector, defaultLanguages };
export { defineLanguage, matchPatterns } from "./core/patterns.js";
export type { Pattern } from "./core/patterns.js";
export type {
  DetectionContext, DetectionReason, DetectionResult, DetectorOptions,
  LanguageCandidate, LanguageRule, RuleMatch, CodeBlockResult,
} from "./core/types.js";
