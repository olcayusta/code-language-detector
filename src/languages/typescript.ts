import { matchPatterns } from "../core/patterns.js";
import type { LanguageRule } from "../core/types.js";
import { javascript } from "./javascript.js";
import { analyzeJsx } from "../core/jsx.js";

function withoutModuleAliases(value: string): string {
  return value.replace(/\bimport\s+(?!\()[\s\S]*?\bfrom\b[^;\r\n]*|\bexport\s*\{[^}]*\}/g, "")
    .replace(/^[\t ]*(?:from[\t ]+[\w.]+[\t ]+)?import[\t ]+[\w.]+[\t ]+as[\t ]+\w+[^\r\n]*/gm, "");
}

export const typescript: LanguageRule = {
  name: "typescript",
  aliases: ["ts"],
  detect(context) {
    const jsx = analyzeJsx(context.syntax, context.code);
    const matches = matchPatterns(context, [
      { id: "ts-jsx-type-arguments", description: "JSX bileşeninde TypeScript tip parametreleri", score: 5, distinctive: true, test: () => jsx.typed },
      { id: "ts-export-interface", group: "interface", description: "export interface bildirimi", score: 5, distinctive: true, test: /\bexport\s+interface\s+\w+(?:\s*<[^>]+>)?(?:\s+extends\s+[\w,\s<>]+)?\s*\{/ },
      { id: "ts-interface", group: "interface", description: "interface gövdesi", score: 2, test: /\binterface\s+\w+(?:\s*<[^>]+>)?(?:\s+extends\s+[\w,\s<>]+)?\s*\{/ },
      { id: "ts-jsx-interface", group: "interface", description: "JSX yanında interface gövdesi", score: 5, distinctive: true, test: () => jsx.found && /\binterface\s+\w+(?:\s*<[^>]+>)?(?:\s+extends\s+[\w,\s<>]+)?\s*\{[^}]*\}/.test(context.syntax) },
      { id: "ts-interface-fields", group: "interface", description: "interface içinde tipli alan veya metot", score: 5, distinctive: true, test: /\binterface\s+\w+(?:\s*<[^>]+>)?(?:\s+extends\s+[\w,\s<>]+)?\s*\{[^}]*\w\??\s*:\s*[A-Za-z_$]/ },
      { id: "ts-type-alias", description: "type ile tip takma adı", score: 5, distinctive: true, test: /\btype\s+\w+(?:\s*<[^>\n]+>)?\s*=/ },
      { id: "ts-typed-variable", description: "Tip verilmiş const/let bildirimi", score: 5, distinctive: true, test: /\b(?:const|let)\s+\w+\s*:\s*[A-Za-z_$][\w$]*(?:\s*<[^>\n]+>|\[\])?\s*=/ },
      { id: "ts-function-types", group: "function-annotation", description: "Fonksiyon parametresi veya dönüş tip anotasyonu", score: 5, distinctive: true, test: /\bfunction\s+\w+(?:\s*<[^>]+>)?\s*\([^){=]*\w\??\s*:\s*[A-Za-z_$][^)]*\)|\([^){=]*\w\??\s*:\s*[A-Za-z_$][^)]*\)\s*(?::\s*[\w<>\[\]| ]+)?\s*=>/ },
      { id: "ts-jsx-return-type", group: "function-annotation", description: "JSX yanında fonksiyon/metot dönüş tipi", score: 5, distinctive: true, test: () => jsx.found && /\)\s*:\s*[A-Za-z_$][\w.$]*(?:\s*<[^>]+>)?(?:\[\])?\s*(?:=>|\{)/.test(context.syntax) },
      { id: "ts-assertion", description: "as ile TypeScript tip dönüşümü", score: 5, distinctive: true, test: (value) => {
        const expression = withoutModuleAliases(value);
        return /(?:\b[\w$]+|[)\]}])\s+as\s+(?:[A-Z]\w*|string|number|boolean|unknown|const)\b/.test(expression)
          || (jsx.found && /(?:\b[\w$]+|[)\]}])\s+as\s+[A-Za-z_][\w$]*/.test(expression));
      } },
      { id: "ts-satisfies", description: "satisfies tip denetimi", score: 5, distinctive: true, test: /(?:\b[\w$]+|[}\]])\s+satisfies\s+[A-Za-z_$]\w*/ },
    ]);
    // JavaScript-compatible evidence contributes only after a TS-specific signal.
    if (!matches.some((match) => match.distinctive)) return matches;
    return [...matches, ...javascript.detect(context)];
  },
};
