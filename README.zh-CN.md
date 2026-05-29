# OpenFMV

<p align="center">
  <img src="./public/logo.png" alt="OpenFMV Logo" width="128" />
</p>

<p align="center">
  <a href="./readme.md">English</a> · 简体中文 · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a>
</p>

OpenFMV 是一个本地优先的可视化非线性叙事编辑器，用来制作互动影像、分支剧情、互动短剧和可独立运行的桌面端故事体验。

项目目前是 Next.js 14 + Electron 桌面应用，使用 React Flow 搭建故事图编辑画布。项目文件、导入素材和导出内容都保存在本机，不依赖账号系统、数据库或云端存储。

![OpenFMV 编辑器总览](./public/readme/openfmv-editor-overview.png)

## 功能特性

- 可视化故事图：通过开始、剧情、互动、结尾节点组织非线性叙事。
- 分支交互：支持选项、文本输入、滑动解锁、倒计时和默认路径。
- 本地素材管理：导入图片、视频、音频和文本素材，并随项目保存在本机。
- 即时预览播放：在编辑项目后直接进入播放视图验证分支体验。
- 项目导入导出：项目以 OpenFMV JSON 文件保存，便于备份、迁移和版本管理。
- 桌面游戏导出：可把项目打包为可运行的 Electron 桌面体验。
- 本地 AI 辅助：桌面端可调用本机 CLI Agent 或自带 Key 的模型服务辅助创作。

## 界面预览

### 分支播放预览

![OpenFMV 分支播放预览](./public/readme/openfmv-play-preview.png)

### 本地项目工作台

![OpenFMV 本地项目工作台](./public/readme/openfmv-projects.png)

## 技术栈

- Next.js 14 App Router
- TypeScript
- React 18
- React Flow
- Zustand
- Tailwind CSS
- Electron
- Vitest

## 快速开始

### 环境要求

- Node.js 20 或更高版本
- npm
- Windows 环境优先支持；Web 开发模式可在其他系统上运行

### 安装依赖

```bash
npm install
```

### 启动 Web 开发服务

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

### 启动桌面端

```bash
npm run desktop:dev
```

如果需要使用构建后的 standalone 版本：

```bash
npm run build
npm run desktop:standalone
```

## 常用命令

```bash
npm run dev                 # 启动 Next.js 开发服务
npm run desktop             # 启动 Electron 桌面端
npm run desktop:dev         # 启动桌面开发模式
npm run desktop:standalone  # 启动 standalone 桌面模式
npm run build               # 构建应用
npm run package:desktop     # 打包桌面应用
npm run lint                # 运行 lint
npm run test:run            # 运行测试
```

运行单个测试文件：

```bash
npx vitest path/to/test.test.ts
```

运行单个测试用例：

```bash
npx vitest path/to/test.test.ts -t "test name"
```

## 项目结构

```text
app/
  _components/          React 组件
    nodes/              React Flow 节点组件
    editor/             编辑器 UI
    player/             播放器组件
    local/              本地桌面端 UI
    ui/                 通用 UI 组件
  _hooks/               React hooks
  _store/               Zustand stores
  _types/               共享 TypeScript 类型
  _utils/               工具函数
  api/                  本地 Next.js API routes
  editor/               编辑器页面
  play/[id]/            播放页面
  projects/             项目管理页面
  asset-studio/         素材工作台
  assets/               素材页面
electron/
  main.js               Electron 主进程与 IPC
  preload.js            preload API
  exporter.js           桌面体验导出器
scripts/                构建与打包脚本
__tests__/              测试
```

## 项目文件

OpenFMV 项目以 JSON 形式保存，核心字段包括：

```text
schemaVersion
id
title
graphData
assets
metadata
createdAt
updatedAt
```

导入素材会被复制到本地项目或应用数据目录中。导出项目或桌面体验时，相关素材会被一并复制到输出目录，尽量保证成品可以脱离原始素材路径运行。

## 桌面导出

使用：

```bash
npm run package:desktop
```

构建完成后，桌面应用输出到 `dist/`。在应用内导出的互动故事会包含运行时、项目图数据和素材资源，适合分发给玩家或测试人员。

## 开发说明

- 当前项目坚持本地优先设计，不包含登录、用户同步、托管后端、数据库或云存储。
- 共享类型定义位于 `app/_types/index.ts`。
- 新增节点类型时，需要同步更新类型、节点注册、编辑器组件、播放器逻辑和导出运行时。
- 样式使用 Tailwind CSS，自定义颜色集中在 `app/globals.css`。
- React Flow 节点组件应使用 `React.memo` 包裹。

更多架构约定可参考 `docs/architecture-boundaries.md` 和 `docs/editor-connection-rules.md`。

## 贡献

欢迎提交 issue 和 pull request。建议在提交前运行：

```bash
npm run lint
npm run test:run
```

如果改动会影响桌面端导出或播放流程，请同时手动验证编辑、保存、预览和导出路径。

## 许可证

本项目基于 MIT License 开源。你可以自由使用、复制、修改、合并、发布、分发、再授权和销售本项目的副本，包括商业用途，但必须在所有副本或主要部分中保留原始版权声明和许可证文本。
