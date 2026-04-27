import React from 'react';

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
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[10px] font-black text-text-muted uppercase tracking-widest ps-1"
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
          className={`
            w-full h-[46px] bg-background border border-border rounded-xl py-3 text-sm transition-all outline-none
            focus:border-primary focus:ring-4 focus:ring-primary/10
            placeholder:text-text-muted/40
            ${leftIcon ? 'ps-12' : 'ps-4'}
            ${rightIcon ? 'pe-12' : 'pe-4'}
            ${error ? 'border-error focus:border-error focus:ring-error/10' : ''}
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
