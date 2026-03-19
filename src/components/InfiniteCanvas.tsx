import React, { useRef, useEffect, ReactNode } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface InfiniteCanvasProps {
  children: ReactNode;
  pan: { x: number; y: number };
  scale: number;
  onPanChange: (pan: { x: number; y: number }) => void;
  onScaleChange: (scale: number) => void;
}

export default function InfiniteCanvas({ children, pan, scale, onPanChange, onScaleChange }: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const zoomSensitivity = 0.005;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(0.1, scale * (1 + delta)), 3);
        
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleRatio = newScale / scale;
        const newPan = {
          x: mouseX - (mouseX - pan.x) * scaleRatio,
          y: mouseY - (mouseY - pan.y) * scaleRatio
        };

        onScaleChange(newScale);
        onPanChange(newPan);
      } else {
        onPanChange({
          x: pan.x - e.deltaX,
          y: pan.y - e.deltaY
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [pan, scale, onPanChange, onScaleChange]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const isPanTarget = target === containerRef.current || target.getAttribute('data-pan-target') === 'true';

    if (e.button === 1 || (e.button === 0 && isPanTarget)) {
      isPanningRef.current = true;
      startPanRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      containerRef.current?.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanningRef.current) {
      onPanChange({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isPanningRef.current = false;
    containerRef.current?.releasePointerCapture(e.pointerId);
  };

  const handleZoomIn = () => onScaleChange(Math.min(scale * 1.2, 3));
  const handleZoomOut = () => onScaleChange(Math.max(scale / 1.2, 0.1));
  const handleReset = () => {
    onScaleChange(1);
    onPanChange({ x: 100, y: 100 });
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
        <span className="text-xs font-medium text-gray-600 w-12 text-center select-none">{Math.round(scale * 100)}%</span>
        <button onClick={handleZoomIn} className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors"><ZoomIn size={18} /></button>
        <div className="w-px h-4 bg-gray-200 mx-1"></div>
        <button onClick={handleReset} className="p-2 hover:bg-gray-100 rounded text-gray-600 transition-colors"><Maximize size={18} /></button>
      </div>
    </div>
  );
}