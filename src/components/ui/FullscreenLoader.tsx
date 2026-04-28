import React from 'react';
import { Database } from 'lucide-react';

interface FullscreenLoaderProps {
  isVisible: boolean;
  message?: string;
  subMessage?: string;
}

export const FullscreenLoader: React.FC<FullscreenLoaderProps> = ({ 
  isVisible, 
  message = "Processing...", 
  subMessage = "Please wait and do not close the app." 
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-surface border border-border shadow-2xl animate-in zoom-in-95 duration-500 max-w-sm w-full text-center relative overflow-hidden">
        {/* Shimmer effect background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
        
        <div className="relative">
          <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center relative z-10">
            <Database className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>
        
        <div className="space-y-2 relative z-10">
          <h3 className="text-xl font-black tracking-widest uppercase text-text-primary">
            {message}
          </h3>
          <p className="text-sm text-text-muted leading-relaxed max-w-[250px] mx-auto">
            {subMessage}
          </p>
        </div>
      </div>
    </div>
  );
};
