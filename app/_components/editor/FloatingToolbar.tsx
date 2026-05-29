'use client';

import React, { useState } from 'react';
import { FolderOpen, LayoutList, MousePointer2, Plus, UserRound, X } from 'lucide-react';
import { NodeType } from '../../_types';
import { nodeRegistry } from '../../_registry/nodeRegistry';

interface FloatingToolbarProps {
  onAddNode: (type: NodeType) => void;
  onLayout: () => void;
  toolMode: 'hand' | 'select';
  onToolModeChange: (mode: 'hand' | 'select') => void;
  onOpenAssets: () => void;
}

export default function FloatingToolbar({ onAddNode, onLayout, toolMode, onToolModeChange, onOpenAssets }: FloatingToolbarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleAdd = (type: NodeType) => {
    onAddNode(type);
    setShowAddMenu(false);
  };

  return (
    <div className="absolute left-5 top-1/2 z-50 flex -translate-y-1/2 items-start gap-3">
      <div className="flex flex-col items-center rounded-full border border-white/10 bg-white/[0.08] p-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-3xl">
        <button onClick={() => setShowAddMenu(!showAddMenu)} className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${showAddMenu ? 'bg-white/[0.16] text-white' : 'bg-white text-[#111] hover:scale-105'}`} title="添加节点">
          {showAddMenu ? <X size={22} /> : <Plus size={24} />}
          <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-sky-400" />
        </button>
        <div className="my-2 h-px w-8 bg-white/10" />
        <button onClick={onOpenAssets} className="flex h-11 w-11 items-center justify-center rounded-full text-openfmv-sub transition hover:bg-white/[0.10] hover:text-white" title="素材库">
          <FolderOpen size={20} />
        </button>
        <button onClick={() => onToolModeChange(toolMode === 'hand' ? 'select' : 'hand')} className={`flex h-11 w-11 items-center justify-center rounded-full transition ${toolMode === 'select' ? 'bg-white/[0.12] text-white' : 'text-openfmv-sub hover:bg-white/[0.10] hover:text-white'}`} title="选择工具">
          <MousePointer2 size={20} />
        </button>
        <button onClick={onLayout} className="flex h-11 w-11 items-center justify-center rounded-full text-openfmv-sub transition hover:bg-white/[0.10] hover:text-white" title="自动整理">
          <LayoutList size={20} />
        </button>
        <div className="my-2 h-px w-8 bg-white/10" />
        <button className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/[0.08] text-openfmv-sub transition hover:bg-white/[0.12] hover:text-white" title="个人空间">
          <UserRound size={19} />
        </button>
      </div>

      {showAddMenu && (
        <div className="min-w-[286px] overflow-hidden rounded-[18px] border border-white/10 bg-[#1f2024]/92 p-3 text-openfmv-text shadow-[0_24px_90px_rgba(0,0,0,0.52)] backdrop-blur-3xl">
          <div className="border-b border-white/15 px-4 py-3">
            <div className="text-xs font-semibold text-openfmv-muted">添加节点</div>
          </div>

          <div className="flex flex-col gap-2 p-1 pt-3">
            {nodeRegistry.getByPlacement('toolbar').map((definition) => {
              const Icon = definition.icon;
              return (
                <button key={definition.type} onClick={() => handleAdd(definition.type)} className="group flex items-center gap-3 rounded-[15px] px-3 py-3 text-left transition-colors hover:bg-white/[0.075]">
                  <div className={`rounded-[12px] border border-white/10 p-2 transition-colors ${definition.iconColorClass} group-hover:border-white/20`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-openfmv-text group-hover:text-white">{definition.displayName}</div>
                    <div className="mt-0.5 truncate text-xs text-openfmv-muted group-hover:text-openfmv-sub">{definition.menuDescription}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


