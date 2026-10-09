import { createDetector } from "../core/detector.js";
import type { LanguageRegistry } from "../core/registry.js";
import type { CodeBlockResult, DetectionResult } from "../core/types.js";

function readMetadata(element: Element, registry: LanguageRegistry): DetectionResult | undefined {
  for (const attribute of ["data-language", "data-lang", "lang", "class"]) {
    const value = element.getAttribute(attribute);
    if (!value) continue;
    const values = attribute === "class" ? value.split(/\s+/) : [value];
    for (const token of values) {
      const language = registry.resolve(token.replace(/^(?:language|lang)-/i, ""));
      if (!language) continue;
      return {
        language, score: 0, source: "metadata", candidates: [],
        reasons: [{ rule: `metadata-${attribute}`, description: `${element.tagName.toLowerCase()}[${attribute}]: ${token}`, score: 0 }],
      };
    }
  }
  return undefined;
}

export function createCodeBlockDetector(
  registry: LanguageRegistry,
  detect = createDetector(registry),
) {
  return (root?: ParentNode): CodeBlockResult[] => {
    const scope = root ?? (typeof document === "undefined" ? undefined : document);
    if (!scope) throw new Error("detectCodeBlocks needs a DOM root in Node.js; use detectLanguage for text.");
    const blocks = [...scope.querySelectorAll<HTMLPreElement>("pre")];
    // querySelectorAll excludes the root itself.
    if ("tagName" in scope && scope.tagName === "PRE") blocks.unshift(scope as HTMLPreElement);
    const blockSet = new Set(blocks);
    return blocks.filter((element) => {
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (blockSet.has(parent as HTMLPreElement)) return false;
      }
      return true;
    }).map((element) => {
      const codeElement = element.querySelector<HTMLElement>("code");
      // textContent preserves whitespace and lets the DOM decode entities.
      const code = element.textContent ?? "";
      const metadata = (codeElement ? readMetadata(codeElement, registry) : undefined) ?? readMetadata(element, registry);
      return { element, codeElement, code, ...(metadata ?? detect(code)) };
    });
  };
}
