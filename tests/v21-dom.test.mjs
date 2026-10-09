import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHTML } from 'linkedom';
import { detectCodeBlocks } from '../dist/index.js';

test('V2.1 DOM detection preserves metadata, exact code text and the document', () => {
  const document = parseHTML('<html><body><pre></pre><pre></pre><pre></pre><pre data-lang="ts"></pre><pre></pre></body></html>').document;
  const examples = [
    '`result: ${console.log(1)}`',
    'const view = <Widget />;',
    'match command:\n    case "quit":\n        exit()',
    'const view = <Widget />;',
    '`console.log(1); interface User {name: string;}`',
  ];
  [...document.querySelectorAll('pre')].forEach((pre, index) => { pre.textContent = examples[index]; });
  const before = document.toString();
  const results = detectCodeBlocks(document);
  assert.deepEqual(results.map((r) => r.language), ['javascript', 'javascript', 'python', 'typescript', 'unknown']);
  assert.deepEqual(results.map((r) => r.source), ['content', 'content', 'content', 'metadata', 'unknown']);
  assert.deepEqual(results.map((r) => r.code), examples);
  assert.equal(document.toString(), before);
});
