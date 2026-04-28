import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Grip, Play, X } from 'lucide-react';
import type { TutorialItem } from '../tutorials';

interface FloatingVideoPlayerProps {
  tutorial: TutorialItem;
  onClose: () => void;
}

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const INSET = 16;
const PLAYER_WIDTH = 360;
const PLAYER_HEIGHT = 260;

function getCornerPosition(corner: Corner, bounds: DOMRect, player: { width: number; height: number }) {
  const maxX = Math.max(INSET, bounds.width - player.width - INSET);
  const maxY = Math.max(INSET, bounds.height - player.height - INSET);

  switch (corner) {
    case 'top-right':
      return { x: maxX, y: INSET };
    case 'bottom-left':
      return { x: INSET, y: maxY };
    case 'bottom-right':
      return { x: maxX, y: maxY };
    case 'top-left':
    default:
      return { x: INSET, y: INSET };
  }
}

function getNearestCorner(position: { x: number; y: number }, bounds: DOMRect, player: { width: number; height: number }): Corner {
  const corners: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

  return corners.reduce((nearest, corner) => {
    const nearestPos = getCornerPosition(nearest, bounds, player);
    const cornerPos = getCornerPosition(corner, bounds, player);
    const nearestDistance = Math.hypot(position.x - nearestPos.x, position.y - nearestPos.y);
    const cornerDistance = Math.hypot(position.x - cornerPos.x, position.y - cornerPos.y);

    return cornerDistance < nearestDistance ? corner : nearest;
  }, 'top-left' as Corner);
}

export default function FloatingVideoPlayer({ tutorial, onClose }: FloatingVideoPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const positionRef = useRef({ x: INSET, y: INSET });
  const [position, setPosition] = useState({ x: INSET, y: INSET });
  const [snappedCorner, setSnappedCorner] = useState<Corner>('top-left');
  const [isDragging, setIsDragging] = useState(false);

  const playerSize = useMemo(() => ({ width: PLAYER_WIDTH, height: PLAYER_HEIGHT }), []);

  const getBounds = useCallback(() => {
    return playerRef.current?.parentElement?.getBoundingClientRect() ?? null;
  }, []);

  const snapToCorner = useCallback((corner: Corner) => {
    const bounds = getBounds();
    if (!bounds) return;

    const nextPosition = getCornerPosition(corner, bounds, playerSize);
    positionRef.current = nextPosition;
    setSnappedCorner(corner);
    setPosition(nextPosition);
  }, [getBounds, playerSize]);

  useEffect(() => {
    snapToCorner('top-left');
  }, [tutorial.id, snapToCorner]);

  useEffect(() => {
    const container = playerRef.current?.parentElement;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      snapToCorner(snappedCorner);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [snapToCorner, snappedCorner]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (target.closest('button, a')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const bounds = getBounds();
    if (!drag || drag.pointerId !== e.pointerId || !bounds) return;

    e.preventDefault();
    e.stopPropagation();

    const maxX = Math.max(INSET, bounds.width - playerSize.width - INSET);
    const maxY = Math.max(INSET, bounds.height - playerSize.height - INSET);
    const nextPosition = {
      x: Math.min(Math.max(INSET, drag.startX + e.clientX - drag.startClientX), maxX),
      y: Math.min(Math.max(INSET, drag.startY + e.clientY - drag.startClientY), maxY),
    };

    positionRef.current = nextPosition;
    setPosition(nextPosition);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const bounds = getBounds();
    if (!drag || drag.pointerId !== e.pointerId || !bounds) return;

    e.preventDefault();
    e.stopPropagation();
    dragRef.current = null;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    const corner = getNearestCorner(positionRef.current, bounds, playerSize);
    snapToCorner(corner);
  };

  return (
    <div
      ref={playerRef}
      className={`absolute z-[80] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl ${isDragging ? '' : 'transition-[left,top] duration-150 ease-out'}`}
      style={{
        left: position.x,
        top: position.y,
        width: PLAYER_WIDTH,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        className={`flex cursor-grab items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-gray-700 active:cursor-grabbing ${isDragging ? 'select-none' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <Grip size={16} className="shrink-0 text-gray-400" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-gray-900">{tutorial.title}</div>
          {tutorial.duration && <div className="text-[11px] font-medium text-gray-500">{tutorial.duration}</div>}
        </div>
        {tutorial.url && (
          <a
            href={tutorial.url}
            target="_blank"
            rel="noreferrer"
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
            title="Open video"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ExternalLink size={15} />
          </a>
        )}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
          title="Close video"
        >
          <X size={16} />
        </button>
      </div>

      <div className="aspect-video bg-gray-950">
        {tutorial.embedUrl ? (
          <iframe
            src={tutorial.embedUrl}
            title={tutorial.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
              <Play size={20} fill="currentColor" />
            </div>
            <div>
              <div className="text-sm font-semibold">{tutorial.title}</div>
              <p className="mt-1 text-xs leading-5 text-white/65">{tutorial.description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
