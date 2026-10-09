import { matchPatterns } from "../core/patterns.js";
import type { LanguageRule } from "../core/types.js";
import { hasPairedTag, htmlTags, hasXmlDocumentSignal } from "./markup.js";
import { markupText } from "../core/context.js";
import { analyzeJsx } from "../core/jsx.js";

export const xml: LanguageRule = {
  name: "xml", aliases: ["xhtml", "svg"],
  detect(context) {
    if (!context.text.trimStart().startsWith("<")) return [];
    if (analyzeJsx(context.syntax, context.code).found) return [];
    context = { ...context, text: markupText(context.text) };
    if (/<!doctype\s+html\s*>/i.test(context.text)) return [];
    if (hasPairedTag(context.text, true) && !hasXmlDocumentSignal(context.text) && !/<!\[CDATA\[/.test(context.text)) return [];
    return matchPatterns(context, [
  { id: "xml-declaration", description: "XML sürüm bildirimi", score: 10, distinctive: true, target: "text", test: /<\?xml\s+version\s*=/i },
  { id: "xml-namespace", description: "XML namespace bildirimi", score: 5, distinctive: true, target: "text", test: /<[A-Za-z][\w:.-]*\b[^<>]*\bxmlns(?::[\w.-]+)?\s*=/ },
  { id: "xml-custom-pair", description: "HTML sözlüğü dışındaki etiket çifti", score: 5, distinctive: true, target: "text", test: (text) => hasPairedTag(text, false) },
  { id: "xml-self-closing", description: "Kendiliğinden kapanan özel XML etiketi", score: 5, distinctive: true, target: "text", test: (text) => [...text.matchAll(/<([A-Za-z][\w:.-]*)\b[^<>]*\/\s*>/g)].some((match) => !!match[1] && !htmlTags.has(match[1].toLowerCase())) },
  { id: "xml-cdata", description: "XML CDATA bölümü", score: 5, distinctive: true, target: "text", test: /<!\[CDATA\[[\s\S]*?\]\]>/ },
    ]);
  },
};
