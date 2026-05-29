# OpenFMV Development Guide

OpenFMV is a local-first visual non-linear storytelling editor. The current codebase is a Next.js + Electron desktop app that stores projects and imported assets locally.

## Project Scope

- Framework: Next.js 14 App Router, TypeScript, React, React Flow
- Desktop shell: Electron
- State: Zustand and local browser storage
- Persistence: local OpenFMV project JSON files and local asset copies
- Authentication: none
- Database: none
- Cloud storage: none

Do not add account, user sync, or hosted backend code unless the user explicitly asks for those features.

## Commands

```bash
npm run dev
npm run desktop
npm run desktop:dev
npm run desktop:standalone
npm run build
npm run package:desktop
npm run lint
npm run test:run
```

Run a single test file:

```bash
npx vitest path/to/test.test.ts
```

Run a single named test:

```bash
npx vitest path/to/test.test.ts -t "test name"
```

## TypeScript

- Keep TypeScript strict mode compatible.
- Use the `@/*` path alias for app-root imports where the surrounding code already does.
- Shared types live in `app/_types/index.ts`.
- Interfaces and types use PascalCase, for example `BranchRule`, `NodeType`, and `AppNode`.

## Imports

Group imports in this order, with a blank line between groups:

1. React and Next.js
2. Third-party libraries
3. Project modules

```typescript
import React, { memo, useEffect, useState } from 'react';
import Image from 'next/image';

import { NodeProps, Position } from '@xyflow/react';

import { CustomHandle } from './CustomHandle';
import { AppNode } from '../../_types';
import { useEditorStore } from '../../_store/useEditorStore';
```

## Comments

Do not add code comments unless the user explicitly requests them or a short comment is needed to clarify non-obvious logic. Type definition comments are acceptable when they explain complex fields.

## Components

Node components should be wrapped with `React.memo`:

```typescript
const StoryNode = ({ id, data }: NodeProps<AppNode>) => {
  return null;
};

export default memo(StoryNode);
```

Component file order:

1. Imports
2. Local type definitions
3. Component definition
4. Export

React Flow node rules:

- Do not hide handles with `display: none`.
- Use opacity or visibility transitions for handles.
- Add `nodrag` to inputs inside nodes.
- Add `nowheel` to textareas or scrollable form controls inside nodes.

```tsx
<div className="opacity-0 transition-opacity group-hover:opacity-100">
  <CustomHandle type="source" position={Position.Right} />
</div>

<input className="nodrag" />
<textarea className="nodrag nowheel" />
```

## Error Handling

Use `try`/`catch` for async user-facing operations and log useful failures.

```typescript
try {
  const result = await someAsyncOperation();
  if (result.error) {
    console.error('Operation failed:', result.error);
    alert('Operation failed: ' + result.error);
  }
} catch (error) {
  console.error('Operation failed:', error);
  alert('Operation failed');
}
```

## Styling

- Use Tailwind CSS.
- Custom colors are defined in `app/globals.css`.
- Use the `openfmv-*` color namespace where applicable.

```tsx
<div className="border-openfmv-border bg-openfmv-node text-openfmv-text" />
```

## Directory Map

```text
app/
  _components/          React components
    nodes/              React Flow node components
    editor/             Editor UI components
    player/             Player components
    local/              Local desktop UI components
    ui/                 Shared UI primitives
  _hooks/               React hooks
  _store/               Zustand stores
  _types/               TypeScript types
  _utils/               Utility functions
  api/                  Local Next.js API routes
  editor/               Editor page
  play/[id]/            Player page
  projects/             Project management page
  asset-studio/         Asset studio page
  assets/               Asset page
  lib/                  Core app utilities
  globals.css           Global styles and CSS variables
  layout.tsx            Root layout
  page.tsx              Home page
electron/
  main.js               Electron main process and IPC
  preload.js            Exposed preload API
  exporter.js           Exported game packager
  ai-settings.js        Local CLI AI settings and calls
```

## Environment

The current local-first client does not require environment variables.

## Notes

- `selectedNode` should stay separate from the full node array to avoid unnecessary `PropertyPanel` rerenders.
- Imported project assets should stay local and be copied into project/export folders when needed.
- File upload/import limits should stay aligned with desktop performance constraints.
