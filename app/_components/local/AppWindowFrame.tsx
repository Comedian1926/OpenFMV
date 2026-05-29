'use client';

import React, { PointerEvent, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';

import AppNavigation from './AppNavigation';
import InteractionDesignView from './InteractionDesignView';
import OpenFMVAiSettingsCenter from './OpenFMVAiSettingsCenter';

type ResizeDirection = 'top' | 'right' | 'bottom' | 'left' | 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';

export default function AppWindowFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatFloating, setChatFloating] = useState(false);
  const [chatPosition, setChatPosition] = useState({ x: 620, y: 16 });
  const [chatSize, setChatSize] = useState({ width: 420, height: 760 });
  const dragStateRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const resizeStateRef = useRef<{ pointerId: number; direction: ResizeDirection; startX: number; startY: number; originX: number; originY: number; originWidth: number; originHeight: number } | null>(null);

  const toggleChat = () => {
    setShowChat((current) => !current);
  };

  const closeChat = () => {
    setShowChat(false);
    setChatFloating(false);
  };

  const toggleChatFloating = () => {
    setChatFloating((current) => !current);
  };

  const startChatDrag = (event: PointerEvent<HTMLElement>) => {
    if (!chatFloating || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-chat-resize-handle]')) return;
    if (!target.closest('[data-chat-drag-handle]') || target.closest('button')) return;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: chatPosition.x,
      originY: chatPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startChatResize = (event: PointerEvent<HTMLElement>) => {
    if (!chatFloating || event.button !== 0) return;
    const target = event.target as HTMLElement;
    const handle = target.closest('[data-chat-resize-handle]') as HTMLElement | null;
    const direction = handle?.dataset.chatResizeHandle as ResizeDirection | undefined;
    if (!direction) return;
    resizeStateRef.current = {
      pointerId: event.pointerId,
      direction,
      startX: event.clientX,
      startY: event.clientY,
      originX: chatPosition.x,
      originY: chatPosition.y,
      originWidth: chatSize.width,
      originHeight: chatSize.height,
    };
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveChatDrag = (event: PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    setChatPosition({
      x: Math.max(8, dragState.originX + event.clientX - dragState.startX),
      y: Math.max(8, dragState.originY + event.clientY - dragState.startY),
    });
  };

  const moveChatResize = (event: PointerEvent<HTMLElement>) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState || resizeState.pointerId !== event.pointerId) return;
    const minWidth = 340;
    const minHeight = 520;
    const edgeInset = 8;
    const deltaX = event.clientX - resizeState.startX;
    const deltaY = event.clientY - resizeState.startY;
    const canResizeLeft = resizeState.direction.includes('left');
    const canResizeRight = resizeState.direction.includes('right');
    const canResizeTop = resizeState.direction.includes('top');
    const canResizeBottom = resizeState.direction.includes('bottom');
    let nextX = resizeState.originX;
    let nextY = resizeState.originY;
    let nextWidth = resizeState.originWidth;
    let nextHeight = resizeState.originHeight;

    if (canResizeRight) {
      nextWidth = resizeState.originWidth + deltaX;
    }
    if (canResizeLeft) {
      nextX = resizeState.originX + deltaX;
      nextWidth = resizeState.originWidth - deltaX;
      if (nextX < edgeInset) {
        nextWidth += nextX - edgeInset;
        nextX = edgeInset;
      }
    }
    if (canResizeBottom) {
      nextHeight = resizeState.originHeight + deltaY;
    }
    if (canResizeTop) {
      nextY = resizeState.originY + deltaY;
      nextHeight = resizeState.originHeight - deltaY;
      if (nextY < edgeInset) {
        nextHeight += nextY - edgeInset;
        nextY = edgeInset;
      }
    }

    nextWidth = Math.min(Math.max(minWidth, nextWidth), Math.max(minWidth, window.innerWidth - nextX - edgeInset));
    nextHeight = Math.min(Math.max(minHeight, nextHeight), Math.max(minHeight, window.innerHeight - nextY - edgeInset));
    if (canResizeLeft && nextWidth === minWidth) nextX = resizeState.originX + resizeState.originWidth - minWidth;
    if (canResizeTop && nextHeight === minHeight) nextY = resizeState.originY + resizeState.originHeight - minHeight;

    setChatPosition({ x: Math.max(edgeInset, nextX), y: Math.max(edgeInset, nextY) });
    setChatSize({ width: nextWidth, height: nextHeight });
  };

  const stopChatDrag = (event: PointerEvent<HTMLElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
    if (resizeStateRef.current?.pointerId === event.pointerId) {
      resizeStateRef.current = null;
    }
  };

  const chatResizeHandles = chatFloating ? (
    <>
      <div data-chat-resize-handle="top" className="absolute left-4 right-4 top-0 z-20 h-2 cursor-ns-resize" />
      <div data-chat-resize-handle="right" className="absolute bottom-4 right-0 top-4 z-20 w-2 cursor-ew-resize" />
      <div data-chat-resize-handle="bottom" className="absolute bottom-0 left-4 right-4 z-20 h-2 cursor-ns-resize" />
      <div data-chat-resize-handle="left" className="absolute bottom-4 left-0 top-4 z-20 w-2 cursor-ew-resize" />
      <div data-chat-resize-handle="top-left" className="absolute left-0 top-0 z-20 h-5 w-5 cursor-nwse-resize rounded-br-[10px]" />
      <div data-chat-resize-handle="top-right" className="absolute right-0 top-0 z-20 h-5 w-5 cursor-nesw-resize rounded-bl-[10px]" />
      <div data-chat-resize-handle="bottom-right" className="absolute bottom-0 right-0 z-20 h-5 w-5 cursor-nwse-resize rounded-tl-[10px] border-l border-t border-white/10 bg-white/[0.06]" />
      <div data-chat-resize-handle="bottom-left" className="absolute bottom-0 left-0 z-20 h-5 w-5 cursor-nesw-resize rounded-tr-[10px]" />
    </>
  ) : null;

  if (pathname?.startsWith('/asset-studio')) {
    return (
      <div className="relative h-[100dvh] overflow-hidden bg-[#111] text-openfmv-text">
        <AppNavigation chatOpen={showChat} onToggleChat={toggleChat} />
        <div className="h-[calc(100dvh-3.5rem)] overflow-hidden">{children}</div>
        {showChat && (
          <aside
            onPointerDown={startChatDrag}
            onPointerDownCapture={startChatResize}
            onPointerMove={moveChatDrag}
            onPointerMoveCapture={moveChatResize}
            onPointerUp={stopChatDrag}
            onPointerCancel={stopChatDrag}
            className={chatFloating ? 'absolute z-[130] h-[760px] max-h-[calc(100dvh-4.5rem)] w-[420px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[18px] border border-white/10 bg-[#111] shadow-[0_28px_110px_rgba(0,0,0,0.42)]' : 'absolute right-1 top-[3.75rem] z-[130] h-[calc(100dvh-4rem)] w-[420px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-l-[18px] border border-white/10 bg-[#111] shadow-[0_28px_110px_rgba(0,0,0,0.42)]'}
            style={chatFloating ? { left: chatPosition.x, top: chatPosition.y, width: chatSize.width, height: chatSize.height } : undefined}
          >
            <InteractionDesignView variant="panel" floating={chatFloating} onToggleFloating={toggleChatFloating} onClose={closeChat} />
            {chatResizeHandles}
          </aside>
        )}
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#181818] text-openfmv-text">
      <AppNavigation chatOpen={showChat} onToggleChat={toggleChat} />
      <div className="relative h-[calc(100dvh-3.5rem)] overflow-hidden">
        {children}
        <button type="button" onClick={() => setShowSettings(true)} className="absolute bottom-5 left-6 z-[120] flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.055] text-white/75 shadow-[0_12px_38px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition hover:bg-white/[0.09] hover:text-white" title="Settings">
          <Settings size={19} />
        </button>
        {showChat && (
          <aside
            onPointerDown={startChatDrag}
            onPointerDownCapture={startChatResize}
            onPointerMove={moveChatDrag}
            onPointerMoveCapture={moveChatResize}
            onPointerUp={stopChatDrag}
            onPointerCancel={stopChatDrag}
            className={chatFloating ? 'absolute z-[130] h-[760px] max-h-[calc(100%-1rem)] w-[420px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[18px] border border-white/10 bg-[#111] shadow-[0_28px_110px_rgba(0,0,0,0.42)]' : 'absolute right-1 top-2 z-[130] h-[calc(100%-0.5rem)] w-[420px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-l-[18px] border border-white/10 bg-[#111] shadow-[0_28px_110px_rgba(0,0,0,0.42)]'}
            style={chatFloating ? { left: chatPosition.x, top: chatPosition.y, width: chatSize.width, height: chatSize.height } : undefined}
          >
            <InteractionDesignView variant="panel" floating={chatFloating} onToggleFloating={toggleChatFloating} onClose={closeChat} />
            {chatResizeHandles}
          </aside>
        )}
        {showSettings && <OpenFMVAiSettingsCenter onClose={() => setShowSettings(false)} />}
      </div>
    </div>
  );
}
