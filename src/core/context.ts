import type { DetectionContext } from "./types.js";
import { analyzeJsx, jsxEnd } from "./jsx.js";

// Raw/verbatim strings precede ordinary quoted strings.
const tokens = /R"([^\s()\\]{0,16})\([\s\S]*?\)\1"|\$?@"(?:""|[^"])*(?:"|$)|"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\[\s\S]|[^"\\])*(?:"|$)|'(?:\\[\s\S]|[^'\\])*(?:'|$)|`(?:\\[\s\S]|[^`\\])*(?:`|$)|\/\/[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|<!--[\s\S]*?(?:-->|$)|#[^\r\n]*|--[^\r\n]*|\/(?:\\[^\r\n]|\[(?:\\[^\r\n]|[^\]\\\r\n])*\]|[^/\\[\r\n])+\/[dgimsuvy]*/g;

function mask(value: string): string {
  return value.replace(/[^\r\n]/g, " ");
}

function expressionSyntax(code: string, depth: number): string {
  const context = createContext(code, depth);
  const leading = code.length - code.trimStart().length;
  return mask(code.slice(0, leading)) + context.syntax + mask(code.slice(leading + context.code.length));
}

// Template boundaries require balanced delimiters: braces inside strings,
// comments, regexes and nested templates cannot close an interpolation.
function expressionEnd(code: string, start: number, depth: number): number | undefined {
  const stack = ["}"];
  const matcher = new RegExp(tokens.source, tokens.flags);
  matcher.lastIndex = start;
  let position = start;
  while (position < code.length) {
    const match = matcher.exec(code);
    const limit = match?.index ?? code.length;
    let skippedJsx = false;
    for (; position < limit; position++) {
      const char = code[position]!;
      if (char === "<") {
        const before = code.slice(Math.max(start, position - 256), position);
        if (!before.trim() || /(?:[=(,:?;{\[]|\breturn|=>)\s*$/.test(before)) {
          const end = jsxEnd(code, position, depth + 1, (value, begin) => expressionEnd(value, begin, depth + 1));
          if (end !== undefined) {
            position = end;
            matcher.lastIndex = end;
            skippedJsx = true;
            break;
          }
        }
      }
      if (char === "{" || char === "(" || char === "[") stack.push(char === "{" ? "}" : char === "(" ? ")" : "]");
      else if (char === "}" || char === ")" || char === "]") {
        if (stack.pop() !== char) return undefined;
        if (!stack.length) return position + 1;
      }
    }
    if (skippedJsx) continue;
    if (!match) break;
    const token = match[0];
    const before = code.slice(Math.max(start, match.index - 256), match.index);
    // JS decrement/division must not swallow the closing brace.
    if ((token.startsWith("--") || token.startsWith("#"))
        || (token.startsWith("/") && !/^\/[/\*]/.test(token)
          && before.trim() && !/(?:[=(:,;!?&|{\[]|\breturn|=>)\s*$/.test(before))) {
      matcher.lastIndex = match.index + 1;
      continue;
    }
    if (token.startsWith("`")) {
      const nested = readTemplate(code, match.index, depth + 1, false);
      if (!nested.complete) return undefined;
      position = nested.end;
    } else position = match.index + token.length;
    matcher.lastIndex = position;
  }
  return undefined;
}

function readTemplate(code: string, start: number, depth: number, expose: boolean): {
  end: number; syntax: string; complete: boolean;
} {
  const parts: { start: number; end: number }[] = [];
  if (depth < 64) {
    for (let position = start + 1; position < code.length; position++) {
      if (code[position] === "\\") { position++; continue; }
      if (code[position] === "`") {
        const end = position + 1;
        let previous = start;
        let syntax = "";
        if (expose) for (const part of parts) {
          // Retain the real expression delimiters so JSX nested inside an
          // interpolation has code context rather than looking like XML.
          syntax += mask(code.slice(previous, part.start - 2)) + "${"
            + expressionSyntax(code.slice(part.start, part.end), depth + 1) + "}";
          previous = part.end + 1;
        }
        syntax += mask(code.slice(previous, end));
        return { end, syntax, complete: true };
      }
      if (code[position] === "$" && code[position + 1] === "{") {
        const end = expressionEnd(code, position + 2, depth);
        if (end === undefined) break;
        const expression = code.slice(position + 2, end - 1);
        if (!expression.trim()) break;
        parts.push({ start: position + 2, end: end - 1 });
        position = end - 1;
      }
    }
  }
  return { end: code.length, syntax: mask(code.slice(start)), complete: false };
}

export function createContext(code: string, templateDepth = 0): DetectionContext {
  const trimmed = code.trim();
  // In a standalone SQL statement, backticks quote identifiers rather than
  // interpolate JavaScript. JS tagged templates still expose their expressions.
  const sqlIdentifiers = /^(?:SELECT\s+|WITH\s+\w+\s+AS\s*\(|INSERT\s+INTO\s+|UPDATE\s+\w+\s+SET\s+|DELETE\s+FROM\s+|CREATE\s+TABLE\s+)/i.test(trimmed);
  let text = "";
  let syntax = "";
  let previousEnd = 0;
  let lineStart = 0;
  let nextLineBreak = trimmed.indexOf("\n");
  // A lightweight masking pass, not a complete language parser.
  const matcher = new RegExp(tokens.source, tokens.flags);
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(trimmed)) !== null) {
    const token = match[0];
    const start = match.index;
    if (token.startsWith("`") && !sqlIdentifiers) {
      const template = readTemplate(trimmed, start, templateDepth, true);
      const prefix = trimmed.slice(previousEnd, start);
      text += prefix + trimmed.slice(start, template.end);
      syntax += prefix + template.syntax;
      previousEnd = template.end;
      matcher.lastIndex = template.end;
      continue;
    }
    while (nextLineBreak >= 0 && nextLineBreak < start) {
      lineStart = nextLineBreak + 1;
      nextLineBreak = trimmed.indexOf("\n", lineStart);
    }
    const before = trimmed.slice(Math.max(0, start - 256), start);
    const linePrefix = trimmed.slice(lineStart, start);
    let comment = /^(?:\/\/|\/\*|<!--)/.test(token);
    if (token.startsWith("#")) {
      // Keep C directives and CSS selectors/hex colors, mask compact comments.
      if ((!linePrefix.trim() && /^#\s*(?:include|define|if|ifdef|ifndef|endif|else|elif|pragma|error|undef|line)\b/.test(token))
          || (/(?:^|[{;])\s*[\w-]+\s*:\s*$/.test(linePrefix) && /^#[a-f\d]{3,8}\b/i.test(token))
          || /^#[\w-]+[^;{}\r\n]*\{\s*(?:color|background(?:-color)?|display|margin(?:-[\w-]+)?|padding(?:-[\w-]+)?|font-[\w-]+|width|height|border(?:-[\w-]+)?|position|opacity|content|gap|align-items|justify-content|--[\w-]+)\s*:/.test(token)
          || /^#[\w-]+[\w\s.#>+~:[\]="'()-]*\{\s*(?:\/\*|$)/.test(token)) { matcher.lastIndex = start + 1; continue; }
      if (linePrefix.trim() && !/\s$/.test(before)) { matcher.lastIndex = start + 1; continue; }
      comment = true;
    } else if (token.startsWith("--")) {
      if (linePrefix.trim() && !/\s$/.test(before)) { matcher.lastIndex = start + 1; continue; }
      if (/^--\w+\s*;\s*$/.test(token)) { matcher.lastIndex = start + 1; continue; }
      comment = true;
    } else if (token.startsWith("/") && !comment) {
      // Regex literals occur where an expression can start; division does not.
      if (before.trim() && !/(?:[=(:,;!?&|{\[]|\breturn|=>)\s*$/.test(before)) { matcher.lastIndex = start + 1; continue; }
    }
    const prefix = trimmed.slice(previousEnd, start);
    text += prefix + (comment ? mask(token) : token);
    syntax += prefix + mask(token);
    previousEnd = start + token.length;
  }
  text += trimmed.slice(previousEnd);
  syntax += trimmed.slice(previousEnd);
  syntax = analyzeJsx(syntax, trimmed, templateDepth, {
    end: (value, start) => expressionEnd(value, start, templateDepth),
    mask: (value) => expressionSyntax(value, templateDepth + 1),
  }).syntax;
  return { code: trimmed, text, syntax };
}

export function isMarkupDocument(text: string): boolean {
  return /^\s*<(?:[A-Za-z][\w:.-]*(?:\s[^<>]*|\/?)>|!doctype\b|\?xml[-\s])/i.test(text);
}

/** Attribute values and CDATA are payload, not tag evidence. */
export function markupText(text: string): string {
  return text.replace(/<!\[CDATA\[[\s\S]*?(?:\]\]>|$)/g, "<![CDATA[]]>")
    .replace(/"[^"]*"|'[^']*'/g, mask)
    .replace(/(<(?:script|style)\b[^>]*>)[\s\S]*?(<\/(?:script|style)\s*>)/gi,
      (_match, open: string, close: string) => open + close);
}

