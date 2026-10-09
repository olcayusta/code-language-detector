import { matchPatterns } from "../core/patterns.js";
import type { LanguageRule } from "../core/types.js";
import { javascriptPatterns } from "./javascript.js";

export const typescript: LanguageRule = {
  name: "typescript",
  aliases: ["ts"],
  detect(context) {
    const matches = matchPatterns(context, [
      { id: "ts-export-interface", description: "export interface bildirimi", score: 5, distinctive: true, test: /\bexport\s+interface\s+\w+/ },
      { id: "ts-interface", description: "interface gövdesi", score: 2, test: /\binterface\s+\w+(?:\s+extends\s+[\w,\s]+)?\s*\{/ },
      { id: "ts-type-alias", description: "type ile tip takma adı", score: 5, distinctive: true, test: /\btype\s+\w+(?:\s*<[^>\n]+>)?\s*=/ },
      { id: "ts-primitive-type", description: "TypeScript temel tip anotasyonu", score: 5, distinctive: true, test: /\b[A-Za-z_$][\w$]*\??\s*:\s*(?:string|number|boolean|unknown|never|any|bigint)\b/ },
      { id: "ts-typed-variable", description: "Tip verilmiş const/let bildirimi", score: 5, distinctive: true, test: /\b(?:const|let)\s+\w+\s*:\s*[A-Za-z_$][\w$]*(?:\s*<[^>\n]+>|\[\])?\s*=/ },
      { id: "ts-assertion", description: "as ile TypeScript tip dönüşümü", score: 5, distinctive: true, test: /\bas\s+(?:string|number|boolean|unknown|const)\b/ },
      { id: "ts-satisfies", description: "satisfies tip denetimi", score: 5, distinctive: true, test: /\b(?:[\w$]+|\})\s+satisfies\s+[A-Z]\w*/ },
    ]);
    // JavaScript-compatible evidence contributes only after a TS-specific signal.
    if (!matches.some((match) => match.distinctive)) return matches;
    return [...matches, ...matchPatterns(context, javascriptPatterns)];
  },
};
