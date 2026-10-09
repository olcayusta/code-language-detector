import { matchPatterns } from "../core/patterns.js";
import type { LanguageRule } from "../core/types.js";
import { cPatterns, headerContext } from "./c.js";

const compatibleCPatterns = cPatterns.filter((pattern) => pattern.id !== "c-main");

export const cpp: LanguageRule = {
  name: "cpp", aliases: ["c++", "cxx", "cc", "cplusplus", "hpp"],
  detect(context) {
    context = headerContext(context);
    const matches = matchPatterns(context, [
  { id: "cpp-header", description: "C++ standart kütüphane başlığı", score: 5, distinctive: true, target: "text", test: /^\s*#\s*include\s*<(?:iostream|vector|string|map|memory|algorithm|array|utility|unordered_map)>/m },
  { id: "cpp-std", group: "standard-library", description: "std namespace üyesi", score: 5, distinctive: true, test: /\bstd::\w+/ },
  { id: "cpp-stream", group: "standard-library", description: "cout/cin akış operatörü", score: 5, distinctive: true, test: /\b(?:cout\s*<<|cin\s*>>)/ },
  { id: "cpp-namespace", description: "using namespace std bildirimi", score: 3, test: /\busing\s+namespace\s+std\s*;/ },
  { id: "cpp-template", description: "template typename/class parametresi", score: 5, distinctive: true, test: /\btemplate\s*<\s*(?:typename|class)\s+\w+/ },
  { id: "cpp-main", description: "int main fonksiyonu", score: 1, test: /\bint\s+main\s*\(/ },
  { id: "cpp-class-access", description: "class gövdesinde public/private/protected bölümü", score: 5, distinctive: true, test: /\bclass\s+\w+[^;{}]*\{[^}]*\b(?:public|private|protected)\s*:/ },
  { id: "cpp-constexpr", description: "constexpr bildirimi", score: 5, distinctive: true, test: /\bconstexpr\s+[\w:<>]+\s+\w+\s*[=(]/ },
    ]);
    if (!matches.some((match) => match.distinctive)) return matches;
    // A C++ snippet may use C headers and APIs; keep that compatible evidence.
    return [...matches, ...matchPatterns(context, compatibleCPatterns)];
  },
};
