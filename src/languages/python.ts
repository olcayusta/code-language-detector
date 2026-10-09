import { matchPatterns } from "../core/patterns.js";
import type { LanguageRule } from "../core/types.js";

export const python: LanguageRule = {
  name: "python",
  aliases: ["py", "python3"],
  detect(context) {
    const syntax = context.syntax.replace(/#[^\r\n]*/g, " ");
    return matchPatterns({ ...context, syntax }, [
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
