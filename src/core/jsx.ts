// A bounded structural scan, not a JSX grammar or evaluator. It uses already
// masked strings/comments and keeps expression containers as executable syntax.
const mask = (value: string) => value.replace(/[^\r\n]/g, " ");
interface Node { end: number; syntax: string; expressions: boolean; fragment: boolean; typed: boolean }
interface ExpressionReader {
  end(code: string, start: number): number | undefined;
  mask(code: string): string;
}

function braceEnd(syntax: string, start: number): number | undefined {
  let depth = 1;
  for (let position = start + 1; position < syntax.length; position++) {
    if (syntax[position] === "{") depth++;
    if (syntax[position] === "}" && --depth === 0) return position + 1;
  }
  return undefined;
}

function readNode(syntax: string, code: string, start: number, depth: number, script: boolean, reader?: ExpressionReader): Node | undefined {
  if (depth >= 64) return undefined;
  // JSX text is not a JS string: apostrophes/quotes in children cannot consume
  // closing tags. The initial lexical pass supplies a reader for real code.
  const source = reader ? code : syntax;
  const opening = /^<([A-Za-z_$][\w$]*(?:[.:][A-Za-z_$][\w$]*)*)(?=[\s/<>])|^<>/.exec(source.slice(start));
  if (!opening) return undefined;
  const name = opening[1] ?? "";
  let position = start + opening[0].length;
  let previous = position;
  let result = opening[0];
  let expressions = false;
  let typed = false;
  if (name && source[position] === "<") {
    const begin = position;
    let nesting = 0;
    do {
      if (source[position] === "<") nesting++;
      else if (source[position] === ">") nesting--;
      position++;
    } while (position < source.length && nesting > 0);
    const argumentsText = source.slice(begin + 1, position - 1);
    if (nesting || !/[A-Za-z_$]/.test(argumentsText) || /[^\w$\s.,:<>{}\[\]|&?]/.test(argumentsText)) return undefined;
    result += source.slice(begin, position);
    previous = position;
    typed = true;
  }
  const expression = (allowComment = false): boolean => {
    const end = reader ? reader.end(code, position + 1) : braceEnd(syntax, position);
    if (end === undefined) return false;
    const value = reader ? reader.mask(code.slice(position + 1, end - 1)) : syntax.slice(position + 1, end - 1);
    if (!value.trim()
        && !/^\s*["'`]/.test(code.slice(position + 1, end - 1))
        && !(allowComment && /^\s*\/\*[\s\S]*\*\/\s*$/.test(code.slice(position + 1, end - 1)))) return false;
    result += mask(syntax.slice(previous, position));
    result += "{" + (reader ? value : analyzeJsx(value, code.slice(position + 1, end - 1), depth + 1).syntax) + "}";
    position = end;
    previous = position;
    expressions = true;
    return true;
  };
  if (name) {
    while (position < source.length) {
      if (/\s/.test(source[position]!)) { position++; continue; }
      if (source.startsWith("/>", position)) {
        result += mask(syntax.slice(previous, position)) + "/>";
        return { end: position + 2, syntax: result, expressions, fragment: false, typed };
      }
      if (source[position] === ">") break;
      if (source[position] === "{") { if (!expression()) return undefined; continue; }
      const attribute = /^[A-Za-z_$][\w$:-]*/.exec(source.slice(position));
      if (!attribute) return undefined;
      position += attribute[0].length;
      while (/\s/.test(source[position] ?? "")) position++;
      if (source[position] !== "=") continue;
      position++;
      // Quote locations come from original text; their contents never score.
      while (/\s/.test(code[position] ?? "")) position++;
      if (source[position] === "{") { if (!expression()) return undefined; continue; }
      const quote = code[position];
      if (quote !== '"' && quote !== "'") return undefined;
      position++;
      while (position < code.length && code[position] !== quote) position++;
      if (position === code.length) return undefined;
      position++;
    }
    if (source[position] !== ">") return undefined;
    result += mask(syntax.slice(previous, position)) + ">";
    position++;
    previous = position;
  }
  // Script/style text in an outer markup document is payload, not JSX code.
  if (!script && /^(?:script|style)$/i.test(name)) {
    const close = `</${name}>`;
    const end = source.indexOf(close, position);
    if (end < 0) return undefined;
    return { end: end + close.length, syntax: result + mask(syntax.slice(position, end)) + close, expressions, fragment: false, typed };
  }
  const closing = name ? `</${name}` : "</";
  while (position < source.length) {
    if (source.startsWith(closing, position)) {
      const rest = source.slice(position + closing.length);
      const close = /^\s*>/.exec(rest);
      if (!close) return undefined;
      const end = position + closing.length + close[0].length;
      result += mask(syntax.slice(previous, position)) + source.slice(position, end);
      return { end, syntax: result, expressions, fragment: !name, typed };
    }
    if (source[position] === "<") {
      const child = readNode(syntax, code, position, depth + 1, script, reader);
      if (!child) return undefined;
      result += mask(syntax.slice(previous, position)) + child.syntax;
      expressions ||= child.expressions;
      typed ||= child.typed;
      position = child.end;
      previous = position;
    } else if (source[position] === "{") {
      if (!expression(true)) return undefined;
    } else position++;
  }
  return undefined;
}

/** Boundary-only JSX scan for a template expression; payload never scores. */
export function jsxEnd(code: string, start: number, depth: number, endExpression: ExpressionReader["end"]): number | undefined {
  return readNode(code, code, start, depth, true, { end: endExpression, mask: (value) => value })?.end;
}

export function analyzeJsx(syntax: string, code = syntax, depth = 0, reader?: ExpressionReader): { syntax: string; found: boolean; typed: boolean } {
  if (depth >= 64 || !syntax.includes("<") || /^\s*<(?:!doctype\b|\?xml\b|(?:html|head|body|script|style)\b)/i.test(syntax)
      || /^\s*<[\w:.-]+\b[^<>]*\bxmlns(?::[\w.-]+)?\s*=/.test(syntax)) return { syntax, found: false, typed: false };
  let found = false;
  let typed = false;
  let result = "";
  let previous = 0;
  for (let position = 0; position < syntax.length; position++) {
    if (syntax[position] !== "<") continue;
    const before = syntax.slice(Math.max(0, position - 256), position);
    const script = /(?:[=(,:?;{\[]|\breturn|=>)\s*$/.test(before);
    if (before.trim() && !script) continue;
    const node = readNode(syntax, code, position, depth, script, reader);
    // A plain outer markup root owns its payload. Do not restart a JSX search
    // at a tag inside CDATA or embedded script text when that root is not JSX.
    if (!before.trim() && /^<[A-Za-z]/.test(syntax.slice(position))
        && (!node || (!node.fragment && !node.expressions && !node.typed))) return { syntax, found: false, typed: false };
    if (!node || (!script && !node.fragment && !node.expressions && !node.typed)) continue;
    // A trailing member/type name is usually a generic or comparison, not JSX.
    if (/^[\t ]*[\w$]/.test(syntax.slice(node.end))) continue;
    result += syntax.slice(previous, position) + node.syntax;
    previous = node.end;
    position = node.end - 1;
    found = true;
    typed ||= node.typed;
  }
  return { syntax: result + syntax.slice(previous), found, typed };
}
