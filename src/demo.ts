import { detectCodeBlocks, detectLanguage } from "./index.js";
import type { DetectionResult } from "./index.js";

const names: Record<string, string> = {
  javascript: "JavaScript", typescript: "TypeScript", php: "PHP", python: "Python",
  sql: "SQL", json: "JSON", xml: "XML", html: "HTML", css: "CSS", java: "Java",
  c: "C", cpp: "C++", csharp: "C#", unknown: "Unknown",
};

function renderResult(container: HTMLElement, result: DetectionResult): void {
  container.replaceChildren();
  const summary = document.createElement("p");
  const label = document.createElement("strong");
  label.textContent = names[result.language] ?? result.language;
  summary.append(label, ` · Puan: ${result.score} · Kaynak: ${result.source}`);
  container.append(summary);
  const details = document.createElement("details");
  const title = document.createElement("summary");
  title.textContent = "Adaylar ve tespit nedenleri";
  details.append(title);
  const list = document.createElement("ul");
  if (result.source === "metadata") {
    const item = document.createElement("li");
    item.textContent = result.reasons.map((reason) => reason.description).join(", ") + " (içerik puanlanmadı)";
    list.append(item);
  } else if (!result.candidates.length) {
    const item = document.createElement("li");
    item.textContent = "Anlamlı bir dil işareti bulunamadı.";
    list.append(item);
  }
  for (const candidate of result.candidates) {
    const item = document.createElement("li");
    item.textContent = `${names[candidate.language] ?? candidate.language}: ${candidate.score} — ` +
      candidate.reasons.map((reason) => `${reason.description} (+${reason.score})`).join("; ");
    list.append(item);
  }
  if (result.language === "unknown" && result.candidates.length) {
    const note = document.createElement("p");
    note.textContent = "İşaretler yetersiz veya adayların puanları birbirine yakın.";
    details.append(note);
  }
  details.append(list);
  container.append(details);
}

const samples = document.querySelector<HTMLElement>("#samples");
if (samples) {
  const blocks = detectCodeBlocks(samples);
  for (const block of blocks) {
    const output = block.element.closest("article")?.querySelector<HTMLElement>(".result");
    if (output) renderResult(output, block);
  }
  const status = document.querySelector("#scan-status");
  if (status) status.textContent = `${blocks.length} bağımsız kod bloğu tarandı.`;
}

const input = document.querySelector<HTMLTextAreaElement>("#playground");
const output = document.querySelector<HTMLElement>("#playground-result");
document.querySelector("#detect")?.addEventListener("click", () => {
  if (input && output) renderResult(output, detectLanguage(input.value));
});
