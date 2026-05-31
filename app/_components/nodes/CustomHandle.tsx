import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Handle, HandleProps, useNodeId, useReactFlow } from '@xyflow/react';
import { ChevronRight } from 'lucide-react';

import { useEditorStore } from '../../_store/useEditorStore';
import { AppNode, NodeType } from '../../_types';
import { nodeRegistry } from '../../_registry/nodeRegistry';
import { createEditorNode } from '../editor/canvas/nodeFactory';

interface CustomHandleProps extends HandleProps {
  className?: string;
}

export const CustomHandle = ({ className, ...props }: CustomHandleProps) => {
  const t = useTranslations('editor');
  const isTarget = props.type === 'target';
  const nodeId = useNodeId();
  const { getNode, getNodes, getEdges } = useReactFlow();
  const { addNodeAndConnect } = useEditorStore();
  
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleAddNode = useCallback((type: NodeType) => {
    if (!nodeId) return;
    
    const sourceNode = getNode(nodeId);
    if (!sourceNode) return;

    const spacingX = 350;
    const newPosition = {
        x: sourceNode.position.x + spacingX,
        y: sourceNode.position.y
    };

    const newNode = createEditorNode(type, newPosition, getNodes() as unknown as AppNode[], {
      startLabel: t('startNode'),
      endLabel: t('endNode'),
      storyTitlePrefix: t('storyTitlePrefix'),
    });
    const enhancedData =
      type === 'interaction'
        ? { ...newNode.data, elseLabel: t('defaultPath') } as AppNode['data']
        : newNode.data;
    newNode.data = enhancedData;

    addNodeAndConnect(newNode, {
      source: nodeId,
      sourceHandle: props.id ?? null,
      target: newNode.id,
      targetHandle: null,
    });

    setShowMenu(false);
  }, [nodeId, getNode, addNodeAndConnect, props.id, getNodes, t]);

  const handleClick = (e: React.MouseEvent) => {
    if (isTarget) return;

    if (typeof props.isConnectable === 'number') {
      const edges = getEdges();
      const connectedEdges = edges.filter(
        edge => edge.source === nodeId && edge.sourceHandle === (props.id || null)
      );
      if (connectedEdges.length >= props.isConnectable) {
        return;
      }
    }
    
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  if (isTarget) {
      return (
        <Handle
          {...props}
          isConnectable={true}
          isConnectableEnd={true}
          className="!w-3 !h-3 !bg-transparent !border-none !min-w-0 !min-h-0"
        >
            <div className={`
                h-3.5 w-3.5 rounded-full border-2 border-white/24
                bg-[#1f1f1f] shadow-[0_0_0_3px_rgba(0,0,0,0.22)]
                transition-all cursor-crosshair hover:border-openfmv-accent hover:bg-openfmv-accent hover:scale-125
                ${className || ''}
            `.trim().replace(/\s+/g, ' ')} />
        </Handle>
      );
  }

  return (
    <div className="relative">
        <Handle
            {...props}
            onClick={handleClick}
            className="!w-6 !h-6 !bg-transparent !border-none !min-w-0 !min-h-0 flex items-center justify-center z-50"
        >
            <div className={`
                h-6 w-6 rounded-full border-2 border-white/24 bg-[#1f1f1f]
                flex items-center justify-center
                shadow-[0_0_0_3px_rgba(0,0,0,0.22)] hover:border-openfmv-accent hover:scale-110 transition-all cursor-pointer group
                ${className || ''}
            `.trim().replace(/\s+/g, ' ')}>
                <ChevronRight size={14} strokeWidth={3} className="text-openfmv-text-secondary group-hover:text-openfmv-accent ml-0.5 transition-colors" />
            </div>
        </Handle>

        {showMenu && (
            <div 
                ref={menuRef}
                className="absolute top-0 left-8 z-[100] bg-white/[0.12] backdrop-blur-3xl border border-white/15 rounded-[20px] shadow-[0_24px_80px_rgba(0,0,0,0.34)] p-1.5 flex flex-col gap-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-100"
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-2 py-1.5 text-[10px] font-medium text-openfmv-muted uppercase tracking-wider">
                    {t('addNextNode')}
                </div>
                
                {nodeRegistry.getByPlacement('quickAdd').map((definition) => {
                  const Icon = definition.icon;
                  return (
                    <button
                      key={definition.type}
                      onClick={() => handleAddNode(definition.type)}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm text-openfmv-text hover:bg-white/[0.08] hover:text-openfmv-accent rounded transition-colors text-left"
                    >
                      <Icon size={14} />
                      <span>{t(`nodeTypes.${definition.type}.name`)}</span>
                    </button>
                  );
                })}
            </div>
        )}
    </div>
  );
};

