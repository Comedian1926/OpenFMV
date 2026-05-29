import React from 'react';

interface HeaderProps {
  className?: string;
  children: React.ReactNode;
  position?: 'fixed' | 'absolute' | 'sticky' | 'relative' | 'static';
}

export function Header({ className = '', children, position = 'fixed' }: HeaderProps) {
  const positionClasses = position === 'static' ? '' : `${position} top-0 left-0 right-0`;
  return (
    <header className={`z-50 flex h-14 shrink-0 items-center justify-between border-b border-white/15 bg-white/[0.08] px-4 shadow-[0_16px_60px_rgba(0,0,0,0.22)] backdrop-blur-3xl ${positionClasses} ${className}`}>
      {children}
    </header>
  );
}
