'use client';

import { Plus, Sparkles, Video } from 'lucide-react';

import { NodeType } from '@/app/_types';
import { nodeRegistry } from '@/app/_registry/nodeRegistry';
import { Button } from '../../ui/button';

export type PendingConnectMenuState =
  | {
      kind: 'connect';
      x: number;
      y: number;
      nodeId: string;
      handleId: string | null;
      handleType: string | null;
    }
  | {
      kind: 'reconnect';
      x: number;
      y: number;
      edgeId: string;
      handleType: string;
    };

interface EmptyCanvasPromptProps {
  onAddNode: (type: NodeType) => void;
}

interface PendingConnectMenuProps {
  menu: PendingConnectMenuState;
  onCreateNode: (type: NodeType) => void;
  onCancel: () => void;
}

export function EmptyCanvasPrompt({ onAddNode }: EmptyCanvasPromptProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center p-6">
      <div className="pointer-events-auto w-full max-w-[420px] rounded-[28px] border border-white/14 bg-[#1e293b]/72 p-7 text-center shadow-[0_26px_90px_rgba(0,0,0,0.42)] backdrop-blur-3xl">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-orange-300/25 bg-orange-400/10 text-openfmv-accent shadow-[0_12px_36px_rgba(249,115,22,0.18)]">
          <Plus size={22} />
        </div>
        <h2 className="text-xl font-semibold text-openfmv-text">Start building</h2>
        <p className="mx-auto mt-2 max-w-[300px] text-sm leading-6 text-openfmv-sub">Add a starting node, then connect story and interaction nodes.</p>
        <div className="mt-6">
          <Button type="button" onClick={() => onAddNode('start')} size="pill" className="h-12 bg-openfmv-accent px-7 text-base text-white shadow-[0_14px_40px_rgba(249,115,22,0.22)] hover:bg-openfmv-accent-hover">
            <Plus size={16} />
            Add start node
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" variant="glass" size="sm" onClick={() => onAddNode('story')}>
            <Video size={15} />
            Story node
          </Button>
          <Button type="button" variant="glass" size="sm" onClick={() => onAddNode('interaction')}>
            <Sparkles size={15} />
            Interaction node
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FileDropOverlay() {
  return (
    <div className="pointer-events-none absolute inset-6 z-50 grid place-items-center rounded-[34px] border border-dashed border-orange-300/55 bg-orange-400/[0.08] shadow-[inset_0_0_80px_rgba(249,115,22,0.12)] backdrop-blur-sm">
      <div className="rounded-[28px] border border-white/15 bg-black/45 px-7 py-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-3xl">
        <div className="text-base font-semibold text-white">Drop files to import assets</div>
        <div className="mt-2 text-sm text-openfmv-muted">Images, videos, and text can be bound to nodes; audio is saved to the asset library.</div>
      </div>
    </div>
  );
}

export function PendingConnectMenu({ menu, onCreateNode, onCancel }: PendingConnectMenuProps) {
  return (
    <div
      className="fixed z-50 min-w-[160px] rounded-2xl border border-white/15 bg-white/[0.10] p-1.5 text-xs text-openfmv-text shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-3xl"
      style={{ left: menu.x + 8, top: menu.y + 8 }}
    >
      {nodeRegistry.getByPlacement('pendingConnect').map((definition) => (
        <Button
          key={definition.type}
          type="button"
          variant="ghost"
          className="block h-auto w-full justify-start rounded-xl px-3 py-2 text-left hover:bg-white/[0.08]"
          onClick={() => onCreateNode(definition.type)}
        >
          {definition.displayName}
        </Button>
      ))}
      <Button type="button" variant="ghost" className="mt-1 block h-auto w-full justify-start rounded-xl px-3 py-2 text-left text-openfmv-sub hover:bg-white/[0.08]" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
