'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'yellow' | 'orange' | 'blue' | 'green' | 'purple' | 'red' | 'white' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'white',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyle = 'neo-btn';
  
  const variantStyles = {
    yellow: 'bg-neo-yellow text-neo-dark hover:bg-[#ffdf1a]',
    orange: 'bg-neo-orange text-neo-dark hover:bg-[#ff7b1a]',
    blue: 'bg-neo-blue text-white hover:bg-[#638dff]',
    green: 'bg-neo-green text-neo-dark hover:bg-[#33cc66]',
    purple: 'bg-neo-purple text-white hover:bg-[#9a6eff]',
    red: 'bg-neo-red text-white hover:bg-[#ff5555]',
    white: 'bg-white text-neo-dark hover:bg-cream',
    dark: 'bg-neo-dark text-white hover:bg-[#2b2b2b]',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-[6px] border-[2px]',
    md: 'px-5 py-2.5 text-sm rounded-[8px] border-[3px]',
    lg: 'px-8 py-4 text-base rounded-[10px] border-[3px]',
  };

  // Adjust active and shadow scaling according to size
  const shadowStyle = size === 'sm' 
    ? 'shadow-[2px_2px_0px_0px_#111111] hover:shadow-[3px_3px_0px_0px_#111111] hover:-translate-x-[1px] hover:-translate-y-[1px] active:shadow-[0px_0px_0px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px]'
    : 'shadow-[4px_4px_0px_0px_#111111] hover:shadow-[6px_6px_0px_0px_#111111] hover:-translate-x-[2px] hover:-translate-y-[2px] active:shadow-[1px_1px_0px_0px_#111111] active:translate-x-[3px] active:translate-y-[3px]';

  return (
    <button
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${shadowStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
export default Button;
