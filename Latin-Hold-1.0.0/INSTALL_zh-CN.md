# Latin Hold 1.0.0 — 安装说明

作者：komaki

1. 将本压缩包中的 latin-hold 文件夹，复制到 Obsidian 仓库的 .obsidian/plugins/ 下。
2. 确认路径为 .obsidian/plugins/latin-hold/main.js，同层还有 manifest.json 和 styles.css。
3. 重启 Obsidian，在「设置 → 第三方插件」中启用 Latin Hold。
4. 在笔记编辑模式下，切换到英文输入状态，按住 e 约 0.5 秒，然后按 1 选择 é。

macOS 可用 Command + Shift + . 显示 .obsidian 隐藏文件夹。

选字期间字母不进入正文；1–9 选字，Tab 翻页；Esc 默认保留原字母，Backspace 取消且不输入。长按阈值、语言范围、自定义候选均可在插件设置中调整。

本包已经编译，不需要 Node.js 或 Templater。完整使用说明在 latin-hold/README.md；开发源码在 source/latin-hold/，不要把 source 当成安装目录。

适用于桌面版实体键盘与英文输入状态。48 项核心逻辑与模拟 DOM 集成测试通过；未完成完整 Obsidian 实机验证。详见 TEST-REPORT.md。
