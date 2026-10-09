import { defineLanguage } from "../core/patterns.js";

export const java = defineLanguage("java", [], [
  { id: "java-import", description: "java/javax paketinden import", score: 5, distinctive: true, test: /\bimport\s+(?:static\s+)?(?:java|javax)\.[\w.*]+\s*;/ },
  { id: "java-print", description: "System.out/err yazdırma çağrısı", score: 5, distinctive: true, test: /\bSystem\.(?:out|err)\.print(?:ln|f)?\s*\(/ },
  { id: "java-main", description: "String[] parametreli public static void main", score: 5, distinctive: true, test: /\bpublic\s+static\s+void\s+main\s*\(\s*String\s*(?:\[\]\s*\w+|\w+\s*\[\])/ },
  { id: "java-class", description: "class/implements bildirimi", score: 1, test: /\bclass\s+\w+|\bimplements\s+\w+/ },
  { id: "java-package", description: "Noktalı package bildirimi", score: 3, test: /\bpackage\s+\w+(?:\.\w+)+\s*;/ },
]);
