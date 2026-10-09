import { defineLanguage } from "../core/patterns.js";
import type { Pattern } from "../core/patterns.js";

export const cPatterns: readonly Pattern[] = [
  { id: "c-header", description: "C standart kütüphane başlığı", score: 5, distinctive: true, target: "text", test: /^\s*#\s*include\s*[<"](?:stdio|stdlib|string|stdint|stdbool|stddef|math|time)\.h[>"]/m },
  { id: "c-print", description: "printf/scanf çağrısı", score: 3, test: /\b(?:printf|scanf|fprintf|fscanf)\s*\(/ },
  { id: "c-memory", description: "sizeof ile malloc/calloc bellek ayırma", score: 5, distinctive: true, test: /\b(?:malloc|calloc)\s*\([^;]*\bsizeof\s*\(/ },
  { id: "c-typedef", description: "typedef struct bildirimi", score: 3, test: /\btypedef\s+struct\b/ },
  { id: "c-main", description: "int main fonksiyonu", score: 1, test: /\bint\s+main\s*\(/ },
];

export const c = defineLanguage("c", ["h"], cPatterns);
