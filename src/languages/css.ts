import { defineLanguage } from "../core/patterns.js";

const property = /(?:^|[;{])\s*(?:color|background(?:-color)?|display|margin(?:-(?:top|right|bottom|left))?|padding(?:-(?:top|right|bottom|left))?|font-(?:size|family|weight)|width|height|border(?:-[\w-]+)?|position|opacity|content|gap|align-items|justify-content|--[\w-]+)\s*:\s*[^{};]+(?:;|(?=\}))/i;

export const css = defineLanguage("css", [], [
  { id: "css-rule", description: "Seçici gövdesinde CSS özellik bildirimi", score: 5, distinctive: true, test: (text) => /(?:^|[}\n])\s*[^{};=]+\{[^{}]*\}/.test(text) && property.test(text) },
  { id: "css-media", description: "@media kuralı", score: 5, distinctive: true, test: /@media\s+[^{}]+\{/ },
  { id: "css-keyframes", description: "@keyframes animasyon tanımı", score: 5, distinctive: true, test: /@(?:-webkit-)?keyframes\s+[\w-]+\s*\{/ },
  { id: "css-important", description: "CSS !important bildirimi", score: 1, test: /!important\b/ },
]);
