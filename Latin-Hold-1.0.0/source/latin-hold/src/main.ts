import { Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { createHoldExtension, type EditorController } from './editor';
import { DEFAULT_SETTINGS, normalizeSettings, type HoldSettings } from './settings';
import { PRESETS, parseCustom, type VariantMap } from './variants';

export default class LatinHoldPlugin extends Plugin {
  settings: HoldSettings = { ...DEFAULT_SETTINGS };
  custom: VariantMap = {};
  readonly controllers = new Set<EditorController>();

  async onload(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
    this.custom = parseCustom(this.settings.custom);
    this.registerEditorExtension(createHoldExtension({ settings: () => this.settings, custom: () => this.custom, controllers: this.controllers }));
    this.addSettingTab(new LatinHoldSettingTab(this));
    this.addCommand({
      id: 'toggle-long-press', name: '启用 / 暂停长按选字',
      callback: async () => {
        await this.updateSettings({ enabled: !this.settings.enabled });
        new Notice(`Latin Hold：${this.settings.enabled ? '已启用' : '已暂停'}`);
      }
    });
  }
  onunload(): void {
    for (const controller of [...this.controllers]) controller.destroy();
  }
  async updateSettings(patch: Partial<HoldSettings>): Promise<void> {
    for (const controller of this.controllers) controller.engine.pointerCancel();
    this.settings = normalizeSettings({ ...this.settings, ...patch });
    this.custom = parseCustom(this.settings.custom);
    await this.saveData(this.settings);
  }
}

class LatinHoldSettingTab extends PluginSettingTab {
  constructor(private readonly plugin: LatinHoldPlugin) { super(plugin.app, plugin); }
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Latin Hold · 长按选字' });
    containerEl.createEl('p', { cls: 'latin-hold-settings-intro', text: '按住英文字母约半秒，用 1–9 选择变体。选字框出现后暂停正文输入，直到选择或取消。' });
    new Setting(containerEl).setName('启用长按选字').setDesc('仅在桌面版笔记正文编辑器生效。也可以在命令面板中快速暂停。')
      .addToggle(toggle => toggle.setValue(this.plugin.settings.enabled).onChange(value => this.plugin.updateSettings({ enabled: value })));
    new Setting(containerEl).setName('长按触发时间').setDesc('默认 500 毫秒；短按在松开按键时输入，不需要等满这个时间。')
      .addSlider(slider => slider.setLimits(200, 1500, 50).setValue(this.plugin.settings.delay).setDynamicTooltip()
        .onChange(value => this.plugin.updateSettings({ delay: value })));
    new Setting(containerEl).setName('字母候选范围').setDesc('多语言模式包含常见欧洲语言及部分学术转写变音字母。选择单一语言可以缩短列表。')
      .addDropdown(dropdown => {
        for (const [id, preset] of Object.entries(PRESETS)) dropdown.addOption(id, preset.label);
        dropdown.setValue(this.plugin.settings.preset).onChange(value => this.plugin.updateSettings({ preset: value }));
      });
    new Setting(containerEl).setName('取消时保留原字母').setDesc('Esc、关闭按钮或点击外部时生效。Backspace / Delete 始终放弃本次输入；0 始终输入原字母。')
      .addToggle(toggle => toggle.setValue(this.plugin.settings.keepBaseOnCancel).onChange(value => this.plugin.updateSettings({ keepBaseOnCancel: value })));
    containerEl.createEl('h3', { text: '自定义候选与顺序' });
    containerEl.createEl('p', { text: '下方 JSON 会覆盖对应字母的候选，其他字母保留当前预设。键名使用 a–z；空数组可关闭该字母的长按。大写候选自动转换。' });
    const textarea = containerEl.createEl('textarea', { cls: 'latin-hold-custom', attr: { 'aria-label': '自定义字母候选', spellcheck: 'false', rows: '6', placeholder: '{"e":["é","è","ê","ë"],"s":["ß"],"q":[]}' } });
    textarea.value = this.plugin.settings.custom;
    const error = containerEl.createEl('p', { cls: 'latin-hold-error', attr: { role: 'status' } });
    new Setting(containerEl).addButton(button => button.setButtonText('保存自定义候选').setCta().onClick(async () => {
      try {
        parseCustom(textarea.value);
        await this.plugin.updateSettings({ custom: textarea.value.trim() });
        error.textContent = ''; new Notice('Latin Hold：自定义候选已保存');
      } catch (problem) { error.textContent = problem instanceof Error ? problem.message : String(problem); }
    })).addButton(button => button.setButtonText('清除自定义').onClick(async () => {
      textarea.value = ''; error.textContent = ''; await this.plugin.updateSettings({ custom: '' });
    }));
    containerEl.createEl('h3', { text: '快捷键' });
    const list = containerEl.createEl('ul');
    for (const line of [
      '1–9：选择当前页对应字母（也支持小键盘数字）。',
      'Tab / Shift+Tab：下一页 / 上一页；← / →：移动选择。',
      'Enter / 空格：插入当前高亮字母；0：输入原字母。',
      'Esc：取消；Backspace / Delete：取消且不写入字母。',
      '按住 Shift + 字母，或开启 Caps Lock，可选择大写变体。'
    ]) list.createEl('li', { text: line });
    containerEl.createEl('p', { cls: 'latin-hold-settings-intro', text: '请使用英文输入状态。中文、日文等输入法的组字过程交给输入法处理。本插件不面向手机软键盘或 Vim 模式。' });
  }
}
