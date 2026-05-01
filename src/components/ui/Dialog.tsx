import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Portal } from './Portal';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
  children,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        <div className="p-6">
          <div className="flex items-start gap-4">
            {variant === 'danger' && (
              <div className="p-3 rounded-xl bg-error/10 text-error shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
            )}
            <div className="flex-1 space-y-1">
              <h3 className="text-xl font-black text-text-primary tracking-tight">
                {title}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {description}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {children && <div className="mt-6">{children}</div>}
        </div>

        <div className="px-6 py-4 bg-surface-hover/50 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
            className="text-[10px] sm:text-xs font-black uppercase tracking-widest order-2 sm:order-1"
          >
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
            className="text-[10px] sm:text-xs font-black uppercase tracking-widest order-1 sm:order-2"
          >
            {confirmText}
          </Button>
        </div>
        </div>
      </div>
    </Portal>
  );
};
