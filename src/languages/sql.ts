import { matchPatterns } from "../core/patterns.js";
import type { LanguageRule } from "../core/types.js";

export const sql: LanguageRule = {
  name: "sql",
  aliases: ["mysql", "postgres", "postgresql", "sqlite", "tsql"],
  detect(context) {
    const syntax = context.syntax.replace(/--[^\r\n]*/g, " ");
    return matchPatterns({ ...context, syntax }, [
      { id: "sql-select", description: "SELECT … FROM sorgusu", score: 5, distinctive: true, test: /\bSELECT\s+[\s\S]+?\bFROM\s+[\w"`\[]/i },
      { id: "sql-insert", description: "INSERT INTO yapısı", score: 5, distinctive: true, test: /\bINSERT\s+INTO\s+\w+/i },
      { id: "sql-create", description: "CREATE TABLE yapısı", score: 5, distinctive: true, test: /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?\w+/i },
      { id: "sql-update", description: "UPDATE … SET yapısı", score: 5, distinctive: true, test: /\bUPDATE\s+\w+\s+SET\s+\w+\s*=/i },
      { id: "sql-delete", description: "DELETE FROM yapısı", score: 5, distinctive: true, test: /\bDELETE\s+FROM\s+\w+/i },
      { id: "sql-clause", description: "WHERE/JOIN/GROUP BY/ORDER BY bölümü", score: 1, test: /\b(?:WHERE\s+\w+|JOIN\s+\w+|(?:GROUP|ORDER)\s+BY\s+\w+)/i },
      { id: "sql-values", description: "VALUES değer listesi", score: 1, test: /\bVALUES\s*\(/i },
    ]);
  },
};
