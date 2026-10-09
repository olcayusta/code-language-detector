import { html } from "./html.js";
import { css } from "./css.js";
import { javascript } from "./javascript.js";
import { typescript } from "./typescript.js";
import { php } from "./php.js";
import { python } from "./python.js";
import { sql } from "./sql.js";
import { json } from "./json.js";
import { xml } from "./xml.js";
import { java } from "./java.js";
import { c } from "./c.js";
import { cpp } from "./cpp.js";
import { csharp } from "./csharp.js";
import { isMarkupDocument } from "../core/context.js";
import type { LanguageRule } from "../core/types.js";
import { analyzeJsx } from "../core/jsx.js";

// Standalone markup is classified by its outer document, rather than snippets
// inside text nodes, attributes or script/style elements. Custom registry rules
// still receive the original context and choose their own interpretation.
function documentAware(language: LanguageRule): LanguageRule {
  return { ...language, detect: (context) => isMarkupDocument(context.text)
    && !((language.name === "javascript" || language.name === "typescript") && analyzeJsx(context.syntax, context.code).found)
    ? [] : language.detect(context) };
}

export const defaultLanguages = [html, documentAware(css), documentAware(javascript), documentAware(typescript),
  documentAware(php), documentAware(python), documentAware(sql), json, xml, documentAware(java),
  documentAware(c), documentAware(cpp), documentAware(csharp)] as const;
