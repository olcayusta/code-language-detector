import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('demo entry point loads HTML, relative CSS and browser modules', { timeout: 10000 }, async (t) => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../scripts/serve.mjs', import.meta.url))], {
    env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => child.kill());
  const base = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => reject(new Error(`Demo server exited early: ${code}`)));
    child.stderr.on('data', (data) => reject(new Error(data.toString())));
    child.stdout.on('data', (data) => {
      const match = data.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) resolve(match[0]);
    });
  });
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.equal(new URL(page.url).pathname, '/demo/index.html');
  const html = await page.text();
  const cssPath = html.match(/href="([^"]+\.css)"/)[1];
  const scriptPath = html.match(/src="([^"]+\.js)"/)[1];
  const css = await fetch(new URL(cssPath, page.url));
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
  assert.match(await css.text(), /#samples/);
  const script = await fetch(new URL(scriptPath, page.url));
  assert.equal(script.status, 200);
  assert.match(script.headers.get('content-type'), /javascript/);
  assert.match(await script.text(), /detectCodeBlocks/);
  assert.equal((await fetch(`${base}/package.json`)).status, 403);
  assert.equal((await fetch(`${base}/demo/missing.html`)).status, 404);
});
