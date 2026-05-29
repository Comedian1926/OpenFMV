# OpenFMV

<p align="center">
  <img src="./public/logo.png" alt="OpenFMV Logo" width="128" />
</p>

<p align="center">
  <a href="./readme.md">English</a> · <a href="./README.zh-CN.md">简体中文</a> · 日本語 · <a href="./README.ko.md">한국어</a>
</p>

OpenFMV は、インタラクティブ映像、分岐型ストーリー、インタラクティブ短編ドラマ、単体で実行できるデスクトップ向けストーリー体験を作成するための、ローカルファーストなビジュアル非線形ストーリーテリングエディターです。

現在のプロジェクトは Next.js 14 + Electron のデスクトップアプリです。React Flow を使ってストーリーグラフの編集キャンバスを構築しています。プロジェクトファイル、インポートした素材、エクスポート内容はすべてローカルに保存され、アカウントシステム、データベース、クラウドストレージには依存しません。

![OpenFMV エディター概要](./public/readme/openfmv-editor-overview.png)

## 機能

- ビジュアルストーリーグラフ: 開始、ストーリー、インタラクション、エンディングの各ノードで非線形ストーリーを構成できます。
- 分岐インタラクション: 選択肢、テキスト入力、スライド解除、カウントダウン、デフォルトパスに対応しています。
- ローカル素材管理: 画像、動画、音声、テキスト素材をインポートし、ローカルプロジェクトと一緒に保存できます。
- 即時再生プレビュー: 編集後にプレイヤービューを開き、分岐体験を確認できます。
- プロジェクトのインポートとエクスポート: OpenFMV JSON ファイルとして保存し、バックアップ、移行、バージョン管理に利用できます。
- デスクトップゲームのエクスポート: プロジェクトを実行可能な Electron デスクトップ体験としてパッケージ化できます。
- ローカル AI 支援: デスクトップアプリから、ローカル CLI Agent や独自キーで設定したモデルサービスを呼び出せます。

## 画面プレビュー

### 分岐再生プレビュー

![OpenFMV 分岐再生プレビュー](./public/readme/openfmv-play-preview.png)

### ローカルプロジェクトワークスペース

![OpenFMV ローカルプロジェクトワークスペース](./public/readme/openfmv-projects.png)

## 技術スタック

- Next.js 14 App Router
- TypeScript
- React 18
- React Flow
- Zustand
- Tailwind CSS
- Electron
- Vitest

## クイックスタート

### 必要環境

- Node.js 20 以上
- npm
- デスクトップ環境は Windows を優先的にサポートしています。Web 開発モードは他のシステムでも実行できます。

### 依存関係のインストール

```bash
npm install
```

### Web 開発サーバーの起動

```bash
npm run dev
```

デフォルトのアクセス先:

```text
http://localhost:3000
```

### デスクトップアプリの起動

```bash
npm run desktop:dev
```

ビルド済みの standalone 版を使う場合:

```bash
npm run build
npm run desktop:standalone
```

## よく使うコマンド

```bash
npm run dev                 # Next.js 開発サーバーを起動
npm run desktop             # Electron デスクトップアプリを起動
npm run desktop:dev         # デスクトップ開発モードを起動
npm run desktop:standalone  # standalone デスクトップモードを起動
npm run build               # アプリをビルド
npm run package:desktop     # デスクトップアプリをパッケージ化
npm run lint                # lint を実行
npm run test:run            # テストを実行
```

単一のテストファイルを実行:

```bash
npx vitest path/to/test.test.ts
```

単一のテストケースを実行:

```bash
npx vitest path/to/test.test.ts -t "test name"
```

## プロジェクト構成

```text
app/
  _components/          React コンポーネント
    nodes/              React Flow ノードコンポーネント
    editor/             エディター UI
    player/             プレイヤーコンポーネント
    local/              ローカルデスクトップ UI
    ui/                 共通 UI コンポーネント
  _hooks/               React hooks
  _store/               Zustand stores
  _types/               共有 TypeScript 型
  _utils/               ユーティリティ関数
  api/                  ローカル Next.js API routes
  editor/               エディターページ
  play/[id]/            再生ページ
  projects/             プロジェクト管理ページ
  asset-studio/         アセットスタジオ
  assets/               アセットページ
electron/
  main.js               Electron メインプロセスと IPC
  preload.js            preload API
  exporter.js           デスクトップ体験エクスポーター
scripts/                ビルドとパッケージ化スクリプト
__tests__/              テスト
```

## プロジェクトファイル

OpenFMV プロジェクトは JSON 形式で保存されます。主なフィールドは次のとおりです。

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

インポートした素材は、ローカルプロジェクトまたはアプリデータディレクトリにコピーされます。プロジェクトやデスクトップ体験をエクスポートするときは、関連素材も出力ディレクトリにコピーされるため、成果物は元の素材パスに依存せずに実行しやすくなります。

## デスクトップエクスポート

使用するコマンド:

```bash
npm run package:desktop
```

ビルド完了後、デスクトップアプリは `dist/` に出力されます。アプリ内でエクスポートしたインタラクティブストーリーには、ランタイム、プロジェクトグラフデータ、素材リソースが含まれるため、プレイヤーやテスターへの配布に適しています。

## 開発メモ

- このプロジェクトはローカルファースト設計を採用しており、ログイン、ユーザー同期、ホスト型バックエンド、データベース、クラウドストレージは含みません。
- 共有型定義は `app/_types/index.ts` にあります。
- 新しいノードタイプを追加する場合は、型、ノード登録、エディターコンポーネント、プレイヤーロジック、エクスポートランタイムをあわせて更新してください。
- スタイルには Tailwind CSS を使用し、カスタムカラーは `app/globals.css` に集約されています。
- React Flow のノードコンポーネントは `React.memo` でラップしてください。

詳しいアーキテクチャ上のルールは、`docs/architecture-boundaries.md` と `docs/editor-connection-rules.md` を参照してください。

## コントリビューション

Issue と pull request を歓迎します。送信前に次を実行することをおすすめします。

```bash
npm run lint
npm run test:run
```

デスクトップエクスポートや再生フローに影響する変更の場合は、編集、保存、プレビュー、エクスポートの各パスも手動で確認してください。

## ライセンス

このプロジェクトは MIT License のもとでオープンソースとして公開されています。商用利用を含め、本プロジェクトのコピーの使用、複製、変更、結合、公開、配布、サブライセンス、販売を自由に行えます。ただし、すべてのコピーまたは主要部分に元の著作権表示とライセンス本文を保持する必要があります。
