// src/components/performance/VirtualizedList.tsx
import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  overscan?: number; // Number of items to render outside visible area
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  overscan = 5,
  className = '',
  onScroll,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const { startIndex, endIndex, offsetY } = useMemo(() => {
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(items.length - 1, start + visibleItemCount + 2 * overscan);
    const offset = start * itemHeight;

    return {
      startIndex: start,
      endIndex: end,
      offsetY: offset,
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll]
  );

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <div key={keyExtractor(item, actualIndex)} style={{ height: itemHeight }}>
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(VirtualizedList) as typeof VirtualizedList;
