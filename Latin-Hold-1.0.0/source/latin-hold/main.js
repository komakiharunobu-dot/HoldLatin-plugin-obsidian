/* Latin Hold v1.0.0 | MIT | komaki | Built from src/main.ts */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LatinHoldPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/editor.ts
var import_state = require("@codemirror/state");
var import_view = require("@codemirror/view");

// src/engine.ts
var PAGE_SIZE = 9;
var physicalKey = (e) => e.code || `key:${e.key.toLowerCase()}`;
var isModifier = (key) => ["Shift", "Control", "Alt", "AltGraph", "Meta", "CapsLock"].includes(key);
var HoldEngine = class {
  constructor(host) {
    this.host = host;
    this.session = null;
    this.open = false;
    // Entries survive selection/cancellation until physical keyup. This also consumes
    // repeated digits and letters pressed while the picker was open.
    this.suppressed = /* @__PURE__ */ new Set();
  }
  get active() {
    return this.session !== null;
  }
  get pickerOpen() {
    return this.open;
  }
  keydown(e) {
    const code = physicalKey(e);
    if (this.suppressed.has(code)) return true;
    if (this.open && this.session) {
      if (!isModifier(e.key)) this.suppressed.add(code);
      if (e.key === "Escape") {
        this.cancel();
        return true;
      }
      if (e.ctrlKey || e.altKey || e.metaKey || isModifier(e.key) || e.isComposing || e.keyCode === 229) return true;
      const digit = /^Digit([0-9])$/.exec(e.code)?.[1] || /^Numpad([0-9])$/.exec(e.code)?.[1] || (/^[0-9]$/.test(e.key) ? e.key : null);
      if (digit !== null) {
        if (digit === "0") this.complete(this.session.base);
        else this.choose(Math.floor(this.session.selected / PAGE_SIZE) * PAGE_SIZE + Number(digit) - 1);
      } else if (e.key === "Escape") this.cancel();
      else if (e.key === "Backspace" || e.key === "Delete") this.complete(null);
      else if (e.key === "Enter" || e.key === " ") this.choose(this.session.selected);
      else if (e.key === "ArrowRight") this.move(1);
      else if (e.key === "ArrowLeft") this.move(-1);
      else if (e.key === "Tab") this.page(e.shiftKey ? -1 : 1);
      else if (e.key === "PageDown" || e.key === "ArrowDown") this.page(1);
      else if (e.key === "PageUp" || e.key === "ArrowUp") this.page(-1);
      else if (e.key === "Home") this.select(0);
      else if (e.key === "End") this.select(this.session.variants.length - 1);
      return true;
    }
    if (e.isComposing || e.keyCode === 229) {
      this.abort();
      return false;
    }
    if (this.session) {
      if (e.key === "Shift" || e.key === "CapsLock") return false;
      if (e.key === "Escape") {
        this.suppressed.add(code);
        this.cancel();
        return true;
      }
      this.complete(this.session.base);
    }
    const settings = this.host.settings();
    if (!settings.enabled || e.ctrlKey || e.altKey || e.metaKey || !/^[a-z]$/i.test(e.key)) return false;
    const variants = this.host.variants(e.key);
    if (!variants.length) return false;
    const bookmark = this.host.capture();
    if (bookmark === null) return false;
    this.suppressed.add(code);
    if (e.repeat) return true;
    this.session = { base: e.key, code, variants, bookmark, started: this.host.now(), delay: settings.delay, timer: null, selected: 0 };
    this.host.lock();
    const current = this.session;
    current.timer = this.host.later(() => {
      if (this.session === current) this.reveal();
    }, settings.delay);
    return true;
  }
  keyup(e) {
    const code = physicalKey(e);
    const consumed = this.suppressed.delete(code);
    if (this.session?.code === code && !this.open) {
      if (this.host.now() - this.session.started >= this.session.delay) this.reveal();
      else this.complete(this.session.base);
    }
    return consumed;
  }
  blocksKeypress(e) {
    return this.active || this.suppressed.has(physicalKey(e));
  }
  blocksInput() {
    return this.active;
  }
  choose(index) {
    if (this.open && this.session && index >= 0 && index < this.session.variants.length) this.complete(this.session.variants[index]);
  }
  cancel() {
    if (this.session) this.complete(this.host.settings().keepBaseOnCancel ? this.session.base : null);
  }
  pointerCancel() {
    if (this.open) this.cancel();
    else if (this.session) this.complete(this.session.base);
  }
  blur() {
    this.pointerCancel();
    this.suppressed.clear();
  }
  abort() {
    if (this.session) this.complete(null);
  }
  validate() {
    if (this.session && !this.host.valid(this.session.bookmark)) this.abort();
  }
  compositionStart() {
    if (!this.open) {
      this.abort();
      this.suppressed.clear();
    }
  }
  page(delta) {
    if (!this.session || !this.open) return;
    const count = Math.ceil(this.session.variants.length / PAGE_SIZE);
    const page = (Math.floor(this.session.selected / PAGE_SIZE) + delta + count) % count;
    this.select(page * PAGE_SIZE);
  }
  dispose() {
    if (this.session?.timer !== null && this.session?.timer !== void 0) this.host.clearTimer(this.session.timer);
    this.session = null;
    this.open = false;
    this.suppressed.clear();
    this.host.hide();
  }
  reveal() {
    if (!this.session || !this.host.valid(this.session.bookmark)) {
      this.abort();
      return;
    }
    if (this.session.timer !== null) this.host.clearTimer(this.session.timer);
    this.session.timer = null;
    this.open = true;
    this.render();
  }
  move(delta) {
    if (this.session) this.select((this.session.selected + delta + this.session.variants.length) % this.session.variants.length);
  }
  select(index) {
    if (this.session) {
      this.session.selected = index;
      this.render();
    }
  }
  render() {
    if (this.session && this.open) this.host.show({ base: this.session.base, variants: this.session.variants, selected: this.session.selected, keepBaseOnCancel: this.host.settings().keepBaseOnCancel });
  }
  complete(text) {
    const current = this.session;
    if (!current) return;
    if (current.timer !== null) this.host.clearTimer(current.timer);
    this.session = null;
    this.open = false;
    this.host.hide();
    this.host.release(text, current.bookmark);
  }
};

// src/picker.ts
var pickerId = 0;
var LetterPicker = class {
  constructor(editor, actions) {
    this.editor = editor;
    this.actions = actions;
    this.id = `latin-hold-${++pickerId}`;
    this.previousAttributes = /* @__PURE__ */ new Map();
    const doc = editor.ownerDocument;
    this.element = doc.createElement("div");
    this.element.className = "latin-hold-picker";
    this.element.setAttribute("role", "group");
    this.element.setAttribute("aria-label", "Latin Hold \u5B57\u6BCD\u53D8\u4F53");
    this.element.addEventListener("pointerdown", (event) => event.preventDefault());
    for (const name of ["aria-controls", "aria-expanded", "aria-activedescendant"]) this.previousAttributes.set(name, editor.getAttribute(name));
    editor.setAttribute("aria-controls", this.id);
    editor.setAttribute("aria-expanded", "true");
    doc.body.appendChild(this.element);
  }
  render(state) {
    const doc = this.element.ownerDocument;
    this.element.replaceChildren();
    const el = (tag, cls, text) => {
      const node = doc.createElement(tag);
      node.className = cls;
      if (text) node.textContent = text;
      return node;
    };
    const header = el("div", "latin-hold-header");
    const title = el("div", "latin-hold-title");
    title.append(el("span", "latin-hold-base", state.base), el("span", "latin-hold-title-text", "\u9009\u62E9\u5B57\u6BCD"));
    header.append(title, el("span", "latin-hold-status", "\u8F93\u5165\u5DF2\u6682\u505C"));
    const close = el("button", "latin-hold-close", "\xD7");
    close.type = "button";
    close.tabIndex = -1;
    close.setAttribute("aria-label", "\u53D6\u6D88\u9009\u62E9");
    close.title = "\u53D6\u6D88\uFF08Esc\uFF09";
    close.addEventListener("click", () => this.actions.cancel());
    header.append(close);
    this.element.append(header);
    const page = Math.floor(state.selected / PAGE_SIZE);
    const pages = Math.ceil(state.variants.length / PAGE_SIZE);
    const list = el("div", "latin-hold-options");
    list.id = this.id;
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", `${state.base} \u7684\u53D8\u4F53`);
    state.variants.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).forEach((letter, offset) => {
      const index = page * PAGE_SIZE + offset;
      const button = el("button", "latin-hold-option");
      button.type = "button";
      button.tabIndex = -1;
      button.id = `${this.id}-${index}`;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(index === state.selected));
      button.setAttribute("aria-label", `${offset + 1}\uFF1A${letter}`);
      button.title = `${letter} \xB7 \u6309 ${offset + 1}`;
      button.append(el("span", "latin-hold-glyph", letter), el("kbd", "latin-hold-number", String(offset + 1)));
      button.addEventListener("click", () => this.actions.choose(index));
      list.append(button);
    });
    this.element.append(list);
    const footer = el("div", "latin-hold-footer");
    footer.append(el("span", "latin-hold-hint", "1\u20139 \u9009\u62E9 \xB7 \u2190 \u2192 \u79FB\u52A8 \xB7 Enter \u786E\u8BA4"));
    if (pages > 1) {
      const pager = el("div", "latin-hold-pager");
      const prev = el("button", "latin-hold-page", "\u2039");
      const next = el("button", "latin-hold-page", "\u203A");
      for (const button of [prev, next]) {
        button.type = "button";
        button.tabIndex = -1;
      }
      prev.setAttribute("aria-label", "\u4E0A\u4E00\u9875");
      next.setAttribute("aria-label", "\u4E0B\u4E00\u9875");
      prev.addEventListener("click", () => this.actions.page(-1));
      next.addEventListener("click", () => this.actions.page(1));
      pager.append(prev, el("span", "latin-hold-page-count", `${page + 1} / ${pages}`), next);
      footer.append(pager);
    }
    this.element.append(footer, el("div", "latin-hold-subhint", `${pages > 1 ? "Tab \u7FFB\u9875 \xB7 " : ""}0 \u539F\u5B57\u6BCD \xB7 Esc ${state.keepBaseOnCancel ? "\u4FDD\u7559\u539F\u5B57\u6BCD" : "\u53D6\u6D88"} \xB7 Backspace \u653E\u5F03\u8F93\u5165`));
    const announce = el("div", "latin-hold-sr", `${state.variants[state.selected]}\uFF0C\u7B2C ${page + 1} \u9875\uFF0C\u5171 ${pages} \u9875\u3002\u6309\u6570\u5B57\u9009\u62E9\uFF0CEscape \u53D6\u6D88\u3002`);
    announce.setAttribute("role", "status");
    announce.setAttribute("aria-live", "polite");
    this.element.append(announce);
    this.editor.setAttribute("aria-activedescendant", `${this.id}-${state.selected}`);
  }
  position(rect) {
    const win = this.element.ownerDocument.defaultView;
    if (!win || !rect) return;
    const box = this.element.getBoundingClientRect();
    const margin = 10;
    const left = Math.max(margin, Math.min(rect.left, win.innerWidth - box.width - margin));
    const below = rect.bottom + 10;
    const top = below + box.height <= win.innerHeight - margin ? below : Math.max(margin, rect.top - box.height - 10);
    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
  }
  destroy() {
    this.element.remove();
    for (const [name, value] of this.previousAttributes) {
      if (value === null) this.editor.removeAttribute(name);
      else this.editor.setAttribute(name, value);
    }
  }
};

// src/variants.ts
var chars = (text) => [...text];
var map = (rows) => Object.fromEntries(Object.entries(rows).map(([key, value]) => [key, chars(value)]));
var COMMON = map({
  a: "\xE0\xE1\xE2\xE4\xE6\xE3\xE5\u0101\u0103\u0105\u01CE",
  b: "\u1E03\u1E05\u1E07",
  c: "\xE7\u0107\u010D\u0109\u010B",
  d: "\xF0\u010F\u0111\u1E0B\u1E0D",
  e: "\xE9\xE8\xEA\xEB\u0113\u0117\u0119\u011B\u0115\u1EBD",
  f: "\u1E1F",
  g: "\u011F\u0123\u011D\u0121\u01E7",
  h: "\u0125\u0127\u1E23\u1E25\u1E27",
  i: "\xED\xEC\xEE\xEF\u012B\u012F\u0131\u012D\u0129\u01D0",
  j: "\u0135\u01F0",
  k: "\u0137\u01E9\u1E31\u1E33",
  l: "\u0142\u013A\u013C\u013E\u1E37",
  m: "\u1E3F\u1E41\u1E43",
  n: "\xF1\u0144\u0148\u0146\u014B\u1E45\u1E47",
  o: "\xF4\xF6\xF3\xF2\u0153\xF5\xF8\u014D\u0151\u014F\u01D2",
  p: "\u1E55\u1E57",
  r: "\u0155\u0159\u0157\u1E59\u1E5B",
  s: "\xDF\u015B\u0161\u015F\u0219\u015D\u1E61\u1E63",
  t: "\xFE\u0165\u0163\u021B\u0167\u1E6B\u1E6D",
  u: "\xFC\xF9\xFA\xFB\u016B\u016F\u0171\u0169\u016D\u0173\u01D4",
  v: "\u1E7D\u1E7F",
  w: "\u0175\u1E81\u1E83\u1E85",
  x: "\u1E8B\u1E8D",
  y: "\xFF\xFD\u0177\u1EF3\u0233",
  z: "\u017A\u017C\u017E\u1E93"
});
var PRESETS = {
  common: { label: "\u5E38\u7528\u62C9\u4E01\u5B57\u6BCD\uFF08\u591A\u8BED\u8A00\uFF09", letters: COMMON },
  french: { label: "\u6CD5\u8BED Fran\xE7ais", letters: map({ a: "\xE0\xE2\xE6", c: "\xE7", e: "\xE9\xE8\xEA\xEB", i: "\xEE\xEF", o: "\xF4\u0153", u: "\xF9\xFB\xFC", y: "\xFF" }) },
  german: { label: "\u5FB7\u8BED Deutsch", letters: map({ a: "\xE4", o: "\xF6", u: "\xFC", s: "\xDF" }) },
  spanish: { label: "\u897F\u73ED\u7259\u8BED Espa\xF1ol", letters: map({ a: "\xE1", e: "\xE9", i: "\xED", n: "\xF1", o: "\xF3", u: "\xFA\xFC" }) },
  portuguese: { label: "\u8461\u8404\u7259\u8BED Portugu\xEAs", letters: map({ a: "\xE1\xE0\xE2\xE3", c: "\xE7", e: "\xE9\xEA", i: "\xED", o: "\xF3\xF4\xF5", u: "\xFA" }) },
  italian: { label: "\u610F\u5927\u5229\u8BED Italiano", letters: map({ a: "\xE0", e: "\xE8\xE9", i: "\xEC", o: "\xF2\xF3", u: "\xF9" }) },
  nordic: { label: "\u5317\u6B27\u8BED\u8A00 / \u51B0\u5C9B\u8BED", letters: map({ a: "\xE5\xE4\xE6\xE1", d: "\xF0", e: "\xE9", i: "\xED", o: "\xF6\xF8\xF3", t: "\xFE", u: "\xFA", y: "\xFD" }) },
  central: { label: "\u4E2D\u4E1C\u6B27\u5E38\u7528\uFF08\u6CE2 / \u6377 / \u5308 / \u7F57\u7B49\uFF09", letters: map({ a: "\u0105\xE1\u0103\xE2", c: "\u0107\u010D", d: "\u010F\u0111", e: "\u0119\xE9\u011B", i: "\xED\xEE", l: "\u0142\u013A\u013E", n: "\u0144\u0148", o: "\xF3\xF6\u0151", r: "\u0159\u0155", s: "\u015B\u0161\u0219\u015F", t: "\u0165\u021B\u0163", u: "\xFA\u016F\xFC\u0171", y: "\xFD", z: "\u017A\u017C\u017E" }) },
  turkish: { label: "\u571F\u8033\u5176\u8BED T\xFCrk\xE7e", letters: map({ c: "\xE7", g: "\u011F", i: "\u0131", o: "\xF6", s: "\u015F", u: "\xFC" }) }
};
function parseCustom(raw) {
  if (!raw.trim()) return {};
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new Error('JSON \u683C\u5F0F\u6709\u8BEF\u3002\u793A\u4F8B\uFF1A{"e":["\xE9","\xE8","\xEA","\xEB"]}');
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("\u8BF7\u586B\u5199\u4E00\u4E2A JSON \u5BF9\u8C61\u3002");
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (!/^[a-z]$/.test(key)) throw new Error(`\u952E\u540D\u300C${key}\u300D\u5FC5\u987B\u662F\u5355\u4E2A\u5C0F\u5199\u82F1\u6587\u5B57\u6BCD\u3002`);
    if (!Array.isArray(value) || value.length > 90) throw new Error(`\u300C${key}\u300D\u5E94\u662F\u6700\u591A 90 \u4E2A\u5019\u9009\u7684\u6570\u7EC4\u3002`);
    output[key] = [];
    for (const item of value) {
      if (typeof item !== "string" || !/^\p{Script=Latin}\p{M}*$/u.test(item)) {
        throw new Error(`\u300C${key}\u300D\u7684\u6BCF\u4E2A\u5019\u9009\u5FC5\u987B\u662F\u4E00\u4E2A\u62C9\u4E01\u5B57\u6BCD\uFF08\u53EF\u5E26\u7EC4\u5408\u53D8\u97F3\u7B26\u53F7\uFF09\u3002`);
      }
      const normalized = item.normalize("NFC");
      if (!output[key].includes(normalized)) output[key].push(normalized);
    }
  }
  return output;
}
function variantsFor(base, preset, custom) {
  if (!/^[a-z]$/i.test(base)) return [];
  const lower = base.toLowerCase();
  const hasCustom = Object.prototype.hasOwnProperty.call(custom, lower);
  const source = Object.prototype.hasOwnProperty.call(PRESETS, preset) ? PRESETS[preset] : PRESETS.common;
  let values = [...hasCustom ? custom[lower] : source.letters[lower] || []];
  if (base === base.toUpperCase()) {
    values = values.map((char) => char === "\xDF" ? "\u1E9E" : char.toUpperCase().normalize("NFC"));
    if (lower === "i" && !hasCustom && (preset === "turkish" || preset === "common")) values.unshift("\u0130");
  }
  return [...new Set(values)].filter((char) => char !== base);
}

// src/editor.ts
var setLocked = import_state.StateEffect.define();
var authorizedInput = import_state.Annotation.define();
var locked = import_state.StateField.define({
  create: () => false,
  update(value, transaction) {
    for (const effect of transaction.effects) if (effect.is(setLocked)) value = effect.value;
    return value;
  }
});
var EditorController = class {
  constructor(view, config) {
    this.view = view;
    this.config = config;
    this.picker = null;
    this.disposed = false;
    this.updating = false;
    this.composing = false;
    this.frame = null;
    this.removers = [];
    this.win = view.dom.ownerDocument.defaultView;
    this.engine = new HoldEngine({
      settings: config.settings,
      variants: (base) => variantsFor(base, config.settings().preset, config.custom()),
      capture: () => this.writable() && this.view.hasFocus ? { doc: view.state.doc, selection: view.state.selection } : null,
      valid: (bookmark) => this.valid(bookmark),
      lock: () => this.view.dispatch({ effects: setLocked.of(true) }),
      release: (text, bookmark) => this.release(text, bookmark),
      show: (state) => {
        if (!this.picker) this.picker = new LetterPicker(view.contentDOM, {
          choose: (index) => this.engine.choose(index),
          page: (delta) => this.engine.page(delta),
          cancel: () => this.engine.cancel()
        });
        this.picker.render(state);
        this.reposition();
      },
      hide: () => {
        this.picker?.destroy();
        this.picker = null;
      },
      now: () => this.win.performance.now(),
      later: (callback, ms) => this.win.setTimeout(callback, ms),
      clearTimer: (id) => this.win.clearTimeout(id)
    });
    config.controllers.add(this);
    this.listen(this.win, "keydown", (raw) => {
      const event = raw;
      if (!this.inEditor(event) || event.defaultPrevented && !this.engine.active) return;
      if ((this.composing || view.composing) && !this.engine.pickerOpen) return;
      if (this.engine.keydown(event)) this.block(event);
    });
    this.listen(this.win, "keyup", (raw) => {
      const event = raw;
      if (this.engine.keyup(event) && this.inEditor(event)) this.block(event);
    });
    this.listen(this.win, "keypress", (raw) => {
      const event = raw;
      if (this.inEditor(event) && this.engine.blocksKeypress(event)) this.block(event);
    });
    this.listen(view.contentDOM, "beforeinput", (event) => {
      if (this.inEditor(event) && this.engine.blocksInput()) this.block(event);
    });
    for (const type of ["paste", "cut", "drop"]) {
      this.listen(view.contentDOM, type, (event) => {
        if (!this.engine.active) return;
        if (this.engine.pickerOpen) this.block(event);
        else this.engine.pointerCancel();
      });
    }
    this.listen(view.contentDOM, "compositionstart", () => {
      this.composing = true;
      this.engine.compositionStart();
    });
    this.listen(view.contentDOM, "compositionend", () => {
      this.composing = false;
    });
    this.listen(view.dom.ownerDocument, "pointerdown", (event) => {
      if (this.picker && event.composedPath().includes(this.picker.element)) return;
      this.engine.pointerCancel();
    });
    this.listen(view.contentDOM, "blur", () => this.engine.blur());
    this.listen(this.win, "blur", () => {
      this.composing = false;
      this.engine.blur();
    });
    this.listen(view.dom.ownerDocument, "visibilitychange", () => {
      if (view.dom.ownerDocument.visibilityState === "hidden") {
        this.composing = false;
        this.engine.blur();
      }
    });
    this.listen(this.win, "resize", () => this.requestPosition());
    this.listen(view.dom.ownerDocument, "scroll", () => this.requestPosition());
  }
  update(update) {
    this.updating = true;
    try {
      if (update.docChanged || update.selectionSet || !this.writable()) this.engine.validate();
      if (update.geometryChanged || update.viewportChanged) this.requestPosition();
    } finally {
      this.updating = false;
    }
  }
  destroy() {
    this.disposed = true;
    this.engine.dispose();
    if (this.frame !== null) this.win.cancelAnimationFrame(this.frame);
    for (const remove of this.removers) remove();
    this.config.controllers.delete(this);
  }
  writable() {
    return !this.disposed && !this.view.state.readOnly && this.view.state.facet(import_view.EditorView.editable) && this.view.contentDOM.getAttribute("contenteditable") !== "false";
  }
  valid(bookmark) {
    return this.writable() && this.view.state.doc === bookmark.doc && this.view.state.selection.eq(bookmark.selection);
  }
  release(text, bookmark) {
    if (this.disposed) return;
    if (this.updating) {
      this.win.queueMicrotask(() => {
        if (!this.disposed && !this.engine.active && this.view.state.field(locked, false)) this.view.dispatch({ effects: setLocked.of(false) });
      });
      return;
    }
    const insert = text !== null && this.valid(bookmark);
    this.view.dispatch({
      ...insert ? this.view.state.replaceSelection(text) : {},
      effects: setLocked.of(false),
      annotations: insert ? [authorizedInput.of(true), import_state.Transaction.userEvent.of("input.type")] : [],
      scrollIntoView: insert
    });
  }
  inEditor(event) {
    const path = event.composedPath();
    if (!path.includes(this.view.contentDOM)) return false;
    for (const node of path) {
      if (node === this.view.contentDOM) break;
      const element = node;
      if (typeof element?.matches === "function" && element.matches('input, textarea, select, [contenteditable="false"]')) return false;
    }
    return true;
  }
  block(event) {
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
  }
  listen(target, type, listener) {
    target.addEventListener(type, listener, true);
    this.removers.push(() => target.removeEventListener(type, listener, true));
  }
  requestPosition() {
    if (!this.picker || this.frame !== null) return;
    this.frame = this.win.requestAnimationFrame(() => {
      this.frame = null;
      this.reposition();
    });
  }
  reposition() {
    if (!this.picker || this.disposed) return;
    const coords = this.view.coordsAtPos(this.view.state.selection.main.head);
    this.picker.position(coords || this.view.contentDOM.getBoundingClientRect());
  }
};
function createHoldExtension(config) {
  return [
    locked,
    // beforeinput is not cancelable on every IME/browser path. This extra gate
    // rejects editor input transactions while waiting, without blocking sync edits.
    import_state.EditorState.transactionFilter.of((transaction) => {
      if (transaction.startState.field(locked) && transaction.docChanged && !transaction.annotation(authorizedInput) && ["input", "delete", "move.drop"].some((event) => transaction.isUserEvent(event))) return [];
      return transaction;
    }),
    import_view.ViewPlugin.fromClass(class {
      constructor(view) {
        this.controller = new EditorController(view, config);
      }
      update(update) {
        this.controller.update(update);
      }
      destroy() {
        this.controller.destroy();
      }
    })
  ];
}

// src/settings.ts
var DEFAULT_SETTINGS = {
  enabled: true,
  delay: 500,
  preset: "common",
  keepBaseOnCancel: true,
  custom: ""
};
function normalizeSettings(input) {
  const data = input && typeof input === "object" ? input : {};
  let custom = typeof data.custom === "string" ? data.custom : "";
  try {
    parseCustom(custom);
  } catch {
    custom = "";
  }
  return {
    enabled: typeof data.enabled === "boolean" ? data.enabled : true,
    delay: typeof data.delay === "number" && Number.isFinite(data.delay) ? Math.max(200, Math.min(1500, Math.round(data.delay))) : 500,
    preset: typeof data.preset === "string" && Object.prototype.hasOwnProperty.call(PRESETS, data.preset) ? data.preset : "common",
    keepBaseOnCancel: typeof data.keepBaseOnCancel === "boolean" ? data.keepBaseOnCancel : true,
    custom
  };
}

// src/main.ts
var LatinHoldPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    this.custom = {};
    this.controllers = /* @__PURE__ */ new Set();
  }
  async onload() {
    this.settings = normalizeSettings(await this.loadData());
    this.custom = parseCustom(this.settings.custom);
    this.registerEditorExtension(createHoldExtension({ settings: () => this.settings, custom: () => this.custom, controllers: this.controllers }));
    this.addSettingTab(new LatinHoldSettingTab(this));
    this.addCommand({
      id: "toggle-long-press",
      name: "\u542F\u7528 / \u6682\u505C\u957F\u6309\u9009\u5B57",
      callback: async () => {
        await this.updateSettings({ enabled: !this.settings.enabled });
        new import_obsidian.Notice(`Latin Hold\uFF1A${this.settings.enabled ? "\u5DF2\u542F\u7528" : "\u5DF2\u6682\u505C"}`);
      }
    });
  }
  onunload() {
    for (const controller of [...this.controllers]) controller.destroy();
  }
  async updateSettings(patch) {
    for (const controller of this.controllers) controller.engine.pointerCancel();
    this.settings = normalizeSettings({ ...this.settings, ...patch });
    this.custom = parseCustom(this.settings.custom);
    await this.saveData(this.settings);
  }
};
var LatinHoldSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Latin Hold \xB7 \u957F\u6309\u9009\u5B57" });
    containerEl.createEl("p", { cls: "latin-hold-settings-intro", text: "\u6309\u4F4F\u82F1\u6587\u5B57\u6BCD\u7EA6\u534A\u79D2\uFF0C\u7528 1\u20139 \u9009\u62E9\u53D8\u4F53\u3002\u9009\u5B57\u6846\u51FA\u73B0\u540E\u6682\u505C\u6B63\u6587\u8F93\u5165\uFF0C\u76F4\u5230\u9009\u62E9\u6216\u53D6\u6D88\u3002" });
    new import_obsidian.Setting(containerEl).setName("\u542F\u7528\u957F\u6309\u9009\u5B57").setDesc("\u4EC5\u5728\u684C\u9762\u7248\u7B14\u8BB0\u6B63\u6587\u7F16\u8F91\u5668\u751F\u6548\u3002\u4E5F\u53EF\u4EE5\u5728\u547D\u4EE4\u9762\u677F\u4E2D\u5FEB\u901F\u6682\u505C\u3002").addToggle((toggle) => toggle.setValue(this.plugin.settings.enabled).onChange((value) => this.plugin.updateSettings({ enabled: value })));
    new import_obsidian.Setting(containerEl).setName("\u957F\u6309\u89E6\u53D1\u65F6\u95F4").setDesc("\u9ED8\u8BA4 500 \u6BEB\u79D2\uFF1B\u77ED\u6309\u5728\u677E\u5F00\u6309\u952E\u65F6\u8F93\u5165\uFF0C\u4E0D\u9700\u8981\u7B49\u6EE1\u8FD9\u4E2A\u65F6\u95F4\u3002").addSlider((slider) => slider.setLimits(200, 1500, 50).setValue(this.plugin.settings.delay).setDynamicTooltip().onChange((value) => this.plugin.updateSettings({ delay: value })));
    new import_obsidian.Setting(containerEl).setName("\u5B57\u6BCD\u5019\u9009\u8303\u56F4").setDesc("\u591A\u8BED\u8A00\u6A21\u5F0F\u5305\u542B\u5E38\u89C1\u6B27\u6D32\u8BED\u8A00\u53CA\u90E8\u5206\u5B66\u672F\u8F6C\u5199\u53D8\u97F3\u5B57\u6BCD\u3002\u9009\u62E9\u5355\u4E00\u8BED\u8A00\u53EF\u4EE5\u7F29\u77ED\u5217\u8868\u3002").addDropdown((dropdown) => {
      for (const [id, preset] of Object.entries(PRESETS)) dropdown.addOption(id, preset.label);
      dropdown.setValue(this.plugin.settings.preset).onChange((value) => this.plugin.updateSettings({ preset: value }));
    });
    new import_obsidian.Setting(containerEl).setName("\u53D6\u6D88\u65F6\u4FDD\u7559\u539F\u5B57\u6BCD").setDesc("Esc\u3001\u5173\u95ED\u6309\u94AE\u6216\u70B9\u51FB\u5916\u90E8\u65F6\u751F\u6548\u3002Backspace / Delete \u59CB\u7EC8\u653E\u5F03\u672C\u6B21\u8F93\u5165\uFF1B0 \u59CB\u7EC8\u8F93\u5165\u539F\u5B57\u6BCD\u3002").addToggle((toggle) => toggle.setValue(this.plugin.settings.keepBaseOnCancel).onChange((value) => this.plugin.updateSettings({ keepBaseOnCancel: value })));
    containerEl.createEl("h3", { text: "\u81EA\u5B9A\u4E49\u5019\u9009\u4E0E\u987A\u5E8F" });
    containerEl.createEl("p", { text: "\u4E0B\u65B9 JSON \u4F1A\u8986\u76D6\u5BF9\u5E94\u5B57\u6BCD\u7684\u5019\u9009\uFF0C\u5176\u4ED6\u5B57\u6BCD\u4FDD\u7559\u5F53\u524D\u9884\u8BBE\u3002\u952E\u540D\u4F7F\u7528 a\u2013z\uFF1B\u7A7A\u6570\u7EC4\u53EF\u5173\u95ED\u8BE5\u5B57\u6BCD\u7684\u957F\u6309\u3002\u5927\u5199\u5019\u9009\u81EA\u52A8\u8F6C\u6362\u3002" });
    const textarea = containerEl.createEl("textarea", { cls: "latin-hold-custom", attr: { "aria-label": "\u81EA\u5B9A\u4E49\u5B57\u6BCD\u5019\u9009", spellcheck: "false", rows: "6", placeholder: '{"e":["\xE9","\xE8","\xEA","\xEB"],"s":["\xDF"],"q":[]}' } });
    textarea.value = this.plugin.settings.custom;
    const error = containerEl.createEl("p", { cls: "latin-hold-error", attr: { role: "status" } });
    new import_obsidian.Setting(containerEl).addButton((button) => button.setButtonText("\u4FDD\u5B58\u81EA\u5B9A\u4E49\u5019\u9009").setCta().onClick(async () => {
      try {
        parseCustom(textarea.value);
        await this.plugin.updateSettings({ custom: textarea.value.trim() });
        error.textContent = "";
        new import_obsidian.Notice("Latin Hold\uFF1A\u81EA\u5B9A\u4E49\u5019\u9009\u5DF2\u4FDD\u5B58");
      } catch (problem) {
        error.textContent = problem instanceof Error ? problem.message : String(problem);
      }
    })).addButton((button) => button.setButtonText("\u6E05\u9664\u81EA\u5B9A\u4E49").onClick(async () => {
      textarea.value = "";
      error.textContent = "";
      await this.plugin.updateSettings({ custom: "" });
    }));
    containerEl.createEl("h3", { text: "\u5FEB\u6377\u952E" });
    const list = containerEl.createEl("ul");
    for (const line of [
      "1\u20139\uFF1A\u9009\u62E9\u5F53\u524D\u9875\u5BF9\u5E94\u5B57\u6BCD\uFF08\u4E5F\u652F\u6301\u5C0F\u952E\u76D8\u6570\u5B57\uFF09\u3002",
      "Tab / Shift+Tab\uFF1A\u4E0B\u4E00\u9875 / \u4E0A\u4E00\u9875\uFF1B\u2190 / \u2192\uFF1A\u79FB\u52A8\u9009\u62E9\u3002",
      "Enter / \u7A7A\u683C\uFF1A\u63D2\u5165\u5F53\u524D\u9AD8\u4EAE\u5B57\u6BCD\uFF1B0\uFF1A\u8F93\u5165\u539F\u5B57\u6BCD\u3002",
      "Esc\uFF1A\u53D6\u6D88\uFF1BBackspace / Delete\uFF1A\u53D6\u6D88\u4E14\u4E0D\u5199\u5165\u5B57\u6BCD\u3002",
      "\u6309\u4F4F Shift + \u5B57\u6BCD\uFF0C\u6216\u5F00\u542F Caps Lock\uFF0C\u53EF\u9009\u62E9\u5927\u5199\u53D8\u4F53\u3002"
    ]) list.createEl("li", { text: line });
    containerEl.createEl("p", { cls: "latin-hold-settings-intro", text: "\u8BF7\u4F7F\u7528\u82F1\u6587\u8F93\u5165\u72B6\u6001\u3002\u4E2D\u6587\u3001\u65E5\u6587\u7B49\u8F93\u5165\u6CD5\u7684\u7EC4\u5B57\u8FC7\u7A0B\u4EA4\u7ED9\u8F93\u5165\u6CD5\u5904\u7406\u3002\u672C\u63D2\u4EF6\u4E0D\u9762\u5411\u624B\u673A\u8F6F\u952E\u76D8\u6216 Vim \u6A21\u5F0F\u3002" });
  }
};
