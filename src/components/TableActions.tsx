import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export type ActionItem = {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant?: "default" | "danger";
};

interface TableActionsProps {
  actions: ActionItem[];
}

export function TableActions({ actions }: TableActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Position menu to align its right edge with trigger's right edge
      setMenuRect({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX - 176, // 176px is w-44
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(event.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="inline-block text-left">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded-lg transition-all border border-transparent active:scale-95 ${
          isOpen ? "bg-primary/20 text-primary border-primary/30" : "hover:bg-primary/10 text-text-muted hover:text-primary hover:border-primary/20"
        }`}
        title="More Actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && menuRect && createPortal(
        <div 
          ref={menuRef}
          style={{ 
            position: "absolute",
            top: `${menuRect.top}px`,
            left: `${menuRect.left}px`,
          }}
          className="z-[9999] w-44 origin-top-right rounded-xl border border-border bg-card shadow-2xl shadow-navy/90 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/5"
        >
          <div className="p-1 space-y-0.5">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-tight transition-all ${
                  action.variant === "danger"
                    ? "text-error/70 hover:text-error hover:bg-error/10"
                    : "text-text-muted hover:text-text-primary hover:bg-primary/10"
                }`}
              >
                <action.icon className={`h-3.5 w-3.5 ${action.variant === "danger" ? "" : "text-primary/70"}`} />
                {action.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
