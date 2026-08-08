'use client';

import React, { useState, useEffect, useRef } from 'react';

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="text-sm font-black uppercase tracking-wider text-neo-dark">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`neo-input font-sans text-sm focus:shadow-neo-sm ${error ? 'border-neo-red' : 'border-neo-dark'} ${className}`}
          {...props}
        />
        {error && <span className="text-xs font-black text-neo-red">{error}</span>}
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
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="text-sm font-black uppercase tracking-wider text-neo-dark">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`neo-input font-sans text-sm focus:shadow-neo-sm min-h-[100px] ${error ? 'border-neo-red' : 'border-neo-dark'} ${className}`}
          {...props}
        />
        {error && <span className="text-xs font-black text-neo-red">{error}</span>}
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

    // Find the currently selected label
    const selectedOption = options.find((opt) => opt.value.toString() === props.value?.toString()) || options[0];

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', handleOutsideClick);
      }
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }, [isOpen]);

    const handleSelect = (val: string | number) => {
      if (activeRef.current) {
        activeRef.current.value = val.toString();
        // Dispatch synthetic event for full input listeners/react-hook-form bindings
        const event = new Event('change', { bubbles: true });
        activeRef.current.dispatchEvent(event);

        if (props.onChange) {
          props.onChange({
            target: activeRef.current,
            currentTarget: activeRef.current,
          } as any);
        }
      }
      setIsOpen(false);
    };

    return (
      <div ref={containerRef} className="flex flex-col gap-1 w-full relative select-none">
        {label && (
          <label className="text-sm font-black uppercase tracking-wider text-neo-dark">
            {label}
          </label>
        )}
        
        {/* Hidden native select for standard HTML/React forms support */}
        <select
          ref={activeRef}
          style={{ display: 'none' }}
          value={props.value}
          onChange={props.onChange}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`neo-input font-sans text-sm focus:shadow-neo-sm w-full cursor-pointer pr-10 text-left flex items-center justify-between border-[3px] border-neo-dark rounded-[10px] bg-white px-4 py-2.5 font-bold text-neo-dark shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo transition-all ${
              error ? 'border-neo-red' : 'border-neo-dark'
            } ${className}`}
          >
            <span className="truncate">{selectedOption?.label || 'Select option'}</span>
            <span className={`text-neo-dark text-[10px] font-black transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {/* Custom Dropdown Options list */}
          {isOpen && (
            <div className="absolute left-0 right-0 mt-2 z-50 bg-white border-[3px] border-neo-dark rounded-[10px] shadow-neo overflow-hidden max-h-32 overflow-y-auto">
              <div className="flex flex-col">
                {options.map((opt) => {
                  const isSelected = opt.value.toString() === props.value?.toString();
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full px-4 py-2.5 text-left text-xs sm:text-sm font-black transition-colors ${
                        isSelected 
                          ? 'bg-neo-yellow text-neo-dark border-b-[2px] border-neo-dark' 
                          : 'hover:bg-neo-yellow/20 text-neo-dark border-b-[2px] border-neo-dark/10 last:border-b-0'
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

        {error && <span className="text-xs font-black text-neo-red">{error}</span>}
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
        <span className="text-sm font-bold text-neo-dark uppercase tracking-wider">
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
          className={`w-14 h-8 neo-border rounded-full transition-all duration-200 ${
            checked ? 'bg-neo-yellow' : 'bg-white'
          }`}
        ></div>
        {/* Thumb */}
        <div
          className={`absolute top-1 left-1 w-6 h-6 bg-neo-dark rounded-full border-2 border-neo-dark transition-all duration-200 ${
            checked ? 'transform translate-x-6 bg-white' : 'bg-neo-dark'
          }`}
        ></div>
      </div>
    </label>
  );
};
