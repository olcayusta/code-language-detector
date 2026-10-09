import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { accuracyFixtures, exploratoryFixtures } from '../tests/accuracy-fixtures.mjs';
import { fixtures } from '../tests/fixtures.mjs';
import { v21Fixtures, v21Probes } from '../tests/v21-fixtures.mjs';

const [modulePath = 'dist/index.js', output, variant = 'current'] = process.argv.slice(2);
const { detectLanguage } = await import(pathToFileURL(resolve(modulePath)).href);
const implementation = createHash('sha256');
const moduleRoot = dirname(resolve(modulePath));
for (const file of (await readdir(moduleRoot, { recursive: true })).filter((name) => name.endsWith('.js')).sort()) {
  implementation.update(file.replaceAll('\\', '/') + '\0').update(await readFile(join(moduleRoot, file))).update('\0');
}
const original = fixtures.flatMap(([language, single, multi]) => [single, multi].map((code, i) => ({
  id: `${language}/original-${i}`, language, code,
})));
const evaluate = (cases) => {
  const results = cases.map(({ id, feature, language, code }) => {
    const result = detectLanguage(code);
    return { id, ...(feature ? { feature } : {}), expected: language, actual: result.language, score: result.score, correct: result.language === language };
  });
  const byLanguage = {};
  const byFeature = {};
  for (const result of results) {
    const row = byLanguage[result.expected] ??= { correct: 0, total: 0 };
    row.total++;
    row.correct += Number(result.correct);
    if (result.feature) {
      const feature = byFeature[result.feature] ??= { correct: 0, total: 0 };
      feature.total++;
      feature.correct += Number(result.correct);
    }
  }
  return { correct: results.filter((r) => r.correct).length, total: results.length, byLanguage, ...(Object.keys(byFeature).length ? { byFeature } : {}), results };
};
const report = { original: evaluate(original), regression: evaluate(accuracyFixtures), exploratory: evaluate(exploratoryFixtures),
  v21: evaluate(v21Fixtures), remaining: evaluate(v21Probes) };
const metadata = {
  variant, nodeVersion: process.version,
  implementationSha256: implementation.digest('hex'),
  corpusSha256: createHash('sha256').update(await readFile(new URL('../tests/accuracy-fixtures.mjs', import.meta.url))).digest('hex'),
  v21CorpusSha256: createHash('sha256').update(await readFile(new URL('../tests/v21-fixtures.mjs', import.meta.url))).digest('hex'),
};
if (output) await writeFile(output, JSON.stringify({ metadata, ...report }, null, 2) + '\n');
for (const [name, result] of Object.entries(report)) {
  console.log(`${name}: ${result.correct}/${result.total}`);
  for (const row of result.results.filter((r) => !r.correct)) console.log(`  ${row.id}: expected ${row.expected}, got ${row.actual}`);
}
