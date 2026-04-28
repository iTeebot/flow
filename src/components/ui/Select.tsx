import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useUiStore } from '../../store/uiStore';
import { ChevronDown, Check } from 'lucide-react';

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
  openDirection?: 'up' | 'down' | 'auto';
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  className = '',
  id,
  openDirection = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [resolvedDirection, setResolvedDirection] = useState<'up' | 'down'>('down');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { language } = useUiStore();
  const isUrdu = language === 'ur';
  const selectedOption = options.find((opt) => opt.value === value);

  // Position the dropdown portal relative to the trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = Math.min(options.length * 40 + 8, 260);

    let direction = openDirection === 'auto'
      ? (spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? 'up' : 'down')
      : openDirection;

    // Fallback if neither direction has enough space
    if (direction === 'up' && spaceAbove < dropdownHeight && spaceBelow > spaceAbove) {
      direction = 'down';
    }

    setResolvedDirection(direction);
    setDropdownStyle({
      position: 'fixed',
      width: rect.width,
      left: rect.left,
      ...(direction === 'up'
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
      zIndex: 9999,
    });
  }, [openDirection, options.length]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
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

  const dropdown = isOpen ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className={`bg-card border border-border rounded-xl shadow-2xl shadow-black/20 overflow-hidden animate-in ${resolvedDirection === 'up' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'} fade-in duration-150`}
    >
      <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            className={`
              w-full px-3 py-2.5 ${isUrdu ? "text-xs" : "text-sm"} text-start rounded-lg transition-all flex items-center justify-between
              ${value === opt.value
                ? 'bg-primary/10 text-primary font-bold'
                : 'text-text-primary hover:bg-surface-hover'
              }
            `}
          >
            <span className="truncate">{opt.label}</span>
            {value === opt.value && <Check className="h-3.5 w-3.5 shrink-0 ml-2" />}
          </button>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className={`block ${isUrdu ? "text-[9px]" : "text-[10px]"} font-black text-text-muted uppercase tracking-widest ps-1`}>
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full h-[46px] bg-background border rounded-xl px-4 ${isUrdu ? "text-xs" : "text-sm"} text-start transition-all outline-none flex items-center justify-between
            ${isOpen
              ? 'border-primary ring-4 ring-primary/10'
              : 'border-border hover:border-border/80'
            }
            ${error ? 'border-error focus:border-error focus:ring-error/10' : ''}
            ${className}
          `}
        >
          <span className={`truncate ${selectedOption ? 'text-text-primary' : 'text-text-muted/40'}`}>
            {selectedOption?.label || 'Select...'}
          </span>
          <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {dropdown}
      {error && (
        <p className="text-[10px] font-bold text-error ps-1 animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
};
