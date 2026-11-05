import { PAGE_SIZE, type PickerState } from './engine';

let pickerId = 0;
interface PickerActions { choose(index: number): void; page(delta: number): void; cancel(): void }

export class LetterPicker {
  readonly element: HTMLDivElement;
  private readonly id = `latin-hold-${++pickerId}`;
  private readonly previousAttributes = new Map<string, string | null>();
  constructor(private readonly editor: HTMLElement, private readonly actions: PickerActions) {
    const doc = editor.ownerDocument;
    this.element = doc.createElement('div');
    this.element.className = 'latin-hold-picker';
    this.element.setAttribute('role', 'group');
    this.element.setAttribute('aria-label', 'Latin Hold 字母变体');
    this.element.addEventListener('pointerdown', event => event.preventDefault());
    for (const name of ['aria-controls', 'aria-expanded', 'aria-activedescendant']) this.previousAttributes.set(name, editor.getAttribute(name));
    editor.setAttribute('aria-controls', this.id);
    editor.setAttribute('aria-expanded', 'true');
    doc.body.appendChild(this.element);
  }
  render(state: PickerState): void {
    const doc = this.element.ownerDocument;
    this.element.replaceChildren();
    const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
      const node = doc.createElement(tag); node.className = cls; if (text) node.textContent = text; return node;
    };
    const header = el('div', 'latin-hold-header');
    const title = el('div', 'latin-hold-title');
    title.append(el('span', 'latin-hold-base', state.base), el('span', 'latin-hold-title-text', '选择字母'));
    header.append(title, el('span', 'latin-hold-status', '输入已暂停'));
    const close = el('button', 'latin-hold-close', '×');
    close.type = 'button'; close.tabIndex = -1;
    close.setAttribute('aria-label', '取消选择'); close.title = '取消（Esc）';
    close.addEventListener('click', () => this.actions.cancel());
    header.append(close);
    this.element.append(header);

    const page = Math.floor(state.selected / PAGE_SIZE);
    const pages = Math.ceil(state.variants.length / PAGE_SIZE);
    const list = el('div', 'latin-hold-options');
    list.id = this.id; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', `${state.base} 的变体`);
    state.variants.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).forEach((letter, offset) => {
      const index = page * PAGE_SIZE + offset;
      const button = el('button', 'latin-hold-option');
      button.type = 'button'; button.tabIndex = -1; button.id = `${this.id}-${index}`;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(index === state.selected));
      button.setAttribute('aria-label', `${offset + 1}：${letter}`);
      button.title = `${letter} · 按 ${offset + 1}`;
      button.append(el('span', 'latin-hold-glyph', letter), el('kbd', 'latin-hold-number', String(offset + 1)));
      button.addEventListener('click', () => this.actions.choose(index));
      list.append(button);
    });
    this.element.append(list);
    const footer = el('div', 'latin-hold-footer');
    footer.append(el('span', 'latin-hold-hint', '1–9 选择 · ← → 移动 · Enter 确认'));
    if (pages > 1) {
      const pager = el('div', 'latin-hold-pager');
      const prev = el('button', 'latin-hold-page', '‹');
      const next = el('button', 'latin-hold-page', '›');
      for (const button of [prev, next]) { button.type = 'button'; button.tabIndex = -1; }
      prev.setAttribute('aria-label', '上一页'); next.setAttribute('aria-label', '下一页');
      prev.addEventListener('click', () => this.actions.page(-1)); next.addEventListener('click', () => this.actions.page(1));
      pager.append(prev, el('span', 'latin-hold-page-count', `${page + 1} / ${pages}`), next);
      footer.append(pager);
    }
    this.element.append(footer, el('div', 'latin-hold-subhint', `${pages > 1 ? 'Tab 翻页 · ' : ''}0 原字母 · Esc ${state.keepBaseOnCancel ? '保留原字母' : '取消'} · Backspace 放弃输入`));
    const announce = el('div', 'latin-hold-sr', `${state.variants[state.selected]}，第 ${page + 1} 页，共 ${pages} 页。按数字选择，Escape 取消。`);
    announce.setAttribute('role', 'status'); announce.setAttribute('aria-live', 'polite');
    this.element.append(announce);
    this.editor.setAttribute('aria-activedescendant', `${this.id}-${state.selected}`);
  }
  position(rect: { left: number; top: number; bottom: number } | null): void {
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
  destroy(): void {
    this.element.remove();
    for (const [name, value] of this.previousAttributes) {
      if (value === null) this.editor.removeAttribute(name); else this.editor.setAttribute(name, value);
    }
  }
}
