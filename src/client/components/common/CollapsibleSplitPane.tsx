import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CollapsibleSplitPaneProps {
  mode?: 'split' | 'singleRight';
  left: React.ReactNode;
  right: React.ReactNode;
  collapsedRight: React.ReactNode;
  className?: string;
  defaultRightWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;
  collapsedWidth?: number;
  rightCollapsed?: boolean;
  onRightCollapsedChange?: (next: boolean) => void;
  onRightWidthChange?: (width: number) => void;
  dividerAriaLabel?: string;
  collapseAriaLabel?: string;
  expandAriaLabel?: string;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const CollapsibleSplitPane: React.FC<CollapsibleSplitPaneProps> = ({
  mode = 'split',
  left,
  right,
  collapsedRight,
  className = '',
  defaultRightWidth = 340,
  minRightWidth = 260,
  maxRightWidth = 540,
  collapsedWidth = 48,
  rightCollapsed,
  onRightCollapsedChange,
  onRightWidthChange,
  dividerAriaLabel = 'Resize sidebar',
  collapseAriaLabel = 'Collapse sidebar',
  expandAriaLabel = 'Expand sidebar',
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [internalWidth, setInternalWidth] = useState(defaultRightWidth);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const collapsed = rightCollapsed ?? internalCollapsed;
  const rightWidth = clamp(internalWidth, minRightWidth, maxRightWidth);

  const setCollapsed = useCallback(
    (next: boolean) => {
      if (typeof onRightCollapsedChange === 'function') {
        onRightCollapsedChange(next);
        return;
      }
      setInternalCollapsed(next);
    },
    [onRightCollapsedChange],
  );

  const setWidth = useCallback(
    (next: number) => {
      const clamped = clamp(next, minRightWidth, maxRightWidth);
      setInternalWidth(clamped);
      onRightWidthChange?.(clamped);
    },
    [maxRightWidth, minRightWidth, onRightWidthChange],
  );

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (collapsed) return;
      const root = rootRef.current;
      if (!root) return;

      const startX = event.clientX;
      const startWidth = rightWidth;
      const rootRect = root.getBoundingClientRect();
      const viewportMax =
        mode === 'singleRight'
          ? maxRightWidth
          : Math.max(minRightWidth, Math.min(maxRightWidth, rootRect.width - 320));

      const handleMove = (moveEvent: PointerEvent) => {
        const delta = startX - moveEvent.clientX;
        setWidth(clamp(startWidth + delta, minRightWidth, viewportMax));
      };

      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [collapsed, maxRightWidth, minRightWidth, mode, rightWidth, setWidth],
  );

  const handleDividerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (collapsed) {
          setCollapsed(false);
          return;
        }
        setWidth(rightWidth + 24);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (!collapsed && rightWidth <= minRightWidth + 24) {
          setCollapsed(true);
          return;
        }
        if (!collapsed) setWidth(rightWidth - 24);
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setCollapsed(!collapsed);
      }
    },
    [collapsed, minRightWidth, rightWidth, setCollapsed, setWidth],
  );

  const rightStyle = useMemo<React.CSSProperties>(
    () => ({
      width: collapsed ? collapsedWidth : rightWidth,
    }),
    [collapsed, collapsedWidth, rightWidth],
  );

  if (mode === 'singleRight') {
    return (
      <div ref={rootRef} className={`flex h-full min-h-0 min-w-0 ${className}`}>
        <div className="shrink-0 flex items-stretch" style={rightStyle}>
          <div className="w-10 border-r border-white/5 bg-slate-950/40 flex flex-col items-center py-6 gap-6 shrink-0 relative z-10">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 border border-transparent transition-all outline-none"
              aria-label={collapsed ? expandAriaLabel : collapseAriaLabel}
              title={collapsed ? expandAriaLabel : collapseAriaLabel}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>

            {!collapsed && (
              <button
                type="button"
                onPointerDown={startResize}
                onKeyDown={handleDividerKeyDown}
                className="h-12 w-8 flex items-center justify-center text-slate-600 hover:text-cyan-400/60 cursor-col-resize outline-none group"
                aria-label={dividerAriaLabel}
                title={dividerAriaLabel}
              >
                <div className="w-1 h-8 rounded-full bg-slate-800 group-hover:bg-cyan-500/30 transition-colors" />
              </button>
            )}
          </div>

          <div className="min-w-0 min-h-0 flex-1 bg-slate-900/45">
            {collapsed ? collapsedRight : right}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`flex h-full min-h-0 min-w-0 ${className}`}>
      <div className="flex-1 min-w-0 min-h-0">{left}</div>

      <div className="shrink-0 flex items-stretch" style={rightStyle}>
        <div className="w-10 border-l border-white/5 bg-slate-950/40 flex flex-col items-center py-6 gap-6 shrink-0 relative z-10">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 border border-transparent transition-all outline-none"
            aria-label={collapsed ? expandAriaLabel : collapseAriaLabel}
            title={collapsed ? expandAriaLabel : collapseAriaLabel}
          >
            {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {!collapsed && (
            <button
              type="button"
              onPointerDown={startResize}
              onKeyDown={handleDividerKeyDown}
              className="h-12 w-8 flex items-center justify-center text-slate-600 hover:text-cyan-400/60 cursor-col-resize outline-none group"
              aria-label={dividerAriaLabel}
              title={dividerAriaLabel}
            >
              <div className="w-1 h-8 rounded-full bg-slate-800 group-hover:bg-cyan-500/30 transition-colors" />
            </button>
          )}
        </div>

        <div className="min-w-0 min-h-0 flex-1 border-l border-slate-700/60 bg-slate-900/45">
          {collapsed ? collapsedRight : right}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSplitPane;
