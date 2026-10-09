import { matchPatterns } from "../core/patterns.js";
import type { LanguageRule } from "../core/types.js";

export const sql: LanguageRule = {
  name: "sql",
  aliases: ["mysql", "postgres", "postgresql", "sqlite", "tsql"],
  detect(context) {
    // Keep a neutral placeholder for SQL quoted identifiers/values. Their
    // contents remain masked, so embedded code never becomes evidence.
    const syntax = context.syntax.split("");
    for (const match of context.text.matchAll(/"(?:""|[^"\r\n])*"|'(?:''|[^'\r\n])*'|`[^`\r\n]*`/g)) {
      if (context.syntax[match.index] === " ") syntax[match.index] = "Q";
    }
    const sqlSyntax = syntax.join("");
    // Avoid interpreting prose containing a SELECT/FROM phrase as a query.
    if (!/^\s*(?:SELECT|WITH|INSERT|CREATE|UPDATE|DELETE|ALTER|DROP|BEGIN|EXPLAIN)\b/i.test(sqlSyntax)) return [];
    return matchPatterns({ ...context, syntax: sqlSyntax }, [
      { id: "sql-select", description: "SELECT … FROM sorgusu", score: 5, distinctive: true, test: /\bSELECT\s+\S[\s\S]*?\bFROM\s+[\w"`\[]/i },
      { id: "sql-insert", description: "INSERT INTO yapısı", score: 5, distinctive: true, test: /\bINSERT\s+INTO\s+\w+/i },
      { id: "sql-create", description: "CREATE TABLE yapısı", score: 5, distinctive: true, test: /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+/i },
      { id: "sql-update", description: "UPDATE … SET yapısı", score: 5, distinctive: true, test: /\bUPDATE\s+\w+\s+SET\s+\w+\s*=/i },
      { id: "sql-delete", description: "DELETE FROM yapısı", score: 5, distinctive: true, test: /\bDELETE\s+FROM\s+\w+/i },
      { id: "sql-clause", description: "WHERE/JOIN/GROUP BY/ORDER BY bölümü", score: 1, test: /\b(?:WHERE\s+\w+|JOIN\s+\w+|(?:GROUP|ORDER)\s+BY\s+\w+)/i },
      { id: "sql-values", description: "VALUES değer listesi", score: 1, test: /\bVALUES\s*\(/i },
    ]);
  },
};
