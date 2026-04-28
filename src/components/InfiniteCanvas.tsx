import React, { useRef, useEffect, useState, ReactNode } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface InfiniteCanvasProps {
  children: ReactNode;
  pan: { x: number; y: number };
  scale: number;
  onPanChange: (pan: { x: number; y: number }) => void;
  onScaleChange: (scale: number) => void;
  onViewportChange?: (pan: { x: number; y: number }, scale: number) => void;
}

export default function InfiniteCanvas({ children, pan, scale, onPanChange, onScaleChange, onViewportChange }: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const panRef = useRef(pan);
  const scaleRef = useRef(scale);
  const frameRef = useRef<number | null>(null);
  const commitTimeoutRef = useRef<number | null>(null);
  const [displayScale, setDisplayScale] = useState(scale);

  useEffect(() => {
    panRef.current = pan;
    scaleRef.current = scale;
    setDisplayScale(scale);
    applyViewport(pan, scale);
  }, [pan, scale]);

  const applyViewport = (nextPan: { x: number; y: number }, nextScale: number) => {
    const container = containerRef.current;
    const content = contentRef.current;

    if (container) {
      container.style.backgroundSize = `${24 * nextScale}px ${24 * nextScale}px`;
      container.style.backgroundPosition = `${nextPan.x}px ${nextPan.y}px`;
    }

    if (content) {
      content.style.transform = `translate(${nextPan.x}px, ${nextPan.y}px) scale(${nextScale})`;
    }
  };

  const setViewport = (nextPan: { x: number; y: number }, nextScale: number, commit = false) => {
    panRef.current = nextPan;
    scaleRef.current = nextScale;
    onViewportChange?.(nextPan, nextScale);

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      applyViewport(nextPan, nextScale);
      frameRef.current = null;
    });

    if (nextScale !== displayScale) {
      setDisplayScale(nextScale);
    }

    if (commit) {
      if (commitTimeoutRef.current !== null) {
        window.clearTimeout(commitTimeoutRef.current);
        commitTimeoutRef.current = null;
      }
      onPanChange(nextPan);
      onScaleChange(nextScale);
      return;
    }

    if (commitTimeoutRef.current !== null) {
      window.clearTimeout(commitTimeoutRef.current);
    }
    commitTimeoutRef.current = window.setTimeout(() => {
      onPanChange(panRef.current);
      onScaleChange(scaleRef.current);
      commitTimeoutRef.current = null;
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      if (commitTimeoutRef.current !== null) {
        window.clearTimeout(commitTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentPan = panRef.current;
      const currentScale = scaleRef.current;

      if (e.ctrlKey || e.metaKey) {
        const zoomSensitivity = 0.005;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(0.1, currentScale * (1 + delta)), 3);
        
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleRatio = newScale / currentScale;
        const newPan = {
          x: mouseX - (mouseX - currentPan.x) * scaleRatio,
          y: mouseY - (mouseY - currentPan.y) * scaleRatio
        };

        setViewport(newPan, newScale);
      } else {
        setViewport({
          x: currentPan.x - e.deltaX,
          y: currentPan.y - e.deltaY
        }, currentScale);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [displayScale]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const isPanTarget = target === containerRef.current || target.getAttribute('data-pan-target') === 'true';

    if (e.button === 1 || (e.button === 0 && isPanTarget)) {
      isPanningRef.current = true;
      startPanRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
      containerRef.current?.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanningRef.current) {
      setViewport({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y
      }, scaleRef.current);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPanningRef.current) return;

    isPanningRef.current = false;
    containerRef.current?.releasePointerCapture(e.pointerId);
    setViewport(panRef.current, scaleRef.current, true);
  };

  const handleZoomIn = () => setViewport(panRef.current, Math.min(scaleRef.current * 1.2, 3), true);
  const handleZoomOut = () => setViewport(panRef.current, Math.max(scaleRef.current / 1.2, 0.1), true);
  const handleReset = () => {
    setViewport({ x: 100, y: 100 }, 1, true);
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div 
        ref={containerRef}
        className={`absolute inset-0 touch-none ${isPanningRef.current ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          backgroundImage: 'radial-gradient(#d1d5db 1.5px, transparent 1.5px)',
          backgroundSize: `${24 * scale}px ${24 * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
      >
        <div 
          ref={contentRef}
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0'
          }}
          className="w-max h-max pointer-events-none"
        >
          <div className="pointer-events-auto">
            {children}
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 right-10 flex items-center gap-2 bg-white rounded-lg shadow-md border border-gray-200 p-1 z-50">
        <button onClick={handleZoomOut} className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors"><ZoomOut size={18} /></button>
        <span className="text-xs font-medium text-gray-600 w-12 text-center select-none">{Math.round(displayScale * 100)}%</span>
        <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors"><ZoomIn size={18} /></button>
        <div className="w-px h-4 bg-gray-200 mx-1"></div>
        <button onClick={handleReset} className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors"><Maximize size={18} /></button>
      </div>
    </div>
  );
}
