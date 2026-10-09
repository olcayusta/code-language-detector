import assert from 'node:assert/strict';
import test from 'node:test';
import { detectLanguage, defaultLanguages, createDetector, LanguageRegistry, defineLanguage } from '../dist/index.js';
import { accuracyFixtures } from './accuracy-fixtures.mjs';

for (const { id, language, code } of accuracyFixtures) {
  test(`V2 accuracy: ${id}`, () => {
    const result = detectLanguage(code);
    assert.equal(result.language, language, JSON.stringify(result));
    assert.equal(result.source, language === 'unknown' ? 'unknown' : 'content');
    for (const candidate of result.candidates) {
      assert.equal(candidate.score, candidate.reasons.reduce((sum, reason) => sum + reason.score, 0));
      assert.equal(new Set(candidate.reasons.map((r) => r.rule)).size, candidate.reasons.length);
    }
  });
}

test('V2 corpus covers every existing language with at least five examples', () => {
  for (const { name } of defaultLanguages) assert.ok(accuracyFixtures.filter((f) => f.language === name).length >= 5, name);
});

for (const code of ['std::cout << "hello";', 'export interface Item {}', 'const count: number = 1;', '#include <stdio.h>\nint main(void) { printf("hello"); }']) {
  test(`V2 repeated structures keep identical scores: ${code}`, () => {
    assert.deepEqual(detectLanguage((code + '\n').repeat(100)), detectLanguage(code));
  });
}

test('V2 equivalent patterns share an evidence group and use the strongest score', () => {
  const detector = createDetector(new LanguageRegistry([defineLanguage('example', [], [
    { id: 'short', group: 'greeting', description: 'Short', score: 3, test: /HELLO/ },
    { id: 'long', group: 'greeting', description: 'Long', score: 5, distinctive: true, test: /HELLO WORLD/ },
  ])]));
  const result = detector('HELLO WORLD HELLO WORLD');
  assert.equal(result.language, 'example');
  assert.equal(result.score, 5);
  assert.deepEqual(result.reasons.map((r) => r.rule), ['long']);
});

test('V2 custom duplicate rule IDs neither inflate scores nor qualify weak evidence', () => {
  const detector = createDetector(new LanguageRegistry([{
    name: 'example', aliases: [], detect: () => Array.from({ length: 100 }, () => ({
      rule: 'same', description: 'Same signal', score: 3, distinctive: false,
    })),
  }]));
  const result = detector('anything');
  assert.equal(result.language, 'unknown');
  assert.equal(result.candidates[0].score, 3);
});

test('V2 std::cout and export interface score once per structure', () => {
  assert.equal(detectLanguage('std::cout << 1;').score, 5);
  assert.equal(detectLanguage('export interface User { name: string; }').score, 5);
});

test('V2 strings and comments preserve code before and after masked payloads', () => {
  for (const payload of ['"interface A { name: string; }"', '`System.out.println(1);`', '/Console.WriteLine(1);/']) {
    assert.equal(detectLanguage(`const payload = ${payload}; console.log(payload);`).language, 'javascript');
  }
  assert.equal(detectLanguage('def run(): #console.log(1);\n    return None').language, 'python');
  assert.equal(detectLanguage('data = {"id": 1} #console.log(1);').language, 'unknown');
  assert.equal(detectLanguage('#interface User { name: string; }').language, 'unknown');
  assert.equal(detectLanguage('const ratio = a / b; console.log(ratio);').language, 'javascript');
  assert.equal(detectLanguage('let count = 1; count--; console.log(count);').language, 'javascript');
});

test('V2 equal-score grouped evidence preserves distinctive qualification in either order', () => {
  const patterns = [
    { id: 'weak', group: 'same', description: 'Weak', score: 5, test: /SIGNAL/ },
    { id: 'strong', group: 'same', description: 'Strong', score: 5, distinctive: true, test: /SIGNAL/ },
  ];
  for (const rules of [patterns, [...patterns].reverse()]) {
    const detect = createDetector(new LanguageRegistry([defineLanguage('example', [], rules)]));
    assert.equal(detect('SIGNAL').language, 'example');
    assert.equal(detect('SIGNAL').score, 5);
  }
});

test('V2 custom rules still receive unmasked markup syntax and aligned context fields', () => {
  const detector = createDetector(new LanguageRegistry([{
    name: 'example', aliases: [], detect(context) {
      assert.equal(context.code.length, context.text.length);
      assert.equal(context.code.length, context.syntax.length);
      assert.match(context.syntax, /<root>\n/);
      return [{ rule: 'root', description: 'Custom root', score: 5, distinctive: true }];
    },
  }]));
  assert.equal(detector('<root>\n"payload"</root>').language, 'example');
});

test('V2 shared class inheritance and records stay ambiguous without language evidence', () => {
  for (const code of ['class User extends Base {}', 'class Worker implements Runnable {}', 'record Point(int X, int Y) {}']) {
    assert.equal(detectLanguage(code).language, 'unknown', JSON.stringify(detectLanguage(code)));
  }
  assert.equal(detectLanguage('class User extends Base {} console.log(User);').language, 'javascript');
  assert.equal(detectLanguage('function greet(options = { name: string }) { console.log(options); }').language, 'javascript');
  assert.equal(detectLanguage('import {\n number as string\n} from "names";\nconsole.log(string);').language, 'javascript');
});

test('V2 incomplete characteristic calls and SELECT without an expression stay unknown', () => {
  for (const code of ['System.out.println(', 'Console.WriteLine(', 'document.querySelector(', 'SELECT FROM users;']) {
    assert.equal(detectLanguage(code).language, 'unknown', JSON.stringify(detectLanguage(code)));
  }
  assert.equal(detectLanguage('SELECT "name" FROM "users";').language, 'sql');
  assert.equal(detectLanguage("SELECT 'console.log(1);' FROM users;").language, 'sql');
});

test('V2 nested SVG namespaces preserve the HTML outer document', () => {
  assert.equal(detectLanguage('<div><svg xmlns="http://www.w3.org/2000/svg"><path/></svg></div>').language, 'html');
  assert.equal(detectLanguage('<div title="\n<catalog><book/></catalog>\n">Hello</div>').language, 'html');
});

test('V2 hash masking preserves multiline CSS selectors, comments and property variants', () => {
  for (const code of ['#card {\n color: #fff;\n}', '#card { margin-top: 1rem; }', '#card { /*note*/ padding-left: 1rem; }']) {
    assert.equal(detectLanguage(code).language, 'css', JSON.stringify(detectLanguage(code)));
  }
});
