import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
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
  openDirection?: 'up' | 'down';
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
  openDirection = 'down',
  className = '',
  leftIcon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { language } = useUiStore();
  const dir = getLanguageDirection(language);
  const isRtl = dir === 'rtl';

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm("");
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleSelect = (option: SearchableOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div className="w-full space-y-1.5" ref={containerRef} dir={dir}>
      {label && (
        <label className={`block text-[10px] font-black text-text-muted uppercase tracking-widest ${isRtl ? 'pe-1' : 'ps-1'}`}>
          {label}
        </label>
      )}

      <div className="relative group">
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`
            w-full h-[46px] flex items-center justify-between bg-background border rounded-xl px-4 text-sm transition-all outline-none
            ${isRtl ? 'flex-row-reverse text-right' : 'flex-row text-left'}
            ${error 
              ? 'border-2 border-error focus:border-error ring-4 ring-error/20' 
              : isOpen 
                ? 'border-primary ring-4 ring-primary/10' 
                : 'border-border'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
          `}
        >
          <div className={`flex items-center gap-2 truncate ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
            {leftIcon && <span className="text-text-muted/40 shrink-0">{leftIcon}</span>}
            {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
            <span className={selectedOption ? 'text-text-primary' : 'text-text-muted/40'}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div
            className={`
              absolute z-[100] w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200
              ${openDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}
            `}
          >
            <div className="p-2 border-b border-border bg-surface/30">
              <div className="relative">
                <Search className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted ${isRtl ? 'right-3' : 'left-3'}`} />
                <input
                  ref={inputRef}
                  type="text"
                  className={`w-full bg-background border border-border rounded-lg py-2 text-xs outline-none focus:border-primary transition-all ${isRtl ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'}`}
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="max-h-[240px] overflow-y-auto p-1 custom-scrollbar">
              {loading ? (
                <div className="p-4 text-center text-xs text-text-muted">Loading options...</div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-muted">No results found</div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                      ${isRtl ? 'flex-row-reverse text-right' : 'flex-row text-left'}
                      ${option.value === value ? 'bg-primary/10 text-primary font-bold' : 'text-text-primary hover:bg-surface-hover'}
                    `}
                  >
                    <div className={`flex items-center gap-2 truncate ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
                      {option.icon && <span className="shrink-0">{option.icon}</span>}
                      <div className={`flex flex-col ${isRtl ? 'items-end' : 'items-start'}`}>
                        <span className="truncate">{option.label}</span>
                        {option.description && (
                          <span className="text-[10px] text-text-muted truncate">{option.description}</span>
                        )}
                      </div>
                    </div>
                    {option.value === value && <Check className={`h-4 w-4 shrink-0 ${isRtl ? 'mr-2' : 'ml-2'}`} />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className={`text-[10px] font-bold text-error animate-in slide-in-from-top-1 duration-200 ${isRtl ? 'pe-1' : 'ps-1'}`}>
          {error}
        </p>
      )}
    </div>
  );
};
