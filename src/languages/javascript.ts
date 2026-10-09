import { defineLanguage } from "../core/patterns.js";
import type { Pattern } from "../core/patterns.js";

export const javascriptPatterns: readonly Pattern[] = [
  { id: "js-console", description: "console metodu çağrısı", score: 5, distinctive: true, test: /\bconsole\.(?:log|warn|error|info|debug)\s*\(/ },
  { id: "js-dom", description: "Tarayıcı DOM API çağrısı", score: 5, distinctive: true, test: /\b(?:document\.(?:querySelector(?:All)?|getElementById|createElement)|window\.(?:addEventListener|alert))\s*\(/ },
  { id: "js-variable", description: "const veya let değişken bildirimi", score: 1, test: /\b(?:const|let)\s+[A-Za-z_$][\w$]*\s*=/ },
  { id: "js-function", description: "function bildirimi", score: 1, test: /\bfunction(?:\s+[A-Za-z_$][\w$]*)?\s*\(/ },
  { id: "js-arrow", description: "Ok fonksiyonu", score: 2, test: /(?:\)|\b[A-Za-z_$][\w$]*)\s*=>/ },
  { id: "js-module", description: "ECMAScript import/export yapısı", score: 3, test: /\b(?:import\s+(?:[\w$*{]|\s)|export\s+(?:default\b|(?:const|let|function|class)\b))/ },
  { id: "js-equality", description: "Üç eşitli karşılaştırma", score: 1, test: /===|!==/ },
];

export const javascript = defineLanguage("javascript", ["js", "javascript", "ecmascript", "node", "nodejs"], javascriptPatterns);
