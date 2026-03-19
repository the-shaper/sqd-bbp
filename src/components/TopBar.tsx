import React, { ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface TopBarProps {
  children?: ReactNode;
  projectName?: string;
  rightContent?: ReactNode;
  onTimerComplete?: () => void;
}

export default function TopBar({ children, projectName, rightContent, onTimerComplete }: TopBarProps) {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [lastSetTime, setLastSetTime] = useState({ minutes: 0, seconds: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [editingField, setEditingField] = useState<'minutes' | 'seconds' | null>(null);
  const [editValue, setEditValue] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playAlertSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.5);
      }, 200);
    } catch (e) {
      console.warn('Could not play alert sound:', e);
    }
  }, []);

  const handleStart = useCallback(() => {
    if (minutes === 0 && seconds === 0) return;
    
    setLastSetTime({ minutes, seconds });
    setIsRunning(true);
  }, [minutes, seconds]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setMinutes(lastSetTime.minutes);
    setSeconds(lastSetTime.seconds);
  }, [lastSetTime]);

  const handlePlayPause = useCallback(() => {
    if (isRunning) {
      handlePause();
    } else {
      handleStart();
    }
  }, [isRunning, handleStart, handlePause]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev === 0) {
            setMinutes(m => {
              if (m === 0) {
                setIsRunning(false);
                playAlertSound();
                onTimerComplete?.();
                return 0;
              }
              return m - 1;
            });
            return minutes === 0 ? 0 : 59;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, playAlertSound, onTimerComplete, minutes]);

  const handleFieldClick = (field: 'minutes' | 'seconds') => {
    if (isRunning) return;
    setEditingField(field);
    setEditValue(field === 'minutes' ? String(minutes) : String(seconds));
  };

  const handleFieldBlur = () => {
    if (editingField) {
      const value = parseInt(editValue, 10) || 0;
      const max = editingField === 'minutes' ? 90 : 59;
      const clamped = Math.max(0, Math.min(max, value));
      
      if (editingField === 'minutes') {
        setMinutes(clamped);
      } else {
        setSeconds(clamped);
      }
      setEditingField(null);
      setEditValue('');
    }
  };

  const handleFieldKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFieldBlur();
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditValue('');
    }
  };

  const formatNumber = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="h-20 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">WORKSHOP</div>
        <div className="text-sm font-medium text-gray-900 underline decoration-gray-300 underline-offset-4">Beyond Bulletpoints: The Unfair Advantage</div>
        <div className="text-sm font-bold text-gray-900 uppercase mt-1">{projectName || "PROJECT NAME"}</div>
      </div>
      <div className="flex items-center gap-4">
        {children}
        <div className="flex items-center bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
          <span className="text-sm font-bold mr-4">Set Timer</span>
          <div className="flex items-center mr-6">
            {editingField === 'minutes' ? (
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={handleFieldBlur}
                onKeyDown={handleFieldKeyDown}
                className="w-10 text-lg font-mono font-medium text-center border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            ) : (
              <span
                onClick={() => handleFieldClick('minutes')}
                className={`text-lg font-mono font-medium cursor-pointer hover:text-indigo-600 ${isRunning ? 'cursor-not-allowed' : ''}`}
              >
                {formatNumber(minutes)}
              </span>
            )}
            <span className="text-lg font-mono font-medium mx-1">:</span>
            {editingField === 'seconds' ? (
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={handleFieldBlur}
                onKeyDown={handleFieldKeyDown}
                className="w-10 text-lg font-mono font-medium text-center border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            ) : (
              <span
                onClick={() => handleFieldClick('seconds')}
                className={`text-lg font-mono font-medium cursor-pointer hover:text-indigo-600 ${isRunning ? 'cursor-not-allowed' : ''}`}
              >
                {formatNumber(seconds)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-gray-500">
            <button
              onClick={handlePlayPause}
              className="hover:text-indigo-600 transition-colors"
              disabled={minutes === 0 && seconds === 0}
            >
              {isRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>
            <button onClick={handleReset} className="hover:text-indigo-600 transition-colors">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
        {rightContent}
      </div>
    </div>
  );
}