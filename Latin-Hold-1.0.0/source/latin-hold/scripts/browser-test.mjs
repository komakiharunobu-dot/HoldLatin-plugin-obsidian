import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const playwright = process.env.PLAYWRIGHT_MODULE ? require(process.env.PLAYWRIGHT_MODULE) : await import('playwright');
mkdirSync('.test-build', { recursive: true });
mkdirSync('test-results', { recursive: true });
await build({ entryPoints: ['tests/harness.ts'], bundle: true, format: 'iife', target: 'es2020', outfile: '.test-build/harness.js' });
writeFileSync('.test-build/harness.html', `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Latin Hold · editor integration test</title><style>body{font-family:system-ui;background:#f5f3f8;color:#24202e;padding:40px}main{max-width:850px;margin:auto}h1{font-size:24px;margin:0 0 8px}p{color:#797185}#editor{background:white;border:1px solid #ded8e7;border-radius:12px;overflow:hidden}#outside{margin-top:24px;padding:8px} ${readFileSync('styles.css', 'utf8')}</style><main><h1>Latin Hold</h1><p>长按字母，选择你需要的变体</p><div id="editor"></div><input id="outside" placeholder="普通输入框"></main><script src="harness.js"></script></html>`);
let launch = { headless: true, args: ['--no-sandbox'] };
if (process.env.CHROMIUM_EXECUTABLE) launch.executablePath = process.env.CHROMIUM_EXECUTABLE;
if (process.env.CHROMIUM_MODULE) {
  const chromium = require(process.env.CHROMIUM_MODULE);
  launch = { headless: true, executablePath: await chromium.executablePath(), args: chromium.args };
}
const browser = await playwright.chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
await page.goto(pathToFileURL(resolve('.test-build/harness.html')).href);
const results = [];
const reset = options => page.evaluate(options => window.testApi.reset(options), options || {});
const text = () => page.evaluate(() => window.testApi.text());
const open = async key => { await page.keyboard.down(key); await page.waitForSelector('.latin-hold-picker'); await page.keyboard.up(key); };
const scenario = async (name, run) => {
  try { await run(); results.push({ name, pass: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, pass: false, error: String(error) }); console.error(`FAIL ${name}: ${error}`); }
};
try {
  await scenario('native fast typing and overlapping letter keys', async () => {
    await reset(); await page.keyboard.type('cafe, queue! '); assert.equal(await text(), 'cafe, queue! ');
    await page.keyboard.down('c'); await page.keyboard.down('a'); await page.keyboard.up('c'); await page.keyboard.down('f'); await page.keyboard.up('a'); await page.keyboard.down('e'); await page.keyboard.up('f'); await page.keyboard.up('e');
    assert.equal(await text(), 'cafe, queue! cafe');
  });
  await scenario('500 ms trigger and repeat suppression before/after popup', async () => {
    await reset(); await page.keyboard.down('c'); await page.waitForTimeout(150);
    for (let i = 0; i < 10; i++) await page.keyboard.down('c');
    assert.equal(await text(), ''); assert.equal(await page.locator('.latin-hold-picker').count(), 0);
    await page.waitForSelector('.latin-hold-picker');
    for (let i = 0; i < 10; i++) await page.keyboard.down('c');
    assert.equal(await text(), ''); await page.keyboard.press('1'); assert.equal(await text(), 'ç');
    for (let i = 0; i < 10; i++) await page.keyboard.down('c');
    assert.equal(await text(), 'ç'); await page.keyboard.up('c'); await page.keyboard.type('c'); assert.equal(await text(), 'çc');
  });
  await scenario('picker stays after release; letters and clipboard input remain locked', async () => {
    await reset(); await open('e'); await page.keyboard.type('xyz.,');
    await page.keyboard.insertText('pasted');
    await page.evaluate(() => window.testApi.input('injected'));
    assert.equal(await text(), ''); await page.keyboard.press('2'); assert.equal(await text(), 'è');
  });
  await scenario('selection key repeat never appends the numeral', async () => {
    await reset(); await open('e'); await page.keyboard.down('1');
    for (let i = 0; i < 10; i++) await page.keyboard.down('1');
    await page.keyboard.up('1'); assert.equal(await text(), 'é'); await page.keyboard.press('1'); assert.equal(await text(), 'é1');
  });
  await scenario('letter pressed while waiting does not leak after selection', async () => {
    await reset(); await open('e'); await page.keyboard.down('x'); await page.keyboard.press('1'); await page.keyboard.down('x'); await page.keyboard.up('x'); assert.equal(await text(), 'é');
  });
  await scenario('Escape preserves base once and resumes input', async () => {
    await reset(); await open('c'); await page.keyboard.press('Escape'); await page.keyboard.type('at'); assert.equal(await text(), 'cat');
  });
  await scenario('Backspace cancellation keeps existing selection unchanged', async () => {
    await reset({ doc: 'hello world', ranges: [[6, 11]] }); await open('c'); await page.keyboard.press('Backspace'); assert.equal(await text(), 'hello world');
  });
  await scenario('choose replaces selected text; undo and redo restore correctly', async () => {
    await reset({ doc: 'hello world', ranges: [[6, 11]] }); await open('e'); await page.keyboard.press('1'); assert.equal(await text(), 'hello é');
    await page.evaluate(() => window.testApi.undo()); assert.equal(await text(), 'hello world'); await page.evaluate(() => window.testApi.redo()); assert.equal(await text(), 'hello é');
  });
  await scenario('multiple selections receive one chosen letter each', async () => {
    await reset({ doc: 'one two', ranges: [[0, 3], [4, 7]] }); await open('e'); await page.keyboard.press('1'); assert.equal(await text(), 'é é');
  });
  await scenario('Shift uppercase and number while Shift is held', async () => {
    await reset(); await page.keyboard.down('Shift'); await open('C'); await page.keyboard.press('Digit1'); await page.keyboard.up('Shift'); assert.equal(await text(), 'Ç');
  });
  await scenario('German uppercase sharp S and numeric keypad', async () => {
    await reset({ preset: 'german' }); await open('S'); await page.keyboard.press('Numpad1'); assert.equal(await text(), 'ẞ');
  });
  await scenario('Tab paging, page-local numbering, arrow and Enter', async () => {
    await reset(); await open('a'); await page.keyboard.press('Tab'); assert.equal(await page.locator('.latin-hold-page-count').innerText(), '2 / 2'); await page.keyboard.press('1'); assert.equal(await text(), 'ą');
    await open('e'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter'); assert.equal(await text(), 'ąè');
  });
  await scenario('mouse selection preserves editor focus', async () => {
    await reset(); await open('e'); await page.locator('.latin-hold-option').nth(3).click(); assert.equal(await text(), 'ë'); await page.keyboard.type('x'); assert.equal(await text(), 'ëx');
  });
  await scenario('outside click cancels, ordinary input fields stay native', async () => {
    await reset(); await open('c'); await page.locator('#outside').click(); await page.locator('#outside').fill(''); await page.keyboard.type('ccccc');
    assert.equal(await text(), 'c'); assert.equal(await page.locator('#outside').inputValue(), 'ccccc'); assert.equal(await page.locator('.latin-hold-picker').count(), 0);
  });
  await scenario('disabled plugin and readonly editor do not intercept typing', async () => {
    await reset({ enabled: false }); await page.keyboard.down('c'); await page.keyboard.down('c'); await page.keyboard.up('c'); assert.equal(await text(), 'cc');
    await reset({ readonly: true }); await page.keyboard.press('c'); await page.waitForTimeout(550); assert.equal(await text(), ''); assert.equal(await page.locator('.latin-hold-picker').count(), 0);
  });
  await scenario('normal selection and undo shortcuts remain available', async () => {
    await reset({ doc: 'before' }); await page.keyboard.press('Control+a'); await page.keyboard.type('after'); assert.equal(await text(), 'after'); await page.keyboard.press('Control+z'); assert.equal(await text(), 'before');
  });
  await scenario('external changes cancel stale bookmark and recover input', async () => {
    await reset(); await open('e'); await page.evaluate(() => window.testApi.external('synced')); assert.equal(await text(), 'synced'); assert.equal(await page.locator('.latin-hold-picker').count(), 0);
    await page.keyboard.press('End'); await page.keyboard.type('!'); assert.equal(await text(), 'synced!');
  });
  await scenario('IME composing events bypass idle; active picker remains gated', async () => {
    await reset(); const prevented = await page.evaluate(() => !document.querySelector('.cm-content').dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', keyCode: 229, isComposing: true, bubbles: true, cancelable: true })));
    assert.equal(prevented, false); await open('e');
    await page.evaluate(() => { const el = document.querySelector('.cm-content'); el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); window.testApi.input('中文'); el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); });
    assert.equal(await text(), ''); await page.keyboard.press('Escape'); assert.equal(await text(), 'e');
  });
  await scenario('custom list and cancellation preference', async () => {
    await reset({ custom: '{"e":["ë","ê"]}', keepBaseOnCancel: false }); await open('e'); await page.keyboard.press('1'); assert.equal(await text(), 'ë');
    await open('e'); await page.keyboard.press('Escape'); assert.equal(await text(), 'ë');
  });
  await scenario('destroy editor during picker removes popup and listeners', async () => {
    await reset(); await open('e'); await page.evaluate(() => window.testApi.destroy()); assert.equal(await page.locator('.latin-hold-picker').count(), 0);
    await page.locator('#outside').click(); await page.locator('#outside').fill(''); await page.keyboard.type('abc'); assert.equal(await page.locator('#outside').inputValue(), 'abc');
  });
  await reset({ doc: 'Français · Deutsch · Español\n\nEssayez : ' }); await open('e');
  await page.screenshot({ path: 'test-results/picker-light.png' });
  await page.addStyleTag({ content: 'body{background:#1d1b24;color:#eee}#editor{background:#262330;border-color:#41394f}:root{--background-primary:#262330;--background-secondary:#332c40;--text-normal:#eee7f8;--text-muted:#aa9bbd;--background-modifier-border:#514461;--interactive-accent:#9575e3;--text-on-accent:#fff}' });
  await page.screenshot({ path: 'test-results/picker-dark.png' });
  assert.deepEqual(errors, [], 'No browser or CodeMirror errors');
} finally {
  await browser.close();
  writeFileSync('test-results/browser.json', JSON.stringify({ results, errors }, null, 2));
}
if (results.some(result => !result.pass)) process.exitCode = 1;
console.log(`${results.filter(result => result.pass).length}/${results.length} browser scenarios passed.`);
