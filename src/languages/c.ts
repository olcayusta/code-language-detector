import { matchPatterns } from "../core/patterns.js";
import type { Pattern } from "../core/patterns.js";
import type { DetectionContext, LanguageRule } from "../core/types.js";

// A quoted header is evidence only on an actual unmasked include directive.
export function headerContext(context: DetectionContext): DetectionContext {
  return { ...context, text: context.text.replace(/^[^\r\n]+/gm, (line: string, offset: number) =>
    /^\s*#\s*include\b/.test(context.syntax.slice(offset, offset + line.length)) ? line : " ") };
}

export const cPatterns: readonly Pattern[] = [
  { id: "c-header", description: "C standart kütüphane başlığı", score: 5, distinctive: true, target: "text", test: /^\s*#\s*include\s*[<"](?:stdio|stdlib|string|stdint|stdbool|stddef|math|time)\.h[>"]/m },
  { id: "c-print", description: "printf/scanf çağrısı", score: 3, test: /\b(?:printf|scanf|fprintf|fscanf)\s*\(/ },
  { id: "c-memory", description: "sizeof ile malloc/calloc bellek ayırma", score: 5, distinctive: true, test: /\b(?:malloc|calloc)\s*\([^;]*\bsizeof\s*\(/ },
  { id: "c-typedef", description: "typedef struct bildirimi", score: 3, test: /\btypedef\s+struct\b/ },
  { id: "c-main", description: "int main fonksiyonu", score: 1, test: /\bint\s+main\s*\(/ },
];

export const c: LanguageRule = { name: "c", aliases: ["h"], detect: (context) => matchPatterns(headerContext(context), [...cPatterns,
  { id: "c-standard", description: "C11 _Generic/_Static_assert yapısı", score: 5, distinctive: true, test: /\b(?:_Generic|_Static_assert)\s*\(/ },
  { id: "c-designated", description: "struct ve alan adıyla başlatma", score: 5, distinctive: true, test: /\bstruct\b[\s\S]*?\{\s*\.\w+\s*=/ },
]) };
