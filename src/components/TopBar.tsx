import React, { ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, X, ExternalLink } from 'lucide-react';
import { TUTORIALS, TutorialItem } from '../tutorials';

interface TopBarProps {
  children?: ReactNode;
  projectName?: string;
  rightContent?: ReactNode;
  onTimerComplete?: () => void;
  onTutorialSelect?: (tutorial: TutorialItem) => void;
}

export default function TopBar({ children, projectName, rightContent, onTimerComplete, onTutorialSelect }: TopBarProps) {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [lastSetTime, setLastSetTime] = useState({ minutes: 0, seconds: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [editingField, setEditingField] = useState<'minutes' | 'seconds' | null>(null);
  const [editValue, setEditValue] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

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

  // Close help dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setShowHelp(false);
      }
    };
    if (showHelp) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHelp]);

  return (
    <div className="h-20 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">WORKSHOP</div>
        <div className="text-sm font-medium text-gray-900 underline decoration-gray-300 underline-offset-4">Beyond Bulletpoints: The Unfair Advantage</div>
        <div className="text-sm font-bold text-gray-900 uppercase mt-1">{projectName || "PROJECT NAME"}</div>
      </div>
      <div className="flex items-center gap-4">
        {children}
        
        {/* Help / Tutorial entry point */}
        <div className="relative" ref={helpRef}>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
            title="Help & Tutorials"
          >
            {showHelp ? <X size={20} /> : <Play size={20} />}
          </button>
          
          {showHelp && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Help & Tutorials</h3>
                <p className="text-xs text-gray-500 mt-0.5">Learn how to get the most from Beyond Bullet Points</p>
              </div>
              <div className="p-2">
                {TUTORIALS.map((tutorial) => (
                  <button
                    key={tutorial.id}
                    onClick={() => {
                      onTutorialSelect?.(tutorial);
                      setShowHelp(false);
                    }}
                    className="w-full text-left px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">
                          {tutorial.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {tutorial.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        {tutorial.duration && (
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {tutorial.duration}
                          </span>
                        )}
                        <ExternalLink size={12} className="text-gray-400 group-hover:text-indigo-600" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-400 text-center">
                Video provider integration placeholder — swap source in tutorials.ts
              </div>
            </div>
          )}
        </div>

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
