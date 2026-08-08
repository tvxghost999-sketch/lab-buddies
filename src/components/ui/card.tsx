'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'white' | 'cream' | 'yellow' | 'orange' | 'blue' | 'green' | 'purple' | 'red';
  hasShadow?: boolean;
  shadowSize?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'white',
  hasShadow = true,
  shadowSize = 'md',
  className = '',
  ...props
}) => {
  const bgStyles = {
    white: 'bg-white text-neo-dark',
    cream: 'bg-cream text-neo-dark',
    yellow: 'bg-neo-yellow text-neo-dark',
    orange: 'bg-neo-orange text-neo-dark',
    blue: 'bg-neo-blue text-white',
    green: 'bg-neo-green text-neo-dark',
    purple: 'bg-neo-purple text-white',
    red: 'bg-neo-red text-white',
  };

  const shadowStyles = {
    sm: 'shadow-neo-sm',
    md: 'shadow-neo',
    lg: 'shadow-neo-lg',
  };

  const baseStyle = 'border-[3px] border-neo-dark rounded-[16px]';
  const shadow = hasShadow ? shadowStyles[shadowSize] : '';

  return (
    <div
      className={`${baseStyle} ${bgStyles[variant]} ${shadow} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
export default Card;
