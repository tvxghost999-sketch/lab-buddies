'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'yellow' | 'orange' | 'blue' | 'green' | 'purple' | 'red' | 'white' | 'dark' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'white',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyle = 'neo-btn font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#FFD600]/30 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]';

  const variantStyles = {
    yellow: 'bg-[#FFD600] text-[#050608] hover:bg-[#FFC000] font-semibold',
    orange: 'bg-[#FF6A00] text-white hover:bg-[#e55f00]',
    blue: 'bg-[#4F7CFF] text-white hover:bg-[#3d6aee]',
    green: 'bg-[#22C55E] text-[#050608] hover:bg-[#1aad52]',
    purple: 'bg-[#8B5CF6] text-white hover:bg-[#7a4fe4]',
    red: 'bg-[#EF4444] text-white hover:bg-[#dc2626]',
    white: 'bg-white/10 text-[#f4f4f5] border border-white/15 hover:bg-white/15 backdrop-blur-sm',
    dark: 'bg-[#0f0f10] text-[#f4f4f5] border border-white/10 hover:bg-[#1a1a1b]',
    ghost: 'bg-transparent text-[#f4f4f5] hover:bg-white/8',
    outline: 'bg-transparent text-[#f4f4f5] border border-white/15 hover:bg-white/6 hover:border-white/25',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-xl',
    lg: 'px-7 py-3.5 text-base rounded-xl',
  };

  return (
    <button
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
export default Button;
