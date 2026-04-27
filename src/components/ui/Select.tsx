import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string | number;
  onChange: (e: { target: { value: string | number } }) => void;
  error?: string;
  className?: string;
  id?: string;
  openDirection?: 'up' | 'down';
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  className = '',
  id,
  openDirection = 'down',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: string | number) => {
    onChange({ target: { value: val } });
    setIsOpen(false);
  };

  return (
    <div className="w-full space-y-1.5" ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest ps-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <button
          id={id}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full h-[46px] bg-background border border-border rounded-xl px-4 text-sm text-start transition-all outline-none flex items-center justify-between
            focus:border-primary focus:ring-4 focus:ring-primary/10
            ${error ? 'border-error focus:border-error focus:ring-error/10' : ''}
            ${className}
          `}
        >
          <span className="truncate">{selectedOption?.label || 'Select...'}</span>
          <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div
            className={`
              absolute z-50 w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200
              ${openDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}
            `}
          >
            <div className="max-h-60 overflow-y-auto p-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`
                    w-full px-3 py-2 text-sm text-start rounded-lg transition-colors
                    ${value === opt.value ? 'bg-primary text-primary-foreground' : 'text-text-primary hover:bg-surface-hover'}
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-[10px] font-bold text-error ps-1 animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
};
