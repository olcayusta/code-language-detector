import type { LanguageRule } from "./types.js";

export class LanguageRegistry {
  private readonly definitions = new Map<string, LanguageRule>();
  private readonly aliases = new Map<string, string>();

  constructor(languages: readonly LanguageRule[] = []) {
    for (const language of languages) this.register(language);
  }

  register(language: LanguageRule): void {
    const name = language.name.trim().toLowerCase();
    if (!name || name === "unknown" || name !== language.name) {
      throw new Error("Language names must be non-empty, lowercase, and different from unknown.");
    }
    if (this.definitions.has(name)) throw new Error(`Language already registered: ${name}`);
    const aliases = new Set([name, ...language.aliases.map((alias) => alias.trim().toLowerCase())]);
    // Validate everything before changing the registry.
    for (const alias of aliases) {
      if (!alias || alias === "unknown" || this.aliases.has(alias)) {
        throw new Error(`Invalid or duplicate language alias: ${alias}`);
      }
    }
    this.definitions.set(name, language);
    for (const alias of aliases) this.aliases.set(alias, name);
  }

  resolve(value: string): string | undefined {
    return this.aliases.get(value.trim().toLowerCase());
  }

  getAll(): readonly LanguageRule[] {
    return [...this.definitions.values()];
  }
}
