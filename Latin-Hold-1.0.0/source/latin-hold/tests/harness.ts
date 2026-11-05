import { EditorState, EditorSelection, Transaction } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, undo, redo } from '@codemirror/commands';
import { createHoldExtension, type EditorController } from '../src/editor';
import { DEFAULT_SETTINGS, type HoldSettings } from '../src/settings';
import { parseCustom } from '../src/variants';

let view: EditorView;
let controllers = new Set<EditorController>();
function reset(options: Partial<HoldSettings> & { doc?: string; readonly?: boolean; ranges?: Array<[number, number]> } = {}): void {
  view?.destroy();
  const parent = document.getElementById('editor')!;
  parent.replaceChildren();
  const settings = { ...DEFAULT_SETTINGS, ...options };
  controllers = new Set();
  const custom = parseCustom(settings.custom);
  const doc = options.doc || '';
  const selection = options.ranges ? EditorSelection.create(options.ranges.map(([a, h]) => EditorSelection.range(a, h))) : EditorSelection.cursor(doc.length);
  view = new EditorView({ parent, state: EditorState.create({
    doc, selection,
    extensions: [
      EditorState.allowMultipleSelections.of(true), EditorState.readOnly.of(!!options.readonly),
      history(), keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.theme({ '&': { fontSize: '18px', minHeight: '280px' }, '.cm-content': { padding: '24px' }, '.cm-focused': { outline: 'none' } }),
      createHoldExtension({ settings: () => settings, custom: () => custom, controllers })
    ]
  }) });
  view.focus();
}
const api = {
  reset,
  text: () => view.state.doc.toString(),
  view: () => view,
  controller: () => [...controllers][0],
  select: (from: number, to = from) => view.dispatch({ selection: EditorSelection.single(from, to) }),
  input: (text: string) => view.dispatch({ ...view.state.replaceSelection(text), annotations: Transaction.userEvent.of('input.type') }),
  external: (text: string) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }),
  undo: () => undo(view), redo: () => redo(view),
  destroy: () => view.destroy()
};
(window as unknown as { testApi: typeof api }).testApi = api;
reset();
