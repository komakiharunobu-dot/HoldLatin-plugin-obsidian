const test = require('node:test');
const assert = require('node:assert/strict');
const { HoldEngine } = require('../.test-build/engine.cjs');
const { variantsFor, parseCustom, PRESETS } = require('../.test-build/variants.cjs');
const { normalizeSettings, DEFAULT_SETTINGS } = require('../.test-build/settings.cjs');

const key = (key, extra = {}) => ({ key, code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : /^[0-9]$/.test(key) ? `Digit${key}` : key, ...extra });
function setup(patch = {}, initial = '') {
  let clock = 0, timerId = 0, revision = 0;
  const timers = new Map();
  const state = { text: initial, from: initial.length, to: initial.length, locked: false, shown: null, commits: [], enabled: true };
  const settings = { ...DEFAULT_SETTINGS, ...patch };
  const custom = parseCustom(settings.custom);
  const engine = new HoldEngine({
    settings: () => settings,
    variants: base => variantsFor(base, settings.preset, custom),
    capture: () => state.enabled ? { from: state.from, to: state.to, revision } : null,
    valid: bookmark => bookmark.revision === revision && bookmark.from === state.from && bookmark.to === state.to,
    lock: () => { state.locked = true; },
    release: (text, bookmark) => {
      state.locked = false;
      if (text !== null && bookmark.revision === revision && bookmark.from === state.from && bookmark.to === state.to) {
        state.text = state.text.slice(0, state.from) + text + state.text.slice(state.to);
        state.to = state.from += text.length; revision++; state.commits.push(text);
      }
    },
    show: picker => { state.shown = picker; }, hide: () => { state.shown = null; },
    now: () => clock,
    later: (callback, ms) => { const id = ++timerId; timers.set(id, { callback, due: clock + ms }); return id; },
    clearTimer: id => timers.delete(id)
  });
  return {
    engine, state, settings, timers,
    down: (k, extra) => engine.keydown(key(k, extra)), up: (k, extra) => engine.keyup(key(k, extra)),
    tick(ms, fire = true) {
      clock += ms;
      if (fire) for (const [id, timer] of [...timers]) if (timer.due <= clock) { timers.delete(id); timer.callback(); }
    },
    external(text) { state.text = text; revision++; engine.validate(); }
  };
}

test('short tap inserts one base letter on release, without waiting 500 ms', () => {
  const t = setup(); assert.equal(t.down('c'), true); assert.equal(t.state.text, '');
  t.tick(80); t.up('c'); assert.equal(t.state.text, 'c'); assert.equal(t.state.locked, false); assert.equal(t.timers.size, 0);
});
test('499 ms remains pending; 500 ms opens with no base insertion', () => {
  const t = setup(); t.down('e'); t.tick(499); assert.equal(t.state.shown, null); t.tick(1);
  assert.equal(t.engine.pickerOpen, true); assert.equal(t.state.text, ''); assert.equal(t.state.locked, true);
});
test('key repeats before and after threshold never insert repeated letters', () => {
  const t = setup(); t.down('c');
  for (let i = 0; i < 100; i++) { assert.equal(t.down('c', { repeat: true }), true); t.tick(20); }
  assert.equal(t.state.text, ''); t.down('1'); assert.equal(t.state.text, 'ç'); assert.deepEqual(t.state.commits, ['ç']);
});
test('selection while original key remains held consumes repeats until keyup', () => {
  const t = setup(); t.down('c'); t.tick(500); t.down('1');
  for (let i = 0; i < 50; i++) assert.equal(t.down('c', { repeat: true }), true);
  t.up('c'); t.up('1'); assert.equal(t.state.text, 'ç');
  t.down('c'); t.up('c'); assert.equal(t.state.text, 'çc');
});
test('releasing original key leaves picker open until choice/cancel', () => {
  const t = setup(); t.down('e'); t.tick(500); t.up('e'); t.tick(5000); assert.equal(t.engine.pickerOpen, true); assert.equal(t.state.text, '');
  t.down('2'); assert.equal(t.state.text, 'è');
});
test('letter keys, punctuation, paste shortcut and invalid numbers do not write while open', () => {
  const t = setup(); t.down('c'); t.tick(500); t.up('c');
  for (const k of ['a', 'b', '.', '9']) { assert.equal(t.down(k), true); t.up(k); }
  assert.equal(t.down('v', { ctrlKey: true }), true); t.up('v');
  assert.equal(t.state.text, ''); assert.equal(t.engine.blocksInput(), true); assert.equal(t.engine.pickerOpen, true);
});
test('digits remain consumed if they repeat after selection', () => {
  const t = setup(); t.down('e'); t.tick(500); t.up('e'); t.down('1');
  assert.equal(t.down('1', { repeat: true }), true); assert.equal(t.state.text, 'é'); t.up('1');
  assert.equal(t.down('1'), false);
});
test('letters pressed during popup do not leak if still held after selection', () => {
  const t = setup(); t.down('e'); t.tick(500); t.up('e'); t.down('x'); t.down('1');
  assert.equal(t.down('x', { repeat: true }), true); assert.equal(t.state.text, 'é'); t.up('x');
});
test('overlapping ordinary key presses retain c-a-f-e order', () => {
  const t = setup(); t.down('c'); t.tick(20); t.down('a'); t.up('c'); t.down('f'); t.up('a'); t.down('e'); t.up('f'); t.up('e');
  assert.equal(t.state.text, 'cafe'); assert.equal(t.state.shown, null);
});
test('space flushes pending letter before native space input', () => {
  const t = setup(); t.down('c'); assert.equal(t.down(' '), false); assert.equal(t.state.text, 'c'); t.up('c'); assert.equal(t.state.text, 'c');
});
test('shortcut flushes pending letter then remains available', () => {
  const t = setup(); t.down('c'); assert.equal(t.down('a', { ctrlKey: true }), false); assert.equal(t.state.text, 'c'); t.up('c');
});
test('Shift does not prematurely finish pending hold', () => {
  const t = setup(); t.down('C', { shiftKey: true }); assert.equal(t.down('Shift'), false); t.tick(500);
  assert.equal(t.state.shown.variants[0], 'Ç'); t.down('!', { code: 'Digit1', shiftKey: true }); assert.equal(t.state.text, 'Ç');
});
test('uppercase sharp S is ẞ, never SS', () => {
  const t = setup({ preset: 'german' }); t.down('S'); t.tick(500); t.up('S'); t.down('1'); assert.equal(t.state.text, 'ẞ');
});
test('numpad can choose a variant', () => {
  const t = setup({ preset: 'german' }); t.down('u'); t.tick(500); t.up('u'); t.down('1', { code: 'Numpad1' }); assert.equal(t.state.text, 'ü');
});
test('Escape keeps exactly one base by default and discards repeated hold', () => {
  const t = setup(); t.down('c'); t.tick(500); t.down('Escape'); t.down('c', { repeat: true }); t.up('c'); assert.equal(t.state.text, 'c');
});
test('Escape can cancel without writing, while 0 always keeps base', () => {
  const t = setup({ keepBaseOnCancel: false }); t.down('e'); t.tick(500); t.up('e'); t.down('Escape'); t.up('Escape'); assert.equal(t.state.text, '');
  t.down('e'); t.tick(500); t.up('e'); t.down('0'); assert.equal(t.state.text, 'e');
});
test('Backspace and Delete cancel without deleting existing text', () => {
  for (const k of ['Backspace', 'Delete']) { const t = setup({}, 'prior'); t.down('c'); t.tick(500); t.down(k); assert.equal(t.state.text, 'prior'); assert.equal(t.engine.active, false); }
});
test('selection replacement occurs only on choice and never destroys it on cancel', () => {
  const t = setup({}, 'hello world'); t.state.from = 6; t.state.to = 11;
  t.down('e'); t.tick(500); t.up('e'); assert.equal(t.state.text, 'hello world'); t.down('Backspace'); t.up('Backspace'); assert.equal(t.state.text, 'hello world');
  t.down('e'); t.tick(500); t.up('e'); t.down('1'); assert.equal(t.state.text, 'hello é');
});
test('Tab page uses 1–9 numbering anew; Shift+Tab cycles backward', () => {
  const t = setup(); t.down('a'); t.tick(500); t.up('a'); t.down('Tab'); t.up('Tab'); assert.equal(t.state.shown.selected, 9);
  t.down('Tab', { shiftKey: true }); t.up('Tab'); assert.equal(t.state.shown.selected, 0);
  t.down('Tab'); t.up('Tab'); t.down('1'); assert.equal(t.state.text, 'ą');
});
test('arrow navigation and Enter select the highlighted character', () => {
  const t = setup(); t.down('e'); t.tick(500); t.up('e'); t.down('ArrowRight'); t.up('ArrowRight'); t.down('Enter'); assert.equal(t.state.text, 'è');
});
test('page navigation and space confirmation are swallowed', () => {
  const t = setup(); t.down('o'); t.tick(500); t.up('o'); t.down('PageDown'); t.up('PageDown'); assert.equal(t.down(' '), true); assert.equal(t.state.text, 'ŏ');
});
test('slow event loop still recognizes long press at keyup', () => {
  const t = setup(); t.down('c'); t.tick(650, false); t.up('c'); assert.equal(t.engine.pickerOpen, true); assert.equal(t.state.text, '');
});
test('blur cancels picker and clears timers; returning repeat cannot restart it', () => {
  const t = setup(); t.down('c'); t.tick(500); t.engine.blur(); assert.equal(t.state.text, 'c');
  assert.equal(t.down('c', { repeat: true }), true); t.tick(900); assert.equal(t.engine.active, false); assert.equal(t.state.text, 'c');
});
test('blur while short-press pending does not lose ordinary typed letter', () => {
  const t = setup({ keepBaseOnCancel: false }); t.down('c'); t.tick(20); t.engine.blur(); assert.equal(t.state.text, 'c'); assert.equal(t.timers.size, 0);
});
test('outside pointer commits pending tap or applies popup cancellation policy', () => {
  const t = setup({ keepBaseOnCancel: false }); t.down('e'); t.engine.pointerCancel(); t.up('e'); assert.equal(t.state.text, 'e');
  t.down('e'); t.tick(500); t.engine.pointerCancel(); assert.equal(t.state.text, 'e'); assert.equal(t.state.locked, false);
});
test('external editing invalidates bookmark without stale insert', () => {
  const t = setup(); t.down('e'); t.tick(500); t.external('synced'); t.engine.choose(0); assert.equal(t.state.text, 'synced'); assert.equal(t.engine.active, false);
});
test('IME keyCode 229, composing and AltGr/dead keys bypass normal interception', () => {
  const t = setup();
  assert.equal(t.down('a', { keyCode: 229 }), false); assert.equal(t.down('a', { isComposing: true }), false);
  assert.equal(t.down('a', { ctrlKey: true, altKey: true }), false); assert.equal(t.down('Dead'), false); assert.equal(t.state.locked, false);
});
test('IME starts while pending without duplicate insertion', () => {
  const t = setup(); t.down('e'); t.engine.compositionStart(); assert.equal(t.state.text, ''); assert.equal(t.state.locked, false); assert.equal(t.timers.size, 0);
});
test('IME cannot unlock an already open picker', () => {
  const t = setup(); t.down('e'); t.tick(500); t.engine.compositionStart(); assert.equal(t.state.locked, true); assert.equal(t.engine.pickerOpen, true);
});
test('disabled setting, read-only target and unmapped letter keep native behavior', () => {
  const t = setup(); t.settings.enabled = false; assert.equal(t.down('c'), false); t.settings.enabled = true; t.state.enabled = false; assert.equal(t.down('c'), false);
  t.state.enabled = true; assert.equal(t.down('q'), false);
});
test('dispose removes timer and picker without any late insertion', () => {
  const t = setup(); t.down('c'); t.engine.dispose(); t.tick(9000); assert.equal(t.state.text, ''); assert.equal(t.state.shown, null); assert.equal(t.timers.size, 0);
});
test('all presets return distinct lowercase and uppercase candidates', () => {
  for (const preset of Object.keys(PRESETS)) for (const base of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const values = variantsFor(base, preset, {}); assert.equal(new Set(values).size, values.length); assert.equal(values.includes(base), false);
    for (const item of values) assert.match(item, /^\p{Script=Latin}\p{M}*$/u);
  }
  assert.deepEqual(variantsFor('I', 'turkish', {}), ['İ']);
});
test('custom lists override ordering, normalize Unicode, and disable individual keys', () => {
  const map = parseCustom('{"e":["è","é","é"],"s":[]}'); assert.deepEqual(variantsFor('e', 'common', map), ['è', 'é']); assert.deepEqual(variantsFor('s', 'common', map), []);
  for (const bad of ['[]', '{"A":["á"]}', '{"e":["hello"]}', '{"e":["<b>"]}', '{"e":["\u200b"]}', '{"__proto__":["á"]}']) assert.throws(() => parseCustom(bad));
});
test('settings recover safely from malformed saved data', () => {
  assert.equal(normalizeSettings({ delay: -10 }).delay, 200); assert.equal(normalizeSettings({ delay: Infinity }).delay, 500);
  assert.equal(normalizeSettings({ preset: 'constructor' }).preset, 'common'); assert.equal(normalizeSettings({ custom: 'invalid' }).custom, '');
});
