import { defineLanguage } from "../core/patterns.js";

export const json = defineLanguage("json", [], [
  {
    id: "json-document", description: "JSON.parse ile doğrulanan nesne veya dizi", score: 10, distinctive: true, target: "code",
    test(value) {
      if (!/^[\[{]/.test(value)) return false;
      try {
        const parsed: unknown = JSON.parse(value);
        return typeof parsed === "object" && parsed !== null;
      } catch {
        return false;
      }
    },
  },
]);
