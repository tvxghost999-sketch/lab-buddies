'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'yellow' | 'orange' | 'blue' | 'green' | 'purple' | 'red' | 'glass' | 'glow'
    // Legacy variants for backwards compatibility
    | 'white' | 'cream';
  hasShadow?: boolean;
  shadowSize?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  hasShadow = false,
  shadowSize = 'md',
  className = '',
  ...props
}) => {
  const bgStyles: Record<string, string> = {
    default: 'bg-white/[0.03] border border-white/[0.08] text-[#f4f4f5]',
    muted: 'bg-white/[0.02] border border-white/[0.06] text-[#a1a1aa]',
    glass: 'glass-card text-[#f4f4f5]',
    glow: 'glow-card text-[#f4f4f5]',
    yellow: 'bg-[#FFD600]/10 border border-[#FFD600]/20 text-[#FFD600]',
    orange: 'bg-[#FF6A00]/10 border border-[#FF6A00]/20 text-[#FF6A00]',
    blue: 'bg-[#4F7CFF]/10 border border-[#4F7CFF]/20 text-[#4F7CFF]',
    green: 'bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]',
    purple: 'bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6]',
    red: 'bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444]',
    // Legacy support
    white: 'bg-white/[0.04] border border-white/[0.08] text-[#f4f4f5]',
    cream: 'bg-white/[0.02] border border-white/[0.06] text-[#a1a1aa]',
  };

  const shadowStyles: Record<string, string> = {
    sm: 'shadow-[0_2px_8px_rgba(0,0,0,0.4)]',
    md: 'shadow-[0_4px_16px_rgba(0,0,0,0.5)]',
    lg: 'shadow-[0_8px_32px_rgba(0,0,0,0.6)]',
  };

  const shadow = hasShadow ? shadowStyles[shadowSize] : '';

  return (
    <div
      className={`rounded-2xl ${bgStyles[variant]} ${shadow} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
export default Card;
