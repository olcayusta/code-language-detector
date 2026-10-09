import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { detectCodeBlocks, createCodeBlockDetector, LanguageRegistry, defineLanguage } from '../dist/index.js';

const dom = (html) => parseHTML(`<!doctype html><html><body>${html}</body></html>`).document;

for (const [attribute, language] of [
  ['class="language-php"', 'php'],
  ['class="highlight language-javascript"', 'javascript'],
  ['class="lang-ts"', 'typescript'],
  ['class="py"', 'python'],
  ['class="language-c++"', 'cpp'],
  ['class="language-cs"', 'csharp'],
  ['data-language="typescript"', 'typescript'],
  ['data-language=" TS "', 'typescript'],
  ['data-lang="CPP"', 'cpp'],
  ['lang="python"', 'python'],
  ['data-lang="c#"', 'csharp'],
]) {
  test(`code metadata: ${attribute}`, () => {
    const [result] = detectCodeBlocks(dom(`<pre><code ${attribute}>not enough evidence</code></pre>`));
    assert.equal(result.language, language);
    assert.equal(result.source, 'metadata');
    assert.equal(result.score, 0);
    assert.deepEqual(result.candidates, []);
    assert.equal(result.reasons.length, 1);
  });
}

test('pre attributes are supported directly', () => {
  const blocks = detectCodeBlocks(dom('<pre lang="python">anything</pre><pre data-lang="js">anything</pre><pre class="language-c">anything</pre><pre data-language="sql">anything</pre>'));
  assert.deepEqual(blocks.map(({ language }) => language), ['python', 'javascript', 'c', 'sql']);
  assert.ok(blocks.every(({ source }) => source === 'metadata'));
});

test('child metadata wins over parent metadata, even when content differs', () => {
  const [result] = detectCodeBlocks(dom('<pre lang="python"><code data-lang="php">console.log(1)</code></pre>'));
  assert.equal(result.language, 'php');
  assert.equal(result.source, 'metadata');
});

test('metadata attribute priority is deterministic', () => {
  const [result] = detectCodeBlocks(dom('<pre data-language="ts" data-lang="js" lang="py" class="language-php">anything</pre>'));
  assert.equal(result.language, 'typescript');
  assert.equal(result.reasons[0].rule, 'metadata-data-language');
});

test('unknown metadata falls through to other attributes and parent', () => {
  const results = detectCodeBlocks(dom('<pre lang="py"><code class="language-ruby">anything</code></pre><pre data-lang="ruby" class="language-js">anything</pre>'));
  assert.deepEqual(results.map(({ language }) => language), ['python', 'javascript']);
});

test('unknown metadata falls through to content', () => {
  const [result] = detectCodeBlocks(dom('<pre lang="en"><code class="highlight language-ruby">console.log(1);</code></pre>'));
  assert.equal(result.language, 'javascript');
  assert.equal(result.source, 'content');
});

test('empty content uses valid metadata; empty unlabelled blocks are unknown', () => {
  const results = detectCodeBlocks(dom('<pre><code data-lang="ts"></code></pre><pre> </pre>'));
  assert.equal(results[0].language, 'typescript');
  assert.equal(results[1].language, 'unknown');
});

test('each pre/code pair is detected once; inline code is ignored', () => {
  const results = detectCodeBlocks(dom('<p>Text <code class="language-python">def x(): pass</code></p><pre>console.log(1)</pre><pre><code>&lt;?php echo "Hi";</code></pre><pre><code>SELECT * FROM users;</code></pre>'));
  assert.equal(results.length, 3);
  assert.deepEqual(results.map(({ language }) => language), ['javascript', 'php', 'sql']);
  assert.equal(results[0].codeElement, null);
  assert.equal(results[1].codeElement.tagName, 'CODE');
});

test('entities and whitespace come from textContent, and the document is not modified', () => {
  const document = dom('<pre id="sample"><code>  &lt;div title=&quot;Hello&quot;&gt;A &amp; B&lt;/div&gt;\n</code></pre>');
  const before = document.toString();
  const [result] = detectCodeBlocks(document);
  assert.equal(result.language, 'html');
  assert.equal(result.code, '  <div title="Hello">A & B</div>\n');
  assert.equal(result.element, document.querySelector('#sample'));
  assert.equal(result.codeElement, document.querySelector('code'));
  assert.equal(document.toString(), before);
});

test('the full pre text is read, including text outside a nested code element', () => {
  const [result] = detectCodeBlocks(dom('<pre>const x = 1;\n<code>console.log(x);</code>\n</pre>'));
  assert.equal(result.code, 'const x = 1;\nconsole.log(x);\n');
  assert.equal(result.language, 'javascript');
});

test('element roots are scoped and a pre root itself is included', () => {
  const document = dom('<section id="scope"><pre>console.log(1)</pre></section><pre>SELECT * FROM users</pre>');
  assert.equal(detectCodeBlocks(document.querySelector('#scope')).length, 1);
  assert.equal(detectCodeBlocks(document.querySelector('pre')).length, 1);
});

test('a DocumentFragment root works', () => {
  const document = dom('');
  const fragment = document.createDocumentFragment();
  const pre = document.createElement('pre');
  pre.textContent = 'SELECT * FROM users;';
  fragment.append(pre);
  assert.equal(detectCodeBlocks(fragment)[0].language, 'sql');
});

test('nested pre elements are not counted twice', () => {
  const document = dom('');
  const outer = document.createElement('pre');
  const inner = document.createElement('pre');
  inner.textContent = 'console.log(1)';
  outer.append(inner);
  document.body.append(outer);
  assert.equal(detectCodeBlocks(document).length, 1);
});

test('the default root uses the browser document when present', () => {
  const previous = globalThis.document;
  globalThis.document = dom('<pre>console.log(1)</pre>');
  try {
    assert.equal(detectCodeBlocks().length, 1);
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});

test('custom registry supports metadata and content consistently', () => {
  const registry = new LanguageRegistry([defineLanguage('example', ['ex'], [{
    id: 'example', description: 'Example structure', score: 5, distinctive: true, test: /HELLO WORLD/,
  }])]);
  const detect = createCodeBlockDetector(registry);
  const results = detect(dom('<pre data-lang="ex">anything</pre><pre>HELLO WORLD</pre>'));
  assert.deepEqual(results.map(({ language, source }) => [language, source]), [['example', 'metadata'], ['example', 'content']]);
});

test('demo sample blocks produce their advertised languages', async () => {
  const html = await readFile(new URL('../demo/index.html', import.meta.url), 'utf8');
  const document = parseHTML(html).document;
  const results = detectCodeBlocks(document.querySelector('#samples'));
  assert.equal(results.length, 15);
  assert.deepEqual(results.map(({ language }) => language), ['javascript', 'typescript', 'php', 'python', 'sql', 'html', 'css', 'json', 'xml', 'java', 'c', 'cpp', 'csharp', 'javascript', 'unknown']);
});

test('V2 outer markup, JS object fields and explicit metadata work in DOM blocks', () => {
  const document = dom('<pre></pre><pre></pre><pre data-lang="ts"></pre><pre></pre>');
  const examples = [
    '<script>console.log("ready");</script><main>Ready</main>',
    'const flags = { enabled: boolean }; console.log(flags);',
    'const flags = { enabled: boolean }; console.log(flags);',
    '<?xml version="1.0"?><html><body>Ready</body></html>',
  ];
  [...document.querySelectorAll('pre')].forEach((pre, index) => { pre.textContent = examples[index]; });
  const before = document.toString();
  const results = detectCodeBlocks(document);
  assert.deepEqual(results.map(({ language }) => language), ['html', 'javascript', 'typescript', 'xml']);
  assert.deepEqual(results.map(({ source }) => source), ['content', 'content', 'metadata', 'content']);
  assert.deepEqual(results.map(({ code }) => code), examples);
  assert.equal(document.toString(), before);
});
