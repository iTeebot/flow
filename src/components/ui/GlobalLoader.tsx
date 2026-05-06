import React from 'react';
import { Zap } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';

export const GlobalLoader: React.FC = () => {
  const { isLoading, loadingMessage } = useUiStore();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/80 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-8 p-12 rounded-[2rem] bg-surface border border-border shadow-[0_0_50px_rgba(var(--primary-rgb),0.1)] animate-in zoom-in-95 duration-700 max-w-md w-full text-center relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mb-16 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        {/* Branding Section */}
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative group">
            {/* Outer spinning ring */}
            <div className="absolute -inset-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin [animation-duration:1.5s]"></div>
            {/* Middle counter-spinning ring */}
            <div className="absolute -inset-2 border border-primary/10 border-b-primary rounded-full animate-spin [animation-direction:reverse] [animation-duration:2s]"></div>
            
            {/* Center Logo Container */}
            <div className="h-20 w-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center relative z-10 shadow-inner group-hover:scale-110 transition-transform duration-500 rotate-3">
              <Zap className="h-10 w-10 text-primary animate-pulse" />
            </div>
          </div>
          
          <div className="mt-4 space-y-1">
            <h1 className="text-2xl font-black tracking-tighter text-text-primary flex items-center justify-center gap-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">TEEBOT</span>
              <span className="font-light text-text-muted">FLOW</span>
            </h1>
            <div className="h-0.5 w-12 bg-primary/30 mx-auto rounded-full"></div>
          </div>
        </div>
        
        {/* Status Message */}
        <div className="space-y-3 relative z-10">
          <h3 className="text-sm font-black tracking-[0.2em] uppercase text-primary/80 animate-pulse">
            {loadingMessage || "SYSTEM PROCESSING"}
          </h3>
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div 
                key={i} 
                className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              ></div>
            ))}
          </div>
          <p className="text-xs text-text-muted/60 font-medium tracking-wide">
            DO NOT DISCONNECT OR REFRESH
          </p>
        </div>
      </div>
    </div>
  );
};
