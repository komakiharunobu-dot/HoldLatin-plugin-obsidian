# Latin Hold

**Hold a key. Choose a character.**  
**长按字母，轻松选择拉丁字母变体。**

**Author / 作者:** komaki  
**Version / 版本:** 1.0.0  
**Platform / 平台:** Obsidian Desktop  
**License / 许可证:** MIT

---

# 中文说明

## ✨ 简介

Latin Hold 是一款专为 Obsidian 桌面版设计的拉丁字母变体输入插件。

在 Markdown 编辑器中，长按支持变体的英文字母约 **0.5 秒**，即可弹出候选菜单，通过数字键 **1–9** 快速选择法语、德语、西班牙语、葡萄牙语等语言中的特殊字符。

无需切换键盘布局，也不需要复制粘贴特殊字符。

### 主要特色

- **长按输入：** 默认长按 500 毫秒显示候选。
- **数字快捷选择：** 使用 `1–9` 直接输入对应字符。
- **智能防重复：** 长按期间不会产生 `eeeeee` 等重复输入。
- **快速打字：** 短按正常输入，支持按键重叠。
- **大小写支持：** 自动识别 Shift 和 Caps Lock。
- **多语言预设：** 支持多种欧洲语言的常用拉丁字母。
- **自定义候选：** 自由调整字符及显示顺序。
- **编辑器集成：** 支持选区替换、多光标、撤销和重做。
- **离线运行：** 不联网、不收集按键、不上传笔记。

## 📦 安装

目前提供手动安装版本，尚未上架 Obsidian 社区插件市场。

1. 解压 `Latin-Hold-1.0.0.zip`。
2. 将其中的 `latin-hold` 文件夹复制到 Obsidian 仓库的 `.obsidian/plugins/` 目录。
3. 确保以下三个文件位于同一目录：

```text
YourVault/
└── .obsidian/
    └── plugins/
        └── latin-hold/
            ├── main.js
            ├── manifest.json
            └── styles.css
```

4. 重启 Obsidian。
5. 前往 **设置 → 第三方插件**，启用 Latin Hold。
6. 打开 Markdown 笔记，切换到英文输入状态，长按 `e` 测试。

**macOS 提示：** 在 Finder 中按 `Command + Shift + .` 显示隐藏文件。

安装无需 Node.js、Templater 或其他插件。压缩包中的 `source/` 仅供开发使用。

## ⌨️ 基本使用

短按字母时，字符在松开按键时立即输入，无需等待 500 毫秒。

长按字母时，原始字符暂不输入。达到触发时间后，候选菜单出现，松开字母键也不会关闭菜单。

| 操作 | 输入结果 |
|---|---|
| 长按 `e` → `1` | é |
| 长按 `c` → `1` | ç |
| 长按 `u` → `1` | ü |
| 长按 `s` → `1` | ß |
| 长按 `Shift + c` → `1` | Ç |
| 长按 `Shift + s` → `1` | ẞ |

以上对应默认「常用拉丁字母」预设。

大写由按下字母时的 Shift 或 Caps Lock 状态决定。即使 Shift 尚未松开，也可以使用顶行数字键选择候选。

同时支持数字小键盘。

### 智能输入保护

- 长按期间阻止系统重复输入原字母。
- 选择变体后，即使原按键尚未松开，也不会追加重复字母。
- 长按数字选择时，不会写入重复数字。
- 候选菜单打开期间，普通文字、数字、标点及粘贴输入会被拦截。
- 菜单不会自动确认，也不会超时关闭。
- 选字完成或取消后，恢复正常编辑。

## 🎛️ 候选菜单快捷键

| 按键 / 操作 | 功能 |
|---|---|
| `1–9` | 选择当前页对应候选 |
| `←` / `→` | 移动高亮候选 |
| `Enter` / `Space` | 插入高亮候选 |
| `Tab` | 下一页 |
| `Shift + Tab` | 上一页 |
| `PageDown` / `↓` | 下一页 |
| `PageUp` / `↑` | 上一页 |
| `Home` / `End` | 第一个 / 最后一个候选 |
| `0` | 输入原始英文字母 |
| `Esc` | 取消选择 |
| `Backspace` / `Delete` | 取消且不输入字符 |
| 点击候选 | 插入所选字符 |
| 点击菜单外部 | 取消选择 |

每页最多显示九个编号候选，切换页面后编号重新从 1 开始。

默认情况下，使用 Esc、关闭按钮或点击外部取消时，会保留一个原始英文字母。此行为可以在设置中关闭。

Backspace 和 Delete 始终取消本次输入，不删除已有正文或原选区内容。

### 编辑器兼容

支持：

- 替换已经选中的文本。
- 多光标输入及选区替换。
- Obsidian 原生撤销和重做。
- 实时预览和源码编辑模式。

选字期间普通快捷键会被拦截。执行查找、命令面板或撤销等操作前，请先取消选字。

切换应用、笔记或点击编辑器外部会结束当前选择。

## ⚙️ 设置

进入 **设置 → Latin Hold**。

### 启用 / 暂停

可以在设置中启用或暂停插件，也可以通过命令面板执行：

`Latin Hold: 启用 / 暂停长按选字`

可在 Obsidian 的「快捷键」设置中绑定自定义热键。

### 长按时间

默认 **500 ms**，可在 **200–1500 ms** 之间调整。

### 语言预设

提供以下字符集合：

- 常用拉丁字母
- 法语
- 德语
- 西班牙语
- 葡萄牙语
- 意大利语
- 北欧语言
- 中东欧常用字符
- 土耳其语

### 取消时保留原字母

默认开启。

关闭后，普通取消操作不再输入原始字母。此设置不影响 `0`、Backspace 和 Delete 的独立行为。

### 自定义字符

支持 JSON 格式自定义候选顺序与字符集合。

```json
{
  "e": ["é", "è", "ê", "ë"],
  "a": ["ä", "à", "á", "â", "æ"],
  "s": ["ß", "š"],
  "q": []
}
```

规则：

- 键名必须是小写 `a–z`。
- 每个候选必须是单个拉丁字母，允许组合变音符号。
- 数组顺序决定候选显示顺序。
- 空数组表示关闭对应字母的长按功能。
- 未指定的字母继续使用当前语言预设。
- 大小写由插件自动转换。

编辑后点击「保存自定义候选」生效。

没有候选的字母不会被插件拦截，保留 Obsidian 原有键盘行为。

## 🖥️ 兼容性与限制

**系统要求：**

- Obsidian 桌面版
- Obsidian 1.6.0 或更高版本
- 实体键盘
- Markdown 编辑器

**当前限制：**

- 不支持移动端软键盘。
- 不作用于阅读视图、搜索框、设置输入框及文件名。
- 不支持 Vim 按键模式，建议使用 Vim 时暂停插件。
- 建议在英文输入状态使用。
- 中文、日文等输入法的组合输入及系统死键由操作系统处理，实际行为可能因系统而异。
- 候选菜单打开后，输入法组合输入不会解除选字锁定。
- 与其他全局键盘拦截插件可能存在冲突。
- 如果等待选字期间正文或选区被其他插件修改，本次输入会取消，以避免错误替换。

内置字符表并非完整 Unicode 字母数据库，可以通过自定义候选补充。

## 🔒 隐私

Latin Hold 完全离线运行。

- 不发送网络请求。
- 不记录或统计按键。
- 不扫描或上传笔记。
- 不收集个人信息。
- 设置仅保存在插件自己的 `data.json` 中。

禁用或卸载插件不会影响已经输入的字符。所有字符都是普通 Unicode 文本。

## 🛠️ 开发

完整源码位于交付包：

`source/latin-hold/`

安装依赖、构建及测试：

```sh
npm install
npm run build
npm test
```

开发依赖包括 Obsidian API 1.8.7、CodeMirror 6 和 TypeScript。

核心文件：

| 文件 | 功能 |
|---|---|
| `src/engine.ts` | 按键状态管理、长按检测及重复拦截 |
| `src/editor.ts` | 编辑器事件与输入事务保护 |
| `src/picker.ts` | 候选菜单界面 |
| `src/variants.ts` | 多语言字符预设 |

CodeMirror 与 Obsidian 由宿主提供，不重复打包。发布包中的 `main.js` 已经编译。

### 测试

模拟 DOM 集成测试：

```sh
npm install --no-save jsdom@26.1.0
npm run test:dom
```

浏览器端到端测试：

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
```

**当前测试状态：**

- 34 项核心逻辑测试已完成。
- 14 项模拟 DOM 集成测试已完成。
- 浏览器端到端测试尚未完成。
- 完整 Obsidian 桌面应用实机测试尚未完成。

浏览器测试不等同于完整 Obsidian 应用测试。详细测试边界见 `TEST-REPORT.md`。

---

# English Documentation

## ✨ Overview

Latin Hold is a lightweight character-variant input plugin designed for the Obsidian desktop Markdown editor.

Hold a supported letter key for approximately **0.5 seconds** to open a character picker, then press **1–9** to insert an accented or modified Latin character.

It provides convenient access to characters used in French, German, Spanish, Portuguese, and many other languages without switching keyboard layouts or copying characters manually.

### Key Features

- **Press and hold:** Open the character picker after 500 milliseconds by default.
- **Number-key selection:** Select variants using `1–9`.
- **Repeat prevention:** Avoid unwanted repeated letters during long presses.
- **Responsive typing:** Short presses insert normally, including overlapping keystrokes.
- **Case awareness:** Supports Shift and Caps Lock.
- **Language presets:** Includes commonly used characters from multiple European languages.
- **Custom variants:** Configure characters and their display order.
- **Editor integration:** Supports selections, multiple cursors, undo, and redo.
- **Privacy-first:** Works entirely offline without collecting keystrokes or note content.

## 📦 Installation

Latin Hold is currently available for manual installation and has not yet been published in the Obsidian Community Plugins directory.

1. Extract `Latin-Hold-1.0.0.zip`.
2. Copy the `latin-hold` folder into your vault's `.obsidian/plugins/` directory.
3. Verify that the folder structure is:

```text
YourVault/
└── .obsidian/
    └── plugins/
        └── latin-hold/
            ├── main.js
            ├── manifest.json
            └── styles.css
```

4. Restart Obsidian.
5. Navigate to **Settings → Community plugins** and enable Latin Hold.
6. Open a Markdown note in editing mode, switch to an English keyboard input state, and hold `e` to test the plugin.

**macOS:** Press `Command + Shift + .` in Finder to reveal hidden folders.

Node.js, Templater, and other plugins are not required for installation.

The `source/` directory contains development source code and is not part of the installation folder.

## ⌨️ Usage

### Short Press

A short keypress inserts the original letter when the key is released.

You do not need to wait for the 500 ms threshold.

Overlapping keypresses are handled in their original order.

### Long Press

Hold a supported letter until the character picker appears.

The original letter is not inserted while the plugin waits for the long-press threshold.

The picker remains open after the original key is released.

| Action | Result |
|---|---|
| Hold `e` → `1` | é |
| Hold `c` → `1` | ç |
| Hold `u` → `1` | ü |
| Hold `s` → `1` | ß |
| Hold `Shift + c` → `1` | Ç |
| Hold `Shift + s` → `1` | ẞ |

These examples use the default Common Latin preset.

Uppercase variants are determined by the Shift and Caps Lock state when the original letter key is pressed.

The top-row number keys remain available for selection even if Shift is still held.

Numeric keypad selection is also supported.

### Input Protection

Latin Hold prevents unwanted text insertion while the picker is active.

- Repeated keydown events do not generate repeated original letters.
- Releasing the original key does not dismiss the picker.
- Selecting a variant while the original key remains held does not produce extra letters.
- Repeated number-key events do not insert extra digits.
- Ordinary letters, punctuation, digits, and paste operations are blocked during selection.
- The picker never automatically selects a character or closes after a timeout.
- Normal editing resumes after confirmation or cancellation.

## 🎛️ Character Picker Controls

| Key / Action | Behavior |
|---|---|
| `1–9` | Select a candidate on the current page |
| `←` / `→` | Move the highlighted selection |
| `Enter` / `Space` | Insert the highlighted character |
| `Tab` | Next page |
| `Shift + Tab` | Previous page |
| `PageDown` / `↓` | Next page |
| `PageUp` / `↑` | Previous page |
| `Home` / `End` | First / last candidate |
| `0` | Insert the original letter |
| `Esc` | Cancel selection |
| `Backspace` / `Delete` | Cancel without inserting |
| Click a candidate | Insert that character |
| Click outside | Cancel selection |

Each page contains up to nine numbered candidates. Numbering restarts from 1 on every page.

By default, cancellation using Esc, the close button, or an outside click inserts one original letter.

This behavior can be disabled in settings.

Backspace and Delete always cancel without inserting or deleting existing text.

### Editor Integration

Latin Hold supports:

- Replacing selected text with a character variant.
- Multiple cursors and selection replacement.
- Native undo and redo.
- Live Preview and Source Mode.

Ordinary keyboard shortcuts are blocked while the picker is active. Cancel the selection before using Find, the Command Palette, Undo, or other shortcuts.

Switching applications or notes, or clicking outside the editor, ends the active selection to prevent the editor from remaining locked.

## ⚙️ Settings

Open **Settings → Latin Hold** to configure the plugin.

### Enable / Pause

Enable or pause the long-press feature through the settings panel or the Command Palette.

Command:

`Latin Hold: 启用 / 暂停长按选字`

You can assign a custom hotkey in Obsidian's Hotkeys settings.

### Long-Press Delay

Default: **500 ms**

Configurable range: **200–1500 ms**

### Language Presets

Available presets include:

- Common Latin
- French
- German
- Spanish
- Portuguese
- Italian
- Nordic languages
- Central and Eastern European characters
- Turkish

### Preserve Original Letter on Cancellation

Enabled by default.

When disabled, ordinary cancellation does not insert the original letter.

This setting does not change the independent behavior of `0`, Backspace, or Delete.

### Custom Character Variants

Define custom variants using JSON:

```json
{
  "e": ["é", "è", "ê", "ë"],
  "a": ["ä", "à", "á", "â", "æ"],
  "s": ["ß", "š"],
  "q": []
}
```

Rules:

- Keys must be lowercase letters from `a` to `z`.
- Each candidate must represent a single Latin letter, optionally with combining diacritics.
- Array order determines display order.
- An empty array disables long-press handling for that letter.
- Unspecified letters continue using the selected preset.
- Uppercase variants are generated automatically.

Click **Save Custom Variants** to apply your changes.

Letters without candidates are handled normally by Obsidian, including native key-repeat behavior.

## 🖥️ Compatibility and Limitations

### Requirements

- Obsidian Desktop
- Obsidian 1.6.0 or later
- Physical keyboard
- Markdown editing mode

### Limitations

- Mobile software keyboards are not supported.
- Reading View, search fields, settings inputs, and file-name fields are not affected.
- Vim keybinding mode is not supported. Pause Latin Hold when using Vim.
- English keyboard input mode is recommended.
- IME composition for Chinese, Japanese, and other languages, as well as operating-system dead keys, remains under the input method's control. Actual behavior may vary by operating system.
- IME composition cannot bypass the input lock once the picker is open.
- Other plugins that globally intercept keyboard events may cause conflicts.
- If another plugin or synchronization process changes the document or selection while a character is pending, Latin Hold cancels the pending insertion to avoid replacing text at an outdated position.

The built-in presets cover commonly used Latin characters rather than the entire Unicode Latin character repertoire.

Additional characters can be configured manually.

## 🔒 Privacy

Latin Hold operates entirely offline.

It does not:

- Make network requests.
- Record or analyze keystrokes.
- Scan or upload notes.
- Collect personal information.

Settings are stored locally in the plugin's `data.json` file.

Characters inserted into notes are standard Unicode text. They remain fully readable and editable after the plugin is disabled or uninstalled.

## 🛠️ Development

The complete source code is included in:

`source/latin-hold/`

Install dependencies, build, and run tests:

```sh
npm install
npm run build
npm test
```

Development dependencies include Obsidian API 1.8.7, CodeMirror 6, and TypeScript.

### Project Structure

| File | Responsibility |
|---|---|
| `src/engine.ts` | Key state, long-press detection, and repeat suppression |
| `src/editor.ts` | Editor event handling and transaction protection |
| `src/picker.ts` | Character picker interface |
| `src/variants.ts` | Character presets and variant definitions |

CodeMirror and Obsidian are provided by the host application and are not bundled again.

The distributed `main.js` is already compiled.

### Testing

Optional simulated DOM integration tests:

```sh
npm install --no-save jsdom@26.1.0
npm run test:dom
```

Optional browser integration tests:

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
```

### Test Status

- **34 core logic tests completed.**
- **14 simulated DOM integration tests completed.**
- Browser end-to-end testing has not been completed.
- Full testing inside the Obsidian desktop application has not been completed.

Browser-based testing does not replace testing in the complete Obsidian desktop environment.

See `TEST-REPORT.md` for detailed testing scope and limitations.

---

## References / 参考资料

- [Obsidian Official API](https://github.com/obsidianmd/obsidian-api)
- [CodeMirror Reference Documentation](https://codemirror.net/docs/ref/)

## License / 许可证

MIT License

Copyright (c) 2026 komaki
