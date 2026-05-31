'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from '@xyflow/react';

import { AppEdge, NodeType } from '@/app/_types';
import { useEditorStore } from '@/app/_store/useEditorStore';
import { nodeRegistry } from '@/app/_registry/nodeRegistry';
import { createEditorNode } from './canvas/nodeFactory';

const EDGE_STYLE = { strokeWidth: 2, stroke: 'rgba(255,255,255,0.52)' } as const;

export default function ComfyEdge(props: EdgeProps) {
  const t = useTranslations('editor');
  const {
    id,
    source,
    sourceHandleId,
    target,
    targetHandleId,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    selected,
  } = props;

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [selectingType, setSelectingType] = React.useState(false);
  const setEdges = useEditorStore((state) => state.setEdges);
  const addNode = useEditorStore((state) => state.addNode);
  const edgeCurveStyle = useEditorStore((state) => state.edgeCurveStyle);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setSelectingType(false);
        setMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [menuOpen]);

  const [edgePath, labelX, labelY] = React.useMemo(() => {
    if (edgeCurveStyle === 'bezier') {
      return getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
    }

    if (edgeCurveStyle === 'straight') {
      return getStraightPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
      });
    }

    return getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
  }, [edgeCurveStyle, sourcePosition, sourceX, sourceY, targetPosition, targetX, targetY]);

  const handleDeleteEdge = React.useCallback(() => {
    const currentEdges = useEditorStore.getState().edges;
    setEdges(currentEdges.filter((edge) => edge.id !== id));
    setSelectingType(false);
    setMenuOpen(false);
  }, [id, setEdges]);

  const handleInsertNode = React.useCallback((nodeType: NodeType) => {
    const state = useEditorStore.getState();
    const currentEdge = state.edges.find((edge) => edge.id === id);
    if (!currentEdge) return;

    const newNode = {
      ...createEditorNode(nodeType, { x: labelX - 140, y: labelY - 56 }, state.nodes, {
        startLabel: t('startNode'),
        endLabel: t('endNode'),
        storyTitlePrefix: t('storyTitlePrefix'),
      }),
      style: { width: 280 },
    };

    const remainingEdges = state.edges.filter((edge) => edge.id !== id);
    const leftEdge: AppEdge = {
      id: crypto.randomUUID(),
      type: 'comfy',
      source: source ?? currentEdge.source,
      sourceHandle: sourceHandleId ?? currentEdge.sourceHandle,
      target: newNode.id,
      targetHandle: null,
      animated: false,
      style: EDGE_STYLE,
    };

    const rightEdge: AppEdge = {
      id: crypto.randomUUID(),
      type: 'comfy',
      source: newNode.id,
      sourceHandle: null,
      target: target ?? currentEdge.target,
      targetHandle: targetHandleId ?? currentEdge.targetHandle,
      animated: false,
      style: EDGE_STYLE,
    };

    addNode(newNode);
    setEdges([...remainingEdges, leftEdge, rightEdge]);
    setSelectingType(false);
    setMenuOpen(false);
  }, [
    addNode,
    id,
    labelX,
    labelY,
    setEdges,
    source,
    sourceHandleId,
    target,
    targetHandleId,
    t,
  ]);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={selected ? { ...EDGE_STYLE, stroke: '#f97316', strokeWidth: 3 } : EDGE_STYLE}
      />

      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(event) => {
          event.stopPropagation();
          setSelectingType(false);
          setMenuOpen((prev) => !prev);
        }}
      />

      <EdgeLabelRenderer>
        {(hovered || menuOpen || selected) && (
          <div
            ref={menuRef}
            className="nodrag nopan absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {!menuOpen ? (
              <button
                type="button"
                className="h-6 w-6 rounded-full border border-white/20 bg-white/[0.12] text-xs text-white shadow-sm backdrop-blur-3xl hover:border-orange-300/60 hover:bg-openfmv-accent"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectingType(false);
                  setMenuOpen(true);
                }}
                aria-label="Open edge menu"
              >
                +
              </button>
            ) : (
              <div className="relative min-w-[132px] rounded-[20px] border border-white/15 bg-white/[0.10] p-1.5 text-xs text-openfmv-text shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-3xl">
                <button
                  type="button"
                  className="block w-full rounded-2xl px-3 py-2 text-left hover:bg-white/[0.08]"
                  onMouseEnter={() => setSelectingType(true)}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectingType(true);
                  }}
                >
                  {t('addNode')}
                </button>
                <button
                  type="button"
                  className="block w-full rounded-2xl px-3 py-2 text-left text-red-300 hover:bg-white/[0.08]"
                  onMouseEnter={() => setSelectingType(false)}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteEdge();
                  }}
                >
                  {t('delete')}
                </button>

                {selectingType && (
                  <div className="absolute left-full top-0 ml-2 min-w-[150px] rounded-[20px] border border-white/15 bg-white/[0.10] p-1.5 text-xs text-openfmv-text shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-3xl">
                    {nodeRegistry.getByPlacement('edgeMenu').map((definition) => (
                      <button
                        key={definition.type}
                        type="button"
                        className="block w-full rounded-2xl px-3 py-2 text-left hover:bg-white/[0.08]"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleInsertNode(definition.type);
                        }}
                      >
                        {t(`nodeTypes.${definition.type}.name`)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

