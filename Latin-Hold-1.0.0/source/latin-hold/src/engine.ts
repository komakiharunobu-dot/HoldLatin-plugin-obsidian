import type { HoldSettings } from './settings';

export const PAGE_SIZE = 9;
export interface KeyStroke {
  key: string; code: string; repeat?: boolean;
  ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean; shiftKey?: boolean;
  isComposing?: boolean; keyCode?: number;
}
export interface PickerState { base: string; variants: string[]; selected: number; keepBaseOnCancel: boolean }
export interface HoldHost<T> {
  settings(): HoldSettings;
  variants(base: string): string[];
  capture(): T | null;
  valid(bookmark: T): boolean;
  lock(): void;
  release(text: string | null, bookmark: T): void;
  show(state: PickerState): void;
  hide(): void;
  now(): number;
  later(callback: () => void, ms: number): number;
  clearTimer(id: number): void;
}
interface Session<T> {
  base: string; code: string; variants: string[]; bookmark: T;
  started: number; delay: number; timer: number | null; selected: number;
}
const physicalKey = (e: KeyStroke): string => e.code || `key:${e.key.toLowerCase()}`;
const isModifier = (key: string): boolean => ['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock'].includes(key);

/** Holds input before it reaches the editor. No inserted-character deletion heuristics. */
export class HoldEngine<T> {
  private session: Session<T> | null = null;
  private open = false;
  // Entries survive selection/cancellation until physical keyup. This also consumes
  // repeated digits and letters pressed while the picker was open.
  private suppressed = new Set<string>();
  constructor(private readonly host: HoldHost<T>) {}
  get active(): boolean { return this.session !== null; }
  get pickerOpen(): boolean { return this.open; }

  keydown(e: KeyStroke): boolean {
    const code = physicalKey(e);
    if (this.suppressed.has(code)) return true;

    if (this.open && this.session) {
      if (!isModifier(e.key)) this.suppressed.add(code);
      if (e.key === 'Escape') { this.cancel(); return true; }
      if (e.ctrlKey || e.altKey || e.metaKey || isModifier(e.key) || e.isComposing || e.keyCode === 229) return true;
      const digit = /^Digit([0-9])$/.exec(e.code)?.[1] || /^Numpad([0-9])$/.exec(e.code)?.[1] || (/^[0-9]$/.test(e.key) ? e.key : null);
      if (digit !== null) {
        if (digit === '0') this.complete(this.session.base);
        else this.choose(Math.floor(this.session.selected / PAGE_SIZE) * PAGE_SIZE + Number(digit) - 1);
      } else if (e.key === 'Escape') this.cancel();
      else if (e.key === 'Backspace' || e.key === 'Delete') this.complete(null);
      else if (e.key === 'Enter' || e.key === ' ') this.choose(this.session.selected);
      else if (e.key === 'ArrowRight') this.move(1);
      else if (e.key === 'ArrowLeft') this.move(-1);
      else if (e.key === 'Tab') this.page(e.shiftKey ? -1 : 1);
      else if (e.key === 'PageDown' || e.key === 'ArrowDown') this.page(1);
      else if (e.key === 'PageUp' || e.key === 'ArrowUp') this.page(-1);
      else if (e.key === 'Home') this.select(0);
      else if (e.key === 'End') this.select(this.session.variants.length - 1);
      return true;
    }

    if (e.isComposing || e.keyCode === 229) {
      this.abort();
      return false;
    }
    if (this.session) {
      if (e.key === 'Shift' || e.key === 'CapsLock') return false;
      if (e.key === 'Escape') {
        this.suppressed.add(code);
        this.cancel();
        return true;
      }
      // Preserve typing order when fingers overlap, or before a native shortcut.
      this.complete(this.session.base);
    }
    const settings = this.host.settings();
    if (!settings.enabled || e.ctrlKey || e.altKey || e.metaKey || !/^[a-z]$/i.test(e.key)) return false;
    const variants = this.host.variants(e.key);
    if (!variants.length) return false;
    const bookmark = this.host.capture();
    if (bookmark === null) return false;
    this.suppressed.add(code);
    // A repeat arriving after window focus returned must not start a new session.
    if (e.repeat) return true;
    this.session = { base: e.key, code, variants, bookmark, started: this.host.now(), delay: settings.delay, timer: null, selected: 0 };
    this.host.lock();
    const current = this.session;
    current.timer = this.host.later(() => { if (this.session === current) this.reveal(); }, settings.delay);
    return true;
  }

  keyup(e: KeyStroke): boolean {
    const code = physicalKey(e);
    const consumed = this.suppressed.delete(code);
    if (this.session?.code === code && !this.open) {
      if (this.host.now() - this.session.started >= this.session.delay) this.reveal();
      else this.complete(this.session.base);
    }
    return consumed;
  }

  blocksKeypress(e: KeyStroke): boolean { return this.active || this.suppressed.has(physicalKey(e)); }
  blocksInput(): boolean { return this.active; }
  choose(index: number): void {
    if (this.open && this.session && index >= 0 && index < this.session.variants.length) this.complete(this.session.variants[index]);
  }
  cancel(): void {
    if (this.session) this.complete(this.host.settings().keepBaseOnCancel ? this.session.base : null);
  }
  pointerCancel(): void {
    if (this.open) this.cancel();
    else if (this.session) this.complete(this.session.base);
  }
  blur(): void { this.pointerCancel(); this.suppressed.clear(); }
  abort(): void { if (this.session) this.complete(null); }
  validate(): void { if (this.session && !this.host.valid(this.session.bookmark)) this.abort(); }
  compositionStart(): void {
    // IME starts normally when there is no open picker. An already open picker
    // remains locked until explicit selection/cancellation.
    if (!this.open) { this.abort(); this.suppressed.clear(); }
  }
  page(delta: number): void {
    if (!this.session || !this.open) return;
    const count = Math.ceil(this.session.variants.length / PAGE_SIZE);
    const page = (Math.floor(this.session.selected / PAGE_SIZE) + delta + count) % count;
    this.select(page * PAGE_SIZE);
  }
  dispose(): void {
    if (this.session?.timer !== null && this.session?.timer !== undefined) this.host.clearTimer(this.session.timer);
    this.session = null;
    this.open = false;
    this.suppressed.clear();
    this.host.hide();
  }
  private reveal(): void {
    if (!this.session || !this.host.valid(this.session.bookmark)) { this.abort(); return; }
    if (this.session.timer !== null) this.host.clearTimer(this.session.timer);
    this.session.timer = null;
    this.open = true;
    this.render();
  }
  private move(delta: number): void {
    if (this.session) this.select((this.session.selected + delta + this.session.variants.length) % this.session.variants.length);
  }
  private select(index: number): void { if (this.session) { this.session.selected = index; this.render(); } }
  private render(): void {
    if (this.session && this.open) this.host.show({ base: this.session.base, variants: this.session.variants, selected: this.session.selected, keepBaseOnCancel: this.host.settings().keepBaseOnCancel });
  }
  private complete(text: string | null): void {
    const current = this.session;
    if (!current) return;
    if (current.timer !== null) this.host.clearTimer(current.timer);
    this.session = null;
    this.open = false;
    this.host.hide();
    this.host.release(text, current.bookmark);
  }
}
