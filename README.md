# GitHub Collapse Markdown

![Version](https://img.shields.io/badge/version-5.1.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Userscript](https://img.shields.io/badge/userscript-Tampermonkey%2FViolentmonkey-orange.svg)

给 GitHub Markdown 页面加上标题折叠能力的 userscript。

装上以后，你可以像看文档工具一样折叠 README、Issue、PR、Gist 和 GitHub Docs 里的章节，只看当前关心的内容。

## 它解决什么问题

GitHub 上的长文档通常有这些问题：

- README 太长，滚动成本高
- Issue / PR 讨论里夹着大段 Markdown，不容易快速扫读
- Gist 和 Docs 页面缺少顺手的折叠交互
- 看某一节时，其他内容会持续干扰视线

这个脚本的目标很简单：

- 让 Markdown 标题可以直接折叠 / 展开
- 让长页面更容易扫读
- 让你快速定位、收起、展开你关心的章节

## 功能

- 标题折叠
  点击标题即可折叠或展开当前章节
- 同级批量折叠
  `Shift + 点击标题` 可以同时折叠或展开当前层级的同级标题
- 页面大纲
  侧边面板显示当前文档结构，支持点击跳转
- 全部折叠 / 全部展开
  适合快速收起长文或恢复完整视图
- 页面记忆
  会记住当前页面的折叠状态，下次回来继续看
- 动态页面兼容
  GitHub 内部跳转、局部刷新、评论区更新后会自动重新挂载

## 支持页面

- `github.com`
  - README / Markdown 文件页
  - Issue 正文
  - Pull Request 正文
  - 评论区 Markdown 内容
  - Wiki
- `gist.github.com`
- `docs.github.com`
- `help.github.com`
- `support.github.com`

只有在页面里真正检测到 Markdown 标题时，脚本才会激活。

## 使用方式

- 点击标题左侧箭头：折叠 / 展开当前章节
- 点击整个标题行：折叠 / 展开当前章节
- `Shift + 点击标题`：批量折叠 / 展开同级章节
- 打开侧边面板：浏览大纲并跳转到指定标题
- `Collapse all`：折叠全部章节
- `Expand all`：展开全部章节

## 快捷键

- `Ctrl/Cmd + Shift + M`
  切换大纲面板
- `Ctrl/Cmd + Shift + C`
  折叠全部
- `Ctrl/Cmd + Shift + E`
  展开全部

## 安装

1. 安装脚本管理器
   - [Tampermonkey](https://www.tampermonkey.net/)
   - [Violentmonkey](https://violentmonkey.github.io/)
2. 安装脚本
   - 直接安装仓库根目录脚本：
     [`main.js` 原始链接](https://raw.githubusercontent.com/Xyea/GitHub-Collapse-Markdown/main/main.js)
   - 或使用构建产物：
     `dist/github-collapse-markdown.user.js`

## 适合谁

- 经常看开源项目 README 的人
- 需要在长 Issue / PR 里快速找重点的人
- 习惯边看边收起内容、保持页面干净的人
- 想让 GitHub Markdown 更接近文档阅读器体验的人

## 许可证

[MIT](LICENSE)
