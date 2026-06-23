import React, { useState, useRef } from 'react';

const VirtualizedTable = ({
  items = [],
  rowHeight = 60,
  viewportHeight = 450,
  renderRow,
  header,
  className = ""
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 2); // 2 rows buffer at top
  const visibleRowsCount = Math.ceil(viewportHeight / rowHeight) + 4; // 4 rows buffer at bottom
  const endIndex = Math.min(items.length - 1, startIndex + visibleRowsCount);

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * rowHeight;

  return (
    <div className={`flex flex-col border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white ${className}`}>
      {header && (
        <div className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10 shrink-0">
          {header}
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ height: viewportHeight }} className="flex items-center justify-center text-slate-400 italic text-sm">
          No records found.
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{ height: viewportHeight, overflowY: 'auto', position: 'relative' }}
          className="w-full no-scrollbar"
        >
          <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
            <div
              style={{
                transform: `translate3d(0, ${offsetY}px, 0)`,
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0
              }}
            >
              {visibleItems.map((item, idx) => {
                const actualIndex = startIndex + idx;
                return renderRow(item, actualIndex);
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualizedTable;
