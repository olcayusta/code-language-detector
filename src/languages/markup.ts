// Small, explicit HTML vocabulary; no imported grammars or parsers.
export const htmlTags = new Set([
  "html", "head", "body", "title", "meta", "link", "style", "script", "div", "span",
  "p", "a", "img", "br", "hr", "input", "button", "form", "label", "select", "option",
  "textarea", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "pre", "code",
  "section", "article", "header", "footer", "main", "nav", "aside", "h1", "h2", "h3",
  "h4", "h5", "h6", "strong", "em", "b", "i", "small", "video", "audio", "source",
  "canvas", "details", "summary", "iframe", "picture", "figure", "figcaption",
]);

export function hasXmlDocumentSignal(text: string): boolean {
  return /^\s*<\?xml\s+version\s*=/i.test(text)
    || /^\s*<[A-Za-z][\w:.-]*\b[^<>]*\bxmlns(?::[\w.-]+)?\s*=/.test(text);
}

export function hasPairedTag(text: string, known: boolean): boolean {
  const opened = new Set<string>();
  for (const match of text.matchAll(/<(\/?)([A-Za-z][\w:.-]*)\b[^<>]*>/g)) {
    const name = match[2];
    if (!name || htmlTags.has(name.toLowerCase()) !== known) continue;
    const key = known ? name.toLowerCase() : name;
    if (match[1] === "/") {
      if (opened.has(key)) return true;
    } else if (!/\/\s*>$/.test(match[0])) {
      opened.add(key);
    }
  }
  return false;
}
