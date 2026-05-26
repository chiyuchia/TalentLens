import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface ResizableDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  children: React.ReactNode;
}

export function ResizableDrawer({
  open,
  onClose,
  title,
  minWidth = 480,
  maxWidth = 1200,
  defaultWidth = 720,
  children,
}: ResizableDrawerProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(defaultWidth);
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setWidth(defaultWidth);
    }
    prevOpenRef.current = open;
  }, [open, defaultWidth]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setIsDragging(true);
      startXRef.current = event.clientX;
      startWidthRef.current = width;
    },
    [width],
  );

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(event: MouseEvent) {
      const delta = startXRef.current - event.clientX;
      const newWidth = Math.max(
        minWidth,
        Math.min(maxWidth, startWidthRef.current + delta),
      );
      setWidth(newWidth);
    }

    function handleMouseUp() {
      setIsDragging(false);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, minWidth, maxWidth]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex animate-fade-in-right"
        style={{ width }}
      >
        {/* Resize handle */}
        <div
          className="relative z-10 w-4 -ml-2 cursor-col-resize flex items-center justify-center group"
          onMouseDown={handleMouseDown}
          role="separator"
          aria-label="调整抽屉宽度"
        >
          <div className="h-12 w-1 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col bg-background border-l border-border shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </div>
      </aside>
    </>
  );
}
