import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectLanguage, detectCodeBlocks, defaultLanguages, LanguageRegistry,
  createDetector, defineLanguage,
} from '../dist/index.js';
import { fixtures } from './fixtures.mjs';

for (const [language, single, multiline] of fixtures) {
  for (const [label, code] of [['single line', single], ['multiple lines', multiline]]) {
    test(`${language}: ${label}`, () => {
      const result = detectLanguage(code);
      assert.equal(result.language, language, JSON.stringify(result));
      assert.equal(result.source, 'content');
      assert.ok(result.score >= 5);
      assert.equal(result.score, result.candidates[0].score);
      assert.deepEqual(result.reasons, result.candidates[0].reasons);
      for (const candidate of result.candidates) {
        assert.equal(candidate.score, candidate.reasons.reduce((sum, reason) => sum + reason.score, 0));
      }
    });
  }
}

test('all 13 languages have an independent definition', () => {
  assert.equal(defaultLanguages.length, 13);
  assert.equal(new Set(defaultLanguages.map(({ name }) => name)).size, 13);
});

for (const code of ['', '  \n\t', 'hello world', 'value = 42;', 'foo();', 'return value;', 'class Example {}', 'interface Example {}', 'int main() { return 0; }', 'const value = 1;', 'function greet() {}', 'SELECT', 'echo', 'print(value)', '123', 'true', '"hello"', '{name: "Ada"}', '{"name":"Ada",}']) {
  test(`insufficient or shared evidence: ${JSON.stringify(code)}`, () => {
    const result = detectLanguage(code);
    assert.equal(result.language, 'unknown', JSON.stringify(result));
    assert.equal(result.source, 'unknown');
    assert.equal(result.score, 0);
  });
}

test('empty result has the specified shape', () => {
  assert.deepEqual(detectLanguage(''), { language: 'unknown', score: 0, source: 'unknown', candidates: [], reasons: [] });
});

for (const [language, code] of [
  ['javascript', 'const user = { name: "Ada" }; console.log(user);'],
  ['typescript', 'type ID = string | number;'],
  ['typescript', 'function greet(name: string): string { console.log(name); return name; }'],
  ['typescript', 'export interface Item {}'],
  ['typescript', 'const result = value as number; console.log(result);'],
  ['typescript', 'const user: User = makeUser();'],
  ['c', '#include <stdlib.h>\nint main(void) { void *p = malloc(sizeof(int)); free(p); }'],
  ['c', '#   include "stdio.h"\nint main(void) { printf("hello"); }'],
  ['cpp', '#include <stdio.h>\nint main() { std::vector<int> ids; printf("hello"); }'],
  ['cpp', 'template <typename T> T identity(T value) { return value; }'],
  ['html', '<img src="hello.png" alt="Hello">'],
  ['html', '<DIV>Hello</DIV>'],
  ['html', '<div>Hello</DIV>'],
  ['xml', '<root/>'],
  ['xml', '<custom:item>value</custom:item>'],
  ['xml', '<svg xmlns="http://www.w3.org/2000/svg"><path/></svg>'],
  ['xml', '<?xml version="1.0"?><html><body>Text</body></html>'],
  ['json', '[]'],
  ['json', '[1, true, null, {"message":"console.log()"}]'],
  ['javascript', 'const data = {"name":"Ada"}; console.log(data);'],
  ['javascript', 'const markup = "<div>Hello</div>"; console.log(markup);'],
  ['javascript', 'console.log("body { color: red; }");'],
  ['php', '$message = "Hello"; echo $message;'],
  ['php', '$user->save();'],
  ['python', 'import sys\nprint(sys.version)'],
  ['sql', 'update users set name = \'Ada\' where id = 1;'],
  ['css', '@keyframes pulse { from { opacity: 0; } to { opacity: 1; } }'],
  ['css', 'p::before { content: "hello"; }'],
  ['csharp', 'public string Name { get; set; }'],
]) {
  test(`separation / characteristic syntax: ${language}: ${code.slice(0, 60)}`, () => {
    assert.equal(detectLanguage(code).language, language, JSON.stringify(detectLanguage(code)));
  });
}

for (const code of [
  '// console.log("hello");\n/* SELECT * FROM users; */',
  '# console.log("hello");',
  '-- SELECT * FROM users;',
  '<!-- <div>Hello</div> -->',
  'const x = "<?php echo $value; SELECT * FROM users";',
  'const x = `interface User { name: string; }`;',
  'const x = "<catalog><book>Hello</book></catalog>";',
  '"console.log(123)"',
]) {
  test(`comments and strings are not executable evidence: ${code.slice(0, 60)}`, () => {
    assert.equal(detectLanguage(code).language, 'unknown', JSON.stringify(detectLanguage(code)));
  });
}

test('close scores produce unknown while retaining evidence', () => {
  const result = detectLanguage('console.log("hello");\nConsole.WriteLine("hello");');
  assert.equal(result.language, 'unknown');
  assert.equal(result.score, 0);
  assert.deepEqual(result.candidates.map(({ language, score }) => [language, score]), [['csharp', 5], ['javascript', 5]]);
  assert.ok(result.candidates.every(({ reasons }) => reasons.length > 0));
});

test('repeating one keyword does not inflate scores', () => {
  assert.equal(detectLanguage('console.log(1);'.repeat(1000)).score, detectLanguage('console.log(1);').score);
  assert.equal(detectLanguage('const value = 1;'.repeat(100)).language, 'unknown');
});

test('the detector never executes code', () => {
  delete globalThis.__detectorExecuted;
  detectLanguage('globalThis.__detectorExecuted = true; console.log("Hello");');
  assert.equal(globalThis.__detectorExecuted, undefined);
});

test('text detection works without a global DOM', () => {
  assert.equal(typeof document, 'undefined');
  assert.equal(detectLanguage('console.log(1)').language, 'javascript');
  assert.throws(() => detectCodeBlocks(), /needs a DOM root/);
});

test('new languages can be registered without changing the engine', () => {
  const registry = new LanguageRegistry(defaultLanguages);
  const detector = createDetector(registry);
  registry.register(defineLanguage('example', ['ex'], [{
    id: 'example-structure', description: 'Example greeting structure', score: 5,
    distinctive: true, test: /^HELLO\s+WORLD$/,
  }]));
  assert.equal(registry.resolve(' EX '), 'example');
  assert.equal(detector('HELLO WORLD').language, 'example');
  assert.equal(detectLanguage('HELLO WORLD').language, 'unknown');
});

test('alias collisions fail without partially registering a language', () => {
  const registry = new LanguageRegistry(defaultLanguages);
  assert.throws(() => registry.register(defineLanguage('extra', ['unused', 'JS'], [])), /duplicate/);
  assert.equal(registry.resolve('unused'), undefined);
  assert.equal(registry.resolve('extra'), undefined);
  assert.equal(registry.getAll().length, 13);
  assert.throws(() => registry.register(defineLanguage('unknown', [], [])), /Language names/);
  assert.throws(() => registry.register(defineLanguage('JavaScript', [], [])), /Language names/);
  assert.throws(() => registry.register(defineLanguage('javascript', [], [])), /already registered/);
});

test('thresholds can be configured and invalid options fail early', () => {
  const registry = new LanguageRegistry(defaultLanguages);
  assert.equal(createDetector(registry, { minimumScore: 6 })('console.log(1)').language, 'unknown');
  assert.equal(createDetector(registry, { minimumMargin: 3 })('const x: number = 1;').language, 'typescript');
  for (const options of [{ minimumScore: 0 }, { minimumScore: NaN }, { minimumMargin: 0 }, { minimumMargin: Infinity }]) {
    assert.throws(() => createDetector(registry, options), /minimum/);
  }
});

test('global and sticky patterns remain deterministic', () => {
  const registry = new LanguageRegistry([defineLanguage('test', [], [{
    id: 'test', description: 'Test structure', score: 5, distinctive: true, test: /TEST/g,
  }])]);
  const detector = createDetector(registry);
  assert.deepEqual(detector('TEST'), detector('TEST'));
});
