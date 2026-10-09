import { defineLanguage } from "../core/patterns.js";

export const php = defineLanguage("php", ["php8", "php7"], [
  { id: "php-tag", description: "PHP açılış etiketi", score: 10, distinctive: true, test: /<\?(?:php\b|=)/i },
  { id: "php-echo", description: "echo ile değer yazdırma", score: 3, test: /\becho\s+(?:\$\w+|[^\S\r\n]*[^\S\r\n;]+;)/ },
  { id: "php-variable", description: "$ ile değişken ve atama/erişim", score: 2, test: /\$[A-Za-z_]\w*\s*(?:=|->|\[|;)/ },
  { id: "php-member", description: "$ değişkeninden nesne üyesine erişim", score: 5, distinctive: true, test: /\$[A-Za-z_]\w*\s*->\s*\w+/ },
  { id: "php-function", description: "function parametresinde PHP değişkeni", score: 5, distinctive: true, test: /\bfunction\s+\w+\s*\([^)]*\$\w+/ },
]);
