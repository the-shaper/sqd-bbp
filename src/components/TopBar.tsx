import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

export default function TopBar() {
  return (
    <div className="h-20 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">WORKSHOP</div>
        <div className="text-sm font-medium text-gray-900 underline decoration-gray-300 underline-offset-4">Beyond Bulletpoints: The Unfair Advantage</div>
        <div className="text-sm font-bold text-gray-900 uppercase mt-1">PROJECT NAME</div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
          <span className="text-sm font-bold mr-4">Set Timer</span>
          <span className="text-lg font-mono font-medium mr-6">00 : 00</span>
          <div className="flex items-center gap-3 text-gray-500">
            <button className="hover:text-gray-900 transition-colors"><Play size={16} fill="currentColor" /></button>
            <button className="hover:text-gray-900 transition-colors"><Pause size={16} fill="currentColor" /></button>
            <button className="hover:text-gray-900 transition-colors"><RotateCcw size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
