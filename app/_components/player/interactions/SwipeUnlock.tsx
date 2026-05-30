'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Lock, Unlock, ChevronRight } from 'lucide-react';

interface SwipeUnlockProps {
  onUnlock: () => void;
  label?: string;
  isSubmitting?: boolean;
}

export const SwipeUnlock: React.FC<SwipeUnlockProps> = ({
  onUnlock,
  label = '滑动解锁',
  isSubmitting = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const THRESHOLD = 0.95;

  const handleStart = useCallback((clientX: number) => {
    if (isSubmitting || isUnlocked) return;
    setIsDragging(true);
    startXRef.current = clientX;
    currentXRef.current = clientX;
  }, [isSubmitting, isUnlocked]);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    
    currentXRef.current = clientX;
    const containerWidth = containerRef.current.offsetWidth;
    const handleWidth = 56;
    const maxDrag = containerWidth - handleWidth - 8;
    
    const deltaX = clientX - startXRef.current;
    const newProgress = Math.max(0, Math.min(1, deltaX / maxDrag));
    
    setProgress(newProgress);
  }, [isDragging]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (progress >= THRESHOLD) {
      setIsUnlocked(true);
      setProgress(1);
      onUnlock();
    } else {
      setProgress(0);
    }
  }, [isDragging, progress, onUnlock]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const onMouseUp = () => {
    handleEnd();
  };

  const onMouseLeave = () => {
    if (isDragging) {
      handleEnd();
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const onTouchEnd = () => {
    handleEnd();
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => handleMove(e.clientX);
      const handleGlobalMouseUp = () => handleEnd();
      
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, handleMove, handleEnd]);

  const containerWidth = containerRef.current?.offsetWidth || 300;
  const handleWidth = 56;
  const maxDrag = containerWidth - handleWidth - 8;
  const translateX = progress * maxDrag;

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        ref={containerRef}
        className={`
          relative h-16 rounded-full overflow-hidden
          ${isUnlocked 
            ? 'bg-green-500/20 border-2 border-green-500/50' 
            : 'bg-white/5 border-2 border-white/10 hover:border-white/20'
          }
          backdrop-blur-xl
          transition-all duration-300
          select-none
        `}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div 
          className={`
            absolute inset-y-0 left-0 rounded-full
            transition-all duration-150
            ${isUnlocked 
              ? 'bg-green-500/30' 
              : 'bg-gradient-to-r from-openfmv-accent/30 to-openfmv-accent/10'
            }
          `}
          style={{ width: `${Math.max(progress * 100, 5)}%` }}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`
            text-sm font-medium tracking-wide
            transition-all duration-300
            ${isUnlocked 
              ? 'text-green-400 opacity-100' 
              : progress > 0.1 
                ? 'text-white/30 opacity-0' 
                : 'text-white/60 opacity-100'
            }
          `}>
            {label}
          </span>
        </div>

        <div
          className={`
            absolute top-1 bottom-1 w-14 rounded-full
            flex items-center justify-center
            cursor-grab active:cursor-grabbing
            transition-all duration-150
            ${isUnlocked 
              ? 'bg-green-500 shadow-lg shadow-green-500/30' 
              : isDragging 
                ? 'bg-openfmv-accent shadow-lg shadow-openfmv-accent/30 scale-105'
                : 'bg-white/20 hover:bg-white/30'
            }
            ${isSubmitting ? 'pointer-events-none' : ''}
          `}
          style={{ 
            transform: `translateX(${translateX}px)`,
            left: '4px'
          }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          {isUnlocked ? (
            <Unlock size={20} className="text-white" />
          ) : (
            <ChevronRight 
              size={24} 
              className={`
                text-white transition-transform duration-150
                ${isDragging ? 'translate-x-0.5' : ''}
              `} 
            />
          )}
        </div>
      </div>

      {!isUnlocked && (
        <div className="text-center mt-3 text-xs text-white/40">
          {label}
        </div>
      )}
    </div>
  );
};

export default SwipeUnlock;
