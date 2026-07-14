import React from 'react';
import { useUiStore } from '../../store/uiStore';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  type,
  value,
  onChange,
  onBlur,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const { language } = useUiStore();
  const isUrdu = language === 'ur';

  const isNumber = type === 'number';
  const [buffer, setBuffer] = React.useState<string | null>(null);
  const displayValue = isNumber ? (buffer ?? (value === 0 || value == null ? '' : String(value))) : value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (isNumber) setBuffer(e.target.value);   // remember the literal text
  onChange?.(e);                             // still call the parent's onChange
  };  

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  if (isNumber) setBuffer(null);             // done typing → show clean number
  onBlur?.(e);
};
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={`block ${isUrdu ? "text-[9px]" : "text-[10px]"} font-black text-text-muted uppercase tracking-widest ps-1`}
        >
          {label}
        </label>
      )}
      <div className="flex items-center gap-3.5 group">
        {leftIcon && (
          <div className="flex-shrink-0 text-text-muted group-focus-within:text-primary transition-colors">
            {leftIcon}
          </div>
        )}
        <div className="relative flex-1">
          <input
            id={inputId}
            type= {type}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
          className={`
            w-full h-[46px] bg-background border rounded-xl py-3 ${isUrdu ? "text-xs" : "text-sm"} transition-all outline-none
            focus:ring-4
            placeholder:text-text-muted/40
            ${leftIcon ? 'ps-12' : 'ps-4'}
            ${rightIcon ? 'pe-12' : 'pe-4'}
            ${error 
              ? 'border-2 border-error focus:border-error ring-4 ring-error/20' 
              : 'border-border focus:border-primary focus:ring-primary/10'
            }
            ${className}
          `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute end-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
      </div>
      {error ? (
        <p className="text-[10px] font-bold text-error ps-1 animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-[10px] text-text-muted ps-1">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
