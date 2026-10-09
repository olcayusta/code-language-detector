import { matchPatterns } from "../core/patterns.js";
import type { LanguageRule } from "../core/types.js";
import { hasPairedTag, hasXmlDocumentSignal } from "./markup.js";
import { markupText } from "../core/context.js";
import { analyzeJsx } from "../core/jsx.js";

export const html: LanguageRule = {
  name: "html", aliases: ["htm"],
  detect(context) {
    if (!context.text.trimStart().startsWith("<")) return [];
    if (analyzeJsx(context.syntax, context.code).found) return [];
    context = { ...context, text: markupText(context.text) };
    if (hasXmlDocumentSignal(context.text)) return [];
    return matchPatterns(context, [
  { id: "html-doctype", description: "HTML doctype bildirimi", score: 10, distinctive: true, target: "text", test: /<!doctype\s+html\s*>/i },
  { id: "html-pair", description: "Bilinen HTML etiketinin açılış/kapanış çifti", score: 5, distinctive: true, target: "text", test: (text) => hasPairedTag(text, true) },
  { id: "html-void", description: "HTML boş etiketi ve karakteristik özniteliği", score: 5, distinctive: true, target: "text", test: /<(?:img\b[^<>]*\bsrc|input\b[^<>]*\btype|meta\b[^<>]*\b(?:charset|name)|link\b[^<>]*\brel)\s*=/i },
  { id: "html-structure", description: "HTML belge gövdesi", score: 3, target: "text", test: /<html\b[^>]*>[\s\S]*<(?:head|body)\b/i },
    ]);
  },
};
