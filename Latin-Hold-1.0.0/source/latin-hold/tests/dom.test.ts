// Synthetic DOM integration tests. These exercise real CodeMirror state/view,
// but do not claim to reproduce a native browser's default typing or OS IME.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore optional development dependency, installed only for this suite
import { JSDOM } from 'jsdom';
import { EditorState, EditorSelection, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo, redo } from '@codemirror/commands';
import { createHoldExtension, type EditorController } from '../src/editor';
import { DEFAULT_SETTINGS, type HoldSettings } from '../src/settings';
import { parseCustom } from '../src/variants';

const dom = new JSDOM('<!doctype html><html><body><div id="editor"></div><input id="outside"></body></html>', { pretendToBeVisual: true, url: 'https://local.test/' });
const win = dom.window;
for (const name of ['window', 'document', 'navigator', 'MutationObserver', 'Node', 'HTMLElement', 'Element', 'Document', 'Window', 'DOMRect', 'getComputedStyle']) {
  Object.defineProperty(globalThis, name, { configurable: true, value: name === 'window' ? win : win[name] });
}
globalThis.requestAnimationFrame = win.requestAnimationFrame.bind(win);
globalThis.cancelAnimationFrame = win.cancelAnimationFrame.bind(win);
win.Range.prototype.getBoundingClientRect = () => ({ x: 30, y: 30, left: 30, right: 31, top: 30, bottom: 50, width: 1, height: 20 });
win.Range.prototype.getClientRects = () => [];
const results: string[] = [];
let current: EditorView | undefined;
const settle = () => new Promise(resolve => setTimeout(resolve, 20));
function setup(options: Partial<HoldSettings> & { doc?: string; ranges?: Array<[number, number]>; readonly?: boolean } = {}) {
  current?.destroy();
  const parent = document.getElementById('editor')!; parent.replaceChildren();
  const settings = { ...DEFAULT_SETTINGS, delay: 200, ...options };
  const controllers = new Set<EditorController>();
  const custom = parseCustom(settings.custom);
  const doc = options.doc || '';
  const selection = options.ranges ? EditorSelection.create(options.ranges.map(([a, h]) => EditorSelection.range(a, h))) : EditorSelection.cursor(doc.length);
  const view = current = new EditorView({ parent, state: EditorState.create({ doc, selection, extensions: [
    EditorState.readOnly.of(!!options.readonly), EditorState.allowMultipleSelections.of(true), history(),
    createHoldExtension({ settings: () => settings, custom: () => custom, controllers })
  ] }) });
  view.focus();
  const stroke = (type: string, key: string, extra: Record<string, unknown> = {}) => {
    const event = new win.KeyboardEvent(type, { bubbles: true, cancelable: true, key, code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : /^[0-9]$/.test(key) ? `Digit${key}` : key, ...extra });
    view.contentDOM.dispatchEvent(event); return event.defaultPrevented;
  };
  return {
    view, controllers, text: () => view.state.doc.toString(),
    down: (key: string, extra = {}) => stroke('keydown', key, extra), up: (key: string, extra = {}) => stroke('keyup', key, extra),
    async open(key: string) { stroke('keydown', key); await new Promise(resolve => setTimeout(resolve, 230)); stroke('keyup', key); assert.ok(document.querySelector('.latin-hold-picker')); },
    input(text: string) { view.dispatch({ ...view.state.replaceSelection(text), annotations: Transaction.userEvent.of('input.type') }); }
  };
}
after(async () => { current?.destroy(); await settle(); win.close(); });

test('CM6: short taps insert once and overlapping keys preserve order', async () => {
  const t = setup(); assert.equal(t.down('c'), true); assert.equal(t.text(), ''); t.down('a'); t.up('c'); t.down('f'); t.up('a'); t.down('e'); t.up('f'); t.up('e'); assert.equal(t.text(), 'cafe'); await settle();
});
test('CM6: repeats cannot write before or after long press selection', async () => {
  const t = setup(); t.down('c'); for (let i = 0; i < 10; i++) t.down('c', { repeat: true });
  await new Promise(resolve => setTimeout(resolve, 230)); assert.equal(t.text(), ''); t.down('1'); t.up('1');
  for (let i = 0; i < 10; i++) t.down('c', { repeat: true });
  assert.equal(t.text(), 'ç'); t.up('c'); t.down('c'); t.up('c'); assert.equal(t.text(), 'çc');
});
test('CM6: open picker locks beforeinput and real input transactions', async () => {
  const t = setup(); await t.open('e'); t.down('x'); t.up('x');
  const input = new win.InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: 'leak' });
  t.view.contentDOM.dispatchEvent(input); assert.equal(input.defaultPrevented, true);
  t.input('leak'); assert.equal(t.text(), ''); t.down('2'); t.up('2'); assert.equal(t.text(), 'è'); t.input('!'); assert.equal(t.text(), 'è!');
});
test('CM6: replacement, undo, redo and original selection are preserved', async () => {
  const t = setup({ doc: 'hello world', ranges: [[6, 11]] }); await t.open('e'); t.down('1'); t.up('1'); assert.equal(t.text(), 'hello é');
  undo(t.view); assert.equal(t.text(), 'hello world'); assert.equal(t.view.state.selection.main.from, 6); assert.equal(t.view.state.selection.main.to, 11);
  redo(t.view); assert.equal(t.text(), 'hello é');
});
test('CM6: multiple selections are replaced simultaneously', async () => {
  const t = setup({ doc: 'one two', ranges: [[0, 3], [4, 7]] }); await t.open('e'); t.down('1'); t.up('1'); assert.equal(t.text(), 'é é');
});
test('CM6: Backspace leaves original document and selection intact', async () => {
  const t = setup({ doc: 'hello world', ranges: [[6, 11]] }); await t.open('c'); t.down('Backspace'); t.up('Backspace'); assert.equal(t.text(), 'hello world'); assert.equal(t.view.state.selection.main.from, 6); assert.equal(t.view.state.selection.main.to, 11);
});
test('CM6: Escape resumes editing, with one original letter', async () => {
  const t = setup(); await t.open('c'); t.down('Escape'); t.up('Escape'); t.down('a'); t.up('a'); t.down('t'); t.up('t'); assert.equal(t.text(), 'cat'); assert.equal(document.querySelector('.latin-hold-picker'), null);
});
test('CM6: uppercase number-row and keypad choose proper Unicode letters', async () => {
  const t = setup({ preset: 'german' }); await t.open('S'); t.down('1', { code: 'Numpad1' }); t.up('1', { code: 'Numpad1' }); assert.equal(t.text(), 'ẞ');
  await t.open('U'); t.down('!', { code: 'Digit1', shiftKey: true }); t.up('!', { code: 'Digit1', shiftKey: true }); assert.equal(t.text(), 'ẞÜ');
});
test('CM6: pagination and button click operate without native text leakage', async () => {
  const t = setup(); await t.open('a'); t.down('Tab'); t.up('Tab'); assert.equal(document.querySelector('.latin-hold-page-count')?.textContent, '2 / 2');
  (document.querySelector('.latin-hold-option') as HTMLElement).click(); assert.equal(t.text(), 'ą'); assert.equal(t.view.hasFocus, true);
});
test('CM6: external edit invalidates selection and clears transaction gate', async () => {
  const t = setup(); await t.open('e'); t.view.dispatch({ changes: { from: 0, insert: 'synced' } }); await settle();
  assert.equal(document.querySelector('.latin-hold-picker'), null); assert.equal(t.text(), 'synced'); t.input('!'); assert.ok(t.text().includes('!')); assert.ok(!t.text().includes('é'));
});
test('CM6: external cursor movement cancels without stale replacement', async () => {
  const t = setup({ doc: 'original' }); await t.open('e'); t.view.dispatch({ selection: EditorSelection.cursor(0) }); await settle();
  assert.equal(document.querySelector('.latin-hold-picker'), null); t.input('!'); assert.equal(t.text(), '!original');
});
test('CM6: focus loss ends waiting and other input fields remain untouched', async () => {
  const t = setup(); await t.open('c'); const input = document.getElementById('outside') as HTMLInputElement; input.focus();
  assert.equal(t.text(), 'c'); assert.equal(document.querySelector('.latin-hold-picker'), null);
  const event = new win.KeyboardEvent('keydown', { key: 'c', code: 'KeyC', bubbles: true, cancelable: true }); input.dispatchEvent(event); assert.equal(event.defaultPrevented, false);
});
test('CM6: disabled, read-only and IME events are not captured', async () => {
  let t = setup({ enabled: false }); assert.equal(t.down('c'), false); t.up('c');
  t = setup({ readonly: true }); assert.equal(t.down('c'), false); t.up('c');
  t = setup(); assert.equal(t.down('a', { isComposing: true, keyCode: 229 }), false); t.up('a'); assert.equal(t.text(), '');
});
test('CM6: destroying editor releases its popup and registration', async () => {
  const t = setup(); await t.open('e'); t.view.destroy(); current = undefined; assert.equal(t.controllers.size, 0); assert.equal(document.querySelector('.latin-hold-picker'), null); await settle();
});
