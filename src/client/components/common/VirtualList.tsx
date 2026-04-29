import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Person } from '@client/types';

interface VirtualListProps {
  items: Person[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: Person, index: number) => React.ReactNode;
  onItemClick: (item: Person) => void;
}

export const VirtualList: React.FC<VirtualListProps> = ({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  onItemClick,
}) => {
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);

  // Calculate visible items based on scroll position
  const updateVisibleItems = useCallback(() => {
    const scrollTop = scrollTopRef.current;
    const newStartIndex = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 1;
    const newEndIndex = Math.min(newStartIndex + visibleCount, items.length);

    setStartIndex(newStartIndex);
    setEndIndex(newEndIndex);
  }, [items.length, itemHeight, containerHeight]);

  // Handle scroll events
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      scrollTopRef.current = e.currentTarget.scrollTop;
      updateVisibleItems();
    },
    [updateVisibleItems],
  );

  // Update visible items when items change
  useEffect(() => {
    updateVisibleItems();
  }, [items, updateVisibleItems]);

  // Calculate virtual list properties
  const totalHeight = items.length * itemHeight;
  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className="virtual-list-container"
      style={{
        height: containerHeight,
        overflowY: 'auto',
        position: 'relative',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--text-muted) var(--lq-surface-2)',
      }}
      onScroll={handleScroll}
    >
      {/* Spacer to maintain scroll height */}
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {/* Visible items */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={item.name}
              style={{
                height: itemHeight,
                position: 'relative',
              }}
              onClick={() => onItemClick(item)}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
