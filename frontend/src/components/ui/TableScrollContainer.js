import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * TableScrollContainer
 * Solves table horizontal scrolling issues by providing:
 * 1. A Top Scrollbar right above the table header
 * 2. A Sticky Floating Bottom Scrollbar at the viewport bottom whenever the table's native bottom scrollbar is offscreen
 * 3. Smooth mouse click-and-drag horizontal scrolling
 * 4. Automatic dimension observation and 2-way scroll synchronization
 */
export default function TableScrollContainer({ children, className = '', containerStyle = {} }) {
  const containerRef = useRef(null);
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);

  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [showBottomSticky, setShowBottomSticky] = useState(false);
  const [stickyWidth, setStickyWidth] = useState(0);
  const [stickyLeft, setStickyLeft] = useState(0);

  // Mouse drag-to-scroll state
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const isSyncing = useRef(false);

  // Measure container & check viewport visibility
  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    
    const sWidth = el.scrollWidth;
    const cWidth = el.clientWidth;
    setScrollWidth(sWidth);
    setClientWidth(cWidth);

    const rect = el.getBoundingClientRect();
    setStickyWidth(rect.width);
    setStickyLeft(rect.left);

    const windowHeight = window.innerHeight;
    const hasHorizontalOverflow = sWidth > cWidth + 2;
    // Show sticky bottom scrollbar if table is visible on screen but its real bottom scrollbar is offscreen below viewport
    const isTableInView = rect.top < windowHeight && rect.bottom > 0;
    const isRealScrollbarBelowScreen = rect.bottom > windowHeight && rect.top < windowHeight - 80;

    setShowBottomSticky(hasHorizontalOverflow && isTableInView && isRealScrollbarBelowScreen);
  }, []);

  useEffect(() => {
    updateDimensions();

    const handleScroll = () => updateDimensions();
    const handleResize = () => updateDimensions();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [updateDimensions]);

  // Handle bidirectional scroll syncing
  const syncScroll = (sourceRef, targets) => {
    if (isSyncing.current || !sourceRef.current) return;
    isSyncing.current = true;
    const left = sourceRef.current.scrollLeft;

    targets.forEach((targetRef) => {
      if (targetRef.current && targetRef.current.scrollLeft !== left) {
        targetRef.current.scrollLeft = left;
      }
    });

    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  };

  const handleMainScroll = () => syncScroll(containerRef, [topScrollRef, bottomScrollRef]);
  const handleTopScroll = () => syncScroll(topScrollRef, [containerRef, bottomScrollRef]);
  const handleBottomScroll = () => syncScroll(bottomScrollRef, [containerRef, topScrollRef]);

  // Mouse drag-to-scroll handlers
  const handleMouseDown = (e) => {
    // Only trigger drag if left mouse button is pressed and target is not button, input, select, link, or interactive
    if (e.button !== 0) return;
    const targetTag = e.target.tagName.toLowerCase();
    if (['button', 'input', 'select', 'textarea', 'a', 'label', 'svg', 'path'].includes(targetTag)) return;
    if (e.target.closest('button, input, select, textarea, a, label')) return;

    isMouseDownRef.current = true;
    startXRef.current = e.pageX - containerRef.current.offsetLeft;
    startScrollLeftRef.current = containerRef.current.scrollLeft;
  };

  const handleMouseLeaveOrUp = () => {
    isMouseDownRef.current = false;
  };

  const handleMouseMove = (e) => {
    if (!isMouseDownRef.current || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5; // Drag scroll multiplier
    containerRef.current.scrollLeft = startScrollLeftRef.current - walk;
  };

  const hasOverflow = scrollWidth > clientWidth + 2;

  return (
    <div className="relative w-full">
      {/* Top Scrollbar Bar (Visible when table has horizontal overflow) */}
      {hasOverflow && (
        <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-100/90 px-3 py-1 text-[11px] font-bold text-slate-500 rounded-t-xl">
          <span className="shrink-0 flex items-center gap-1.5 text-slate-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Horizontal Scroll:
          </span>
          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
            className="flex-1 overflow-x-auto overflow-y-hidden py-0.5 scrollbar-thin"
            style={{ height: '14px' }}
          >
            <div style={{ width: `${scrollWidth}px`, height: '1px' }} />
          </div>
        </div>
      )}

      {/* Main Table Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleMainScroll}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseLeaveOrUp}
        onMouseLeave={handleMouseLeaveOrUp}
        onMouseMove={handleMouseMove}
        className={`overflow-x-auto select-none ${className}`}
        style={containerStyle}
      >
        {children}
      </div>

      {/* Floating Viewport-Sticky Bottom Scrollbar */}
      {showBottomSticky && (
        <div
          className="fixed bottom-0 z-50 flex items-center gap-2 rounded-t-xl border border-b-0 border-slate-300 bg-white/95 px-3 py-1.5 shadow-[0_-8px_25px_rgba(15,23,42,0.15)] backdrop-blur-md transition-all duration-200"
          style={{
            left: `${stickyLeft}px`,
            width: `${stickyWidth}px`,
          }}
        >
          <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-[#2f6df6] flex items-center gap-1">
            <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Scroll Table
          </span>
          <div
            ref={bottomScrollRef}
            onScroll={handleBottomScroll}
            className="flex-1 overflow-x-auto overflow-y-hidden py-1"
            style={{ height: '16px' }}
          >
            <div style={{ width: `${scrollWidth}px`, height: '1px' }} />
          </div>
        </div>
      )}
    </div>
  );
}
