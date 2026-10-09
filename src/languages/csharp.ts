import { defineLanguage } from "../core/patterns.js";

export const csharp = defineLanguage("csharp", ["cs", "c#", "c-sharp", "dotnet"], [
  { id: "cs-system", description: "using System bildirimi", score: 5, distinctive: true, test: /\busing\s+System(?:\.[\w.]+)?\s*;/ },
  { id: "cs-console", description: "Console.Write/Read çağrısı", score: 5, distinctive: true, test: /\bConsole\.(?:Write(?:Line)?|Read(?:Line|Key)?)\s*\([^)]*\)/ },
  { id: "cs-property", description: "get/set/init erişimli C# özelliği", score: 5, distinctive: true, test: /\b\w+\s+\w+\s*\{\s*get\s*;\s*(?:set|init)\s*;/ },
  { id: "cs-namespace", description: "namespace bildirimi", score: 1, test: /\bnamespace\s+[\w.]+\s*[;{]/ },
  { id: "cs-main", description: "string[] parametreli Main fonksiyonu", score: 5, distinctive: true, test: /\bstatic\s+void\s+Main\s*\(\s*string\s*\[\]\s*\w+/ },
  { id: "cs-class", description: "class bildirimi", score: 1, test: /\bclass\s+\w+/ },
  { id: "cs-async-task", description: "async Task/ValueTask metot bildirimi", score: 5, distinctive: true, test: /\basync\s+(?:Task|ValueTask)(?:\s*<[^>]+>)?\s+\w+\s*\(/ },
  { id: "cs-record", description: "Noktalı virgülle biten C# positional record", score: 5, distinctive: true, test: /\brecord\s+(?:(?:class|struct)\s+)?\w+\s*\(\s*(?:string|int|bool|decimal|double|Guid)\s+\w+[^)]*\)\s*;/ },
]);
