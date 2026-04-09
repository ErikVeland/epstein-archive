import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import s from './CollapsibleSplitPane.module.css';

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
    (event: React.PointerEvent<HTMLElement>) => {
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
      <div ref={rootRef} className={`${s.root} ${className}`}>
        <div className={s.singleRightPanel} style={rightStyle}>
          <div className={s.singleRightContent}>
            <div className={s.sidebarInner}>{collapsed ? collapsedRight : right}</div>

            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className={s.panelToggleBtn}
              aria-label={collapsed ? expandAriaLabel : collapseAriaLabel}
              title={collapsed ? expandAriaLabel : collapseAriaLabel}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              {!collapsed && <span className={s.toggleLabel}>Collapse Sidebar</span>}
            </button>
          </div>

          {!collapsed && (
            <button
              type="button"
              onPointerDown={startResize}
              onKeyDown={handleDividerKeyDown}
              className={s.resizeHandle}
              aria-label={dividerAriaLabel}
              title={dividerAriaLabel}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`${s.root} ${className}`}>
      <div className={s.leftPane}>{left}</div>

      <div className={s.rightPaneOuter} style={rightStyle}>
        {!collapsed && (
          <button
            type="button"
            onPointerDown={startResize}
            onKeyDown={handleDividerKeyDown}
            className={s.splitResizeHandle}
            aria-label={dividerAriaLabel}
            title={dividerAriaLabel}
          />
        )}

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={s.splitCollapseBtn}
          aria-label={collapsed ? expandAriaLabel : collapseAriaLabel}
          title={collapsed ? expandAriaLabel : collapseAriaLabel}
        >
          {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className={s.splitRightContent}>{collapsed ? collapsedRight : right}</div>
      </div>
    </div>
  );
};

export default CollapsibleSplitPane;
