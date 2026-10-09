import { matchPatterns } from "../core/patterns.js";
import type { LanguageRule } from "../core/types.js";

function indentation(value: string): number {
  let width = 0;
  for (const char of value) width = char === "\t" ? width + 8 - width % 8 : width + 1;
  return width;
}

function blockHeader(line: string, keyword: string): { indent: string; value: string; body: string; continuation: boolean } | undefined {
  const prefix = new RegExp(`^([\\t ]*)${keyword}[\\t ]+`).exec(line);
  if (!prefix) return undefined;
  const stack: string[] = [];
  for (let position = prefix[0].length; position < line.length; position++) {
    const char = line[position]!;
    if (char === "(" || char === "[" || char === "{") stack.push(char === "(" ? ")" : char === "[" ? "]" : "}");
    else if (char === ")" || char === "]" || char === "}") {
      if (stack.pop() !== char) return undefined;
    } else if (char === ":" && !stack.length) {
      return { indent: prefix[1]!, value: line.slice(prefix[0].length, position), body: line.slice(position + 1), continuation: false };
    }
  }
  return stack.length ? { indent: prefix[1]!, value: "", body: "", continuation: true } : undefined;
}

function readHeader(lines: string[], start: number, keyword: string) {
  let logicalLine = lines[start] ?? "";
  for (let end = start; end < lines.length && end - start < 64; end++) {
    if (end !== start) logicalLine += " " + lines[end]!.trim();
    const header = blockHeader(logicalLine, keyword);
    if (!header) return undefined;
    if (!header.continuation) return { ...header, end };
  }
  return undefined;
}

function hasMatchCase(syntax: string, text: string): boolean {
  if (!/^[\t ]*match[\t ]/m.test(syntax)) return false;
  const lines = syntax.split(/\r?\n/);
  const original = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const header = readHeader(lines, index, "match");
    if (!header || header.body.trim() || /[;]|=>/.test(header.value)) continue;
    if (!header.value.trim() && !/^[\t ]*match[\t ]+(?:[rRuUbB]{0,2})?["']/.test(original[index] ?? "")) continue;
    const base = indentation(header.indent);
    let next = header.end + 1;
    while (next < lines.length && !lines[next]!.trim()) next++;
    const branch = readHeader(lines, next, "case");
    if (!branch || indentation(branch.indent) <= base || /;|=>/.test(branch.value)) continue;
    // A string pattern is deliberately blank in syntax, but is still a real
    // pattern. Inspect only its literal delimiter, never the literal contents.
    const literal = /^[\t ]*case[\t ]+(?:[rRuUbB]{0,2})?["']/.test(original[next] ?? "");
    if (!branch.value.trim() && !literal) continue;
    if (!literal && (/^(?:if|for|while|return|match|case)\b/.test(branch.value.trim()) || /^=/.test(branch.value.trim()))) continue;
    if (branch.body.trim() && !/^[{}]/.test(branch.body.trim())) return true;
    let body = branch.end + 1;
    while (body < lines.length && !lines[body]!.trim()) body++;
    const firstStatement = /^([\t ]*)\S/.exec(lines[body] ?? "");
    if (firstStatement && indentation(firstStatement[1]!) > indentation(branch.indent)
        && !/^[\t ]*[{}]/.test(lines[body]!)) return true;
  }
  return false;
}

export const python: LanguageRule = {
  name: "python",
  aliases: ["py", "python3"],
  detect(context) {
    const syntax = context.syntax.replace(/#[^\r\n]*/g, " ");
    return matchPatterns({ ...context, syntax }, [
      { id: "py-match-case", description: "Girintili match/case pattern matching bloğu", score: 5, distinctive: true, test: () => hasMatchCase(syntax, context.text) },
      { id: "py-def", description: "İki nokta ile biten def bildirimi", score: 5, distinctive: true, test: /^\s*(?:async\s+)?def\s+\w+\s*\([^\n]*\)(?:\s*->[^:\n]+)?\s*:/m },
      { id: "py-print", description: "Satır başında print çağrısı", score: 3, test: /^\s*print\s*\(/m },
      { id: "py-main", description: "__name__ ana modül kontrolü", score: 5, distinctive: true, test: /^\s*if\s+__name__\s*==[^:\n]+:/m },
      { id: "py-control", description: "İki noktalı Python kontrol bloğu", score: 3, test: /^\s*(?:if|elif|for|while|with)\s+[^;{}\n]+:\s*$/m },
      { id: "py-import", description: "Python import/from bildirimi", score: 3, test: /^\s*(?:from\s+[\w.]+\s+import\s+\w+|import\s+[\w.]+\s*$)/m },
      { id: "py-class", description: "İki noktalı class bildirimi", score: 5, distinctive: true, test: /^\s*class\s+\w+(?:\([^\n]*\))?\s*:/m },
      { id: "py-value", description: "Python True/False/None değeri", score: 1, test: /\b(?:True|False|None)\b/ },
      { id: "py-lambda", description: "Python lambda ifadesi", score: 5, distinctive: true, test: /\blambda\s+\w+(?:\s*,\s*\w+)*\s*:/ },
    ]);
  },
};
