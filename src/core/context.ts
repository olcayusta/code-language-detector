import type { DetectionContext } from "./types.js";

const tokens = /"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`|\/\/[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|<!--[\s\S]*?(?:-->|$)|^[\t ]*--[\t ][^\r\n]*|^[\t ]*#(?![\t ]*(?:include|define|if|ifdef|ifndef|endif|else|elif|pragma)\b)[\t ]+[^\r\n]*/gm;

function mask(value: string): string {
  return value.replace(/[^\r\n]/g, " ");
}

export function createContext(code: string): DetectionContext {
  const trimmed = code.trim();
  let text = "";
  let syntax = "";
  let previousEnd = 0;
  // One lightweight pass; this is deliberately not a language parser.
  for (const match of trimmed.matchAll(tokens)) {
    const token = match[0];
    const start = match.index;
    const prefix = trimmed.slice(previousEnd, start);
    const comment = /^(?:\/\/|\/\*|<!--|\s*--|\s*#)/.test(token);
    text += prefix + (comment ? mask(token) : token);
    syntax += prefix + mask(token);
    previousEnd = start + token.length;
  }
  text += trimmed.slice(previousEnd);
  syntax += trimmed.slice(previousEnd);
  return { code: trimmed, text, syntax };
}

