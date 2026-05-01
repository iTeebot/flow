import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { getLanguageDirection } from '../../utils/layout';

export interface SearchableOption {
  label: string;
  value: string | number;
  description?: string | null;
  icon?: React.ReactNode;
}

interface SearchableSelectProps {
  label?: string;
  options: SearchableOption[];
  value: string | number | null;
  onChange: (value: any) => void;
  placeholder?: string;
  error?: string;
  loading?: boolean;
  disabled?: boolean;
  openDirection?: 'up' | 'down' | 'auto';
  className?: string;
  leftIcon?: React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  error,
  loading = false,
  disabled = false,
  openDirection = 'auto',
  className = '',
  leftIcon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [resolvedDirection, setResolvedDirection] = useState<'up' | 'down'>('down');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { language } = useUiStore();
  const dir = getLanguageDirection(language);
  const isRtl = dir === 'rtl';

  const selectedOption = options.find(opt => opt.value === value);

  // Position the dropdown portal relative to the trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = Math.min(options.length * 44 + 56, 320);

    let direction: 'up' | 'down' = openDirection === 'auto'
      ? (spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? 'up' : 'down')
      : (openDirection as 'up' | 'down');

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

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (opt.description && opt.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 100);

  const handleToggle = () => {
    if (disabled) return;
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) {
      setSearchTerm("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSelect = (option: SearchableOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const dropdown = isOpen ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      dir={dir}
      className={`bg-card border border-border rounded-xl shadow-2xl shadow-black/20 overflow-hidden animate-in ${resolvedDirection === 'up' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'} fade-in duration-150`}
    >
      {/* Search input */}
      <div className="p-2 border-b border-border">
        <input
          ref={inputRef}
          type="text"
          className={`w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-text-muted/30 ${isRtl ? 'text-right' : 'text-left'}`}
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
            if (e.key === 'Enter' && filteredOptions.length > 0) {
              handleSelect(filteredOptions[0]);
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Options list */}
      <div className="max-h-[240px] overflow-y-auto p-1 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-text-muted">Loading...</span>
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-text-muted/50 font-medium">No results found</p>
          </div>
        ) : (
          filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option)}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all
                ${isRtl ? 'flex-row-reverse text-right' : 'flex-row text-left'}
                ${option.value === value
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-text-primary hover:bg-surface-hover'
                }
              `}
            >
              <div className={`flex items-center gap-2.5 truncate min-w-0 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
                {option.icon && <span className="shrink-0 text-text-muted/60">{option.icon}</span>}
                <div className={`flex flex-col min-w-0 ${isRtl ? 'items-end' : 'items-start'}`}>
                  <span className="truncate text-sm">{option.label}</span>
                  {option.description && (
                    <span className="text-[10px] text-text-muted/50 truncate font-medium">{option.description}</span>
                  )}
                </div>
              </div>
              {option.value === value && <Check className={`h-3.5 w-3.5 shrink-0 text-primary ${isRtl ? 'mr-2' : 'ml-2'}`} />}
            </button>
          ))
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="w-full space-y-1.5" dir={dir}>
      {label && (
        <label className={`block text-[10px] font-black text-text-muted uppercase tracking-widest ${isRtl ? 'pe-1' : 'ps-1'}`}>
          {label}
        </label>
      )}

      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`
            w-full h-[46px] flex items-center justify-between bg-background border rounded-xl px-4 text-sm transition-all outline-none
            ${isRtl ? 'flex-row-reverse text-right' : 'flex-row text-left'}
            ${error
              ? 'border-2 border-error ring-4 ring-error/20'
              : isOpen
                ? 'border-primary ring-4 ring-primary/10'
                : 'border-border hover:border-border/80'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
          `}
        >
          <div className={`flex items-center gap-2 truncate ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
            {leftIcon && <span className="text-text-muted/40 shrink-0">{leftIcon}</span>}
            {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
            <span className={selectedOption ? 'text-text-primary font-medium' : 'text-text-muted/40'}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 text-text-muted/50 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {dropdown}

      {error && (
        <p className={`text-[10px] font-bold text-error animate-in slide-in-from-top-1 duration-200 ${isRtl ? 'pe-1' : 'ps-1'}`}>
          {error}
        </p>
      )}
    </div>
  );
};
