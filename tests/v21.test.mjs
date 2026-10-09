import assert from 'node:assert/strict';
import test from 'node:test';
import { detectLanguage, createDetector, LanguageRegistry } from '../dist/index.js';
import { v21Fixtures } from './v21-fixtures.mjs';
import { exploratoryFixtures } from './accuracy-fixtures.mjs';

for (const { id, language, code } of [...exploratoryFixtures, ...v21Fixtures]) {
  test(`V2.1: ${id}`, () => {
    const result = detectLanguage(code);
    assert.equal(result.language, language, JSON.stringify(result));
    assert.equal(result.source, language === 'unknown' ? 'unknown' : 'content');
    for (const candidate of result.candidates) {
      assert.equal(candidate.score, candidate.reasons.reduce((sum, reason) => sum + reason.score, 0));
      assert.equal(new Set(candidate.reasons.map((r) => r.rule)).size, candidate.reasons.length);
    }
  });
}

test('V2.1 context alignment and line breaks survive nested interpolation and JSX', () => {
  const code = 'const view = `line\n${\n <div title="interface User {}">\nSystem.out.println(1);\n{console.log(1)}\n</div>\n}\n`;';
  const detect = createDetector(new LanguageRegistry([{
    name: 'example', aliases: [], detect(context) {
      assert.equal(context.code.length, context.text.length);
      assert.equal(context.code.length, context.syntax.length);
      assert.deepEqual([...context.code.matchAll(/\r?\n/g)].map((m) => m.index), [...context.syntax.matchAll(/\r?\n/g)].map((m) => m.index));
      assert.match(context.syntax, /console\.log/);
      assert.doesNotMatch(context.syntax, /System\.out|interface User/);
      return [{ rule: 'checked', description: 'Checked context', score: 5, distinctive: true }];
    },
  }]));
  assert.equal(detect(code).language, 'example');
});

test('V2.1 repeated JSX, interpolation and match blocks do not inflate scores', () => {
  for (const code of ['`value ${console.log(1)}`', 'const view = <Widget />;', 'match value:\n    case _: pass']) {
    assert.deepEqual(detectLanguage((code + '\n').repeat(100)), detectLanguage(code));
  }
});

test('V2.1 plain JSX text/props and template text never add keyword evidence', () => {
  for (const code of [
    'const view = <div title="interface User {name: string;}">System.out.println(1); Console.WriteLine(1);</div>;',
    '`System.out.println(1); interface User {name: string;} ${console.log(1)}`',
  ]) {
    const result = detectLanguage(code);
    assert.equal(result.language, 'javascript');
    assert.ok(result.candidates.every((c) => !['java', 'csharp', 'typescript'].includes(c.language)), JSON.stringify(result));
  }
});

test('V2.1 nested templates are bounded and code is never executed', () => {
  const deeplyNested = '`x ${'.repeat(100) + 'console.log(1)' + '}`'.repeat(100);
  assert.doesNotThrow(() => detectLanguage(deeplyNested));
  assert.equal(detectLanguage(deeplyNested).language, 'unknown');
  delete globalThis.__v21Executed;
  detectLanguage('`x ${globalThis.__v21Executed = true; console.log(1)}`');
  assert.equal(globalThis.__v21Executed, undefined);
});

test('V2.1 deeply nested JSX is bounded and conflicting evidence stays unknown', () => {
  const code = 'const view = ' + '<Box>'.repeat(100) + 'Hello' + '</Box>'.repeat(100) + ';';
  assert.doesNotThrow(() => detectLanguage(code));
  assert.equal(detectLanguage(code).language, 'unknown');
  const mixed = detectLanguage('`x ${console.log(1)}`; Console.WriteLine(1);');
  assert.equal(mixed.language, 'unknown');
  assert.deepEqual(mixed.candidates.map(({ language, score }) => [language, score]), [['csharp', 5], ['javascript', 5]]);
});

test('V2.1 Python docstrings and comments do not add match/case evidence', () => {
  for (const code of [
    'def example():\n    """match command:\n        case _: pass"""\n    return None',
    'def example():\n    #match command:\n    #    case _: pass\n    return None',
  ]) {
    const result = detectLanguage(code);
    assert.equal(result.language, 'python');
    assert.ok(result.reasons.every((reason) => reason.rule !== 'py-match-case'));
  }
});
