import { defineLanguage } from "../core/patterns.js";

export const java = defineLanguage("java", [], [
  { id: "java-import", description: "java/javax paketinden import", score: 5, distinctive: true, test: /\bimport\s+(?:static\s+)?(?:java|javax)\.[\w.*]+\s*;/ },
  { id: "java-print", description: "System.out/err yazdırma çağrısı", score: 5, distinctive: true, test: /\bSystem\.(?:out|err)\.print(?:ln|f)?\s*\([^)]*\)/ },
  { id: "java-main", description: "String[] parametreli public static void main", score: 5, distinctive: true, test: /\bpublic\s+static\s+void\s+main\s*\(\s*String\s*(?:\[\]\s*\w+|\w+\s*\[\])/ },
  { id: "java-class", description: "class/implements bildirimi", score: 1, test: /\bclass\s+\w+|\bimplements\s+\w+/ },
  { id: "java-package", description: "package bildirimi ve tip gövdesi", score: 5, distinctive: true, test: /\bpackage\s+\w+(?:\.\w+)*\s*;[\s\S]*?\b(?:class|interface|enum|record)\s+\w+/ },
  { id: "java-inheritance", description: "Java erişim belirteci ile class extends/implements", score: 5, distinctive: true, test: /\b(?:public|protected|private|final)\s+(?:abstract\s+)?class\s+\w+(?:\s*<[^>]+>)?\s+(?:extends|implements)\s+\w+/ },
  { id: "java-throws", description: "Metot imzasında throws bildirimi", score: 5, distinctive: true, test: /\)\s+throws\s+[\w.,\s]+\{/ },
]);
