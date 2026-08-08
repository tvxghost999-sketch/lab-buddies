'use client';

import React, { useState, useEffect, useRef } from 'react';

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, leftIcon, rightIcon, className = '', ...props }, ref) => {
    const activeLeftIcon = leftIcon || icon;
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative w-full flex items-center">
          {activeLeftIcon && (
            <span className="absolute left-3.5 flex items-center pointer-events-none text-white/40 z-10">
              {activeLeftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={`neo-input text-sm ${activeLeftIcon ? 'has-icon-left' : ''} ${rightIcon ? 'has-icon-right' : ''} ${error ? 'border-[#EF4444]/50 focus:border-[#EF4444]/70' : ''} ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 flex items-center text-white/40 z-10">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <span className="text-xs text-[#EF4444]">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`neo-input text-sm min-h-[100px] resize-none ${error ? 'border-[#EF4444]/50' : ''} ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-[#EF4444]">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string | number; label: string }[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className = '', ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const localRef = useRef<HTMLSelectElement>(null);
    const activeRef = (ref || localRef) as React.RefObject<HTMLSelectElement>;

    const selectedOption = options.find((opt) => opt.value.toString() === props.value?.toString()) || options[0];

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen]);

    const handleSelect = (val: string | number) => {
      if (activeRef.current) {
        activeRef.current.value = val.toString();
        const event = new Event('change', { bubbles: true });
        activeRef.current.dispatchEvent(event);
        if (props.onChange) {
          props.onChange({ target: activeRef.current, currentTarget: activeRef.current } as any);
        }
      }
      setIsOpen(false);
    };

    return (
      <div ref={containerRef} className="flex flex-col gap-1.5 w-full relative select-none">
        {label && (
          <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">
            {label}
          </label>
        )}

        <select ref={activeRef} style={{ display: 'none' }} value={props.value} onChange={props.onChange} {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`neo-input text-sm w-full cursor-pointer pr-10 text-left flex items-center justify-between ${
              error ? 'border-[#EF4444]/50' : ''
            } ${className}`}
          >
            <span className="truncate text-[#f4f4f5]">{selectedOption?.label || 'Select option'}</span>
            <span className={`text-[#71717a] text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {isOpen && (
            <div className="absolute left-0 right-0 mt-1.5 z-50 bg-[#0f0f10] border border-white/[0.1] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden max-h-40 overflow-y-auto">
              <div className="flex flex-col py-1">
                {options.map((opt) => {
                  const isSelected = opt.value.toString() === props.value?.toString();
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-[#FFD600]/15 text-[#FFD600]'
                          : 'text-[#f4f4f5] hover:bg-white/[0.06]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {error && <span className="text-xs text-[#EF4444]">{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// Switch / Toggle Component
interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  checked,
  onCheckedChange,
  className = '',
  ...props
}) => {
  return (
    <label className={`flex items-center justify-between gap-4 cursor-pointer select-none ${className}`}>
      {label && (
        <span className="text-sm font-medium text-[#a1a1aa]">
          {label}
        </span>
      )}
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="sr-only"
          {...props}
        />
        {/* Track */}
        <div
          className={`w-12 h-6 rounded-full transition-all duration-200 border ${
            checked
              ? 'bg-[#FFD600]/20 border-[#FFD600]/40'
              : 'bg-white/[0.06] border-white/[0.1]'
          }`}
        />
        {/* Thumb */}
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-200 ${
            checked
              ? 'transform translate-x-6 bg-[#FFD600]'
              : 'bg-white/40'
          }`}
        />
      </div>
    </label>
  );
};
