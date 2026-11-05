import { Annotation, EditorSelection, EditorState, StateEffect, StateField, Transaction, type Extension, type Text } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { HoldEngine } from './engine';
import { LetterPicker } from './picker';
import type { HoldSettings } from './settings';
import type { VariantMap } from './variants';
import { variantsFor } from './variants';

const setLocked = StateEffect.define<boolean>();
const authorizedInput = Annotation.define<boolean>();
const locked = StateField.define<boolean>({
  create: () => false,
  update(value, transaction) {
    for (const effect of transaction.effects) if (effect.is(setLocked)) value = effect.value;
    return value;
  }
});

interface Bookmark { doc: Text; selection: EditorSelection }
export interface EditorConfiguration {
  settings(): HoldSettings;
  custom(): VariantMap;
  controllers: Set<EditorController>;
}

export class EditorController {
  readonly engine: HoldEngine<Bookmark>;
  private picker: LetterPicker | null = null;
  private disposed = false;
  private updating = false;
  private composing = false;
  private frame: number | null = null;
  private readonly removers: Array<() => void> = [];
  private readonly win: Window;

  constructor(readonly view: EditorView, private readonly config: EditorConfiguration) {
    this.win = view.dom.ownerDocument.defaultView!;
    this.engine = new HoldEngine<Bookmark>({
      settings: config.settings,
      variants: base => variantsFor(base, config.settings().preset, config.custom()),
      capture: () => this.writable() && this.view.hasFocus ? { doc: view.state.doc, selection: view.state.selection } : null,
      valid: bookmark => this.valid(bookmark),
      lock: () => this.view.dispatch({ effects: setLocked.of(true) }),
      release: (text, bookmark) => this.release(text, bookmark),
      show: state => {
        if (!this.picker) this.picker = new LetterPicker(view.contentDOM, {
          choose: index => this.engine.choose(index), page: delta => this.engine.page(delta), cancel: () => this.engine.cancel()
        });
        this.picker.render(state);
        this.reposition();
      },
      hide: () => { this.picker?.destroy(); this.picker = null; },
      now: () => this.win.performance.now(),
      later: (callback, ms) => this.win.setTimeout(callback, ms),
      clearTimer: id => this.win.clearTimeout(id)
    });
    config.controllers.add(this);
    this.listen(this.win, 'keydown', raw => {
      const event = raw as KeyboardEvent;
      if (!this.inEditor(event) || (event.defaultPrevented && !this.engine.active)) return;
      if ((this.composing || view.composing) && !this.engine.pickerOpen) return;
      if (this.engine.keydown(event)) this.block(event);
    });
    this.listen(this.win, 'keyup', raw => {
      const event = raw as KeyboardEvent;
      // Always clear held keys, including a release that occurred outside the editor.
      if (this.engine.keyup(event) && this.inEditor(event)) this.block(event);
    });
    this.listen(this.win, 'keypress', raw => {
      const event = raw as KeyboardEvent;
      if (this.inEditor(event) && this.engine.blocksKeypress(event)) this.block(event);
    });
    this.listen(view.contentDOM, 'beforeinput', event => {
      if (this.inEditor(event) && this.engine.blocksInput()) this.block(event);
    });
    for (const type of ['paste', 'cut', 'drop']) {
      this.listen(view.contentDOM, type, event => {
        if (!this.engine.active) return;
        if (this.engine.pickerOpen) this.block(event);
        else this.engine.pointerCancel();
      });
    }
    this.listen(view.contentDOM, 'compositionstart', () => { this.composing = true; this.engine.compositionStart(); });
    this.listen(view.contentDOM, 'compositionend', () => { this.composing = false; });
    this.listen(view.dom.ownerDocument, 'pointerdown', event => {
      if (this.picker && event.composedPath().includes(this.picker.element)) return;
      this.engine.pointerCancel();
    });
    this.listen(view.contentDOM, 'blur', () => this.engine.blur());
    this.listen(this.win, 'blur', () => { this.composing = false; this.engine.blur(); });
    this.listen(view.dom.ownerDocument, 'visibilitychange', () => {
      if (view.dom.ownerDocument.visibilityState === 'hidden') { this.composing = false; this.engine.blur(); }
    });
    this.listen(this.win, 'resize', () => this.requestPosition());
    this.listen(view.dom.ownerDocument, 'scroll', () => this.requestPosition());
  }
  update(update: ViewUpdate): void {
    this.updating = true;
    try {
      if (update.docChanged || update.selectionSet || !this.writable()) this.engine.validate();
      if (update.geometryChanged || update.viewportChanged) this.requestPosition();
    } finally { this.updating = false; }
  }
  destroy(): void {
    this.disposed = true;
    this.engine.dispose();
    if (this.frame !== null) this.win.cancelAnimationFrame(this.frame);
    for (const remove of this.removers) remove();
    this.config.controllers.delete(this);
  }
  private writable(): boolean {
    return !this.disposed && !this.view.state.readOnly && this.view.state.facet(EditorView.editable) && this.view.contentDOM.getAttribute('contenteditable') !== 'false';
  }
  private valid(bookmark: Bookmark): boolean {
    return this.writable() && this.view.state.doc === bookmark.doc && this.view.state.selection.eq(bookmark.selection);
  }
  private release(text: string | null, bookmark: Bookmark): void {
    if (this.disposed) return;
    if (this.updating) {
      // External document/selection changes invalidate the bookmark. Never dispatch
      // recursively from ViewPlugin.update or insert at a stale location.
      this.win.queueMicrotask(() => {
        if (!this.disposed && !this.engine.active && this.view.state.field(locked, false)) this.view.dispatch({ effects: setLocked.of(false) });
      });
      return;
    }
    const insert = text !== null && this.valid(bookmark);
    this.view.dispatch({
      ...(insert ? this.view.state.replaceSelection(text) : {}),
      effects: setLocked.of(false),
      annotations: insert ? [authorizedInput.of(true), Transaction.userEvent.of('input.type')] : [],
      scrollIntoView: insert
    });
  }
  private inEditor(event: Event): boolean {
    const path = event.composedPath();
    if (!path.includes(this.view.contentDOM)) return false;
    // Embedded form fields and plugin widgets keep their own keyboard behavior.
    for (const node of path) {
      if (node === this.view.contentDOM) break;
      const element = node as HTMLElement;
      if (typeof element?.matches === 'function' && element.matches('input, textarea, select, [contenteditable="false"]')) return false;
    }
    return true;
  }
  private block(event: Event): void { if (event.cancelable) event.preventDefault(); event.stopImmediatePropagation(); }
  private listen(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener, true);
    this.removers.push(() => target.removeEventListener(type, listener, true));
  }
  private requestPosition(): void {
    if (!this.picker || this.frame !== null) return;
    this.frame = this.win.requestAnimationFrame(() => { this.frame = null; this.reposition(); });
  }
  private reposition(): void {
    if (!this.picker || this.disposed) return;
    const coords = this.view.coordsAtPos(this.view.state.selection.main.head);
    this.picker.position(coords || this.view.contentDOM.getBoundingClientRect());
  }
}

export function createHoldExtension(config: EditorConfiguration): Extension {
  return [
    locked,
    // beforeinput is not cancelable on every IME/browser path. This extra gate
    // rejects editor input transactions while waiting, without blocking sync edits.
    EditorState.transactionFilter.of(transaction => {
      if (transaction.startState.field(locked) && transaction.docChanged && !transaction.annotation(authorizedInput)
        && ['input', 'delete', 'move.drop'].some(event => transaction.isUserEvent(event))) return [];
      return transaction;
    }),
    ViewPlugin.fromClass(class {
      readonly controller: EditorController;
      constructor(view: EditorView) { this.controller = new EditorController(view, config); }
      update(update: ViewUpdate): void { this.controller.update(update); }
      destroy(): void { this.controller.destroy(); }
    })
  ];
}
