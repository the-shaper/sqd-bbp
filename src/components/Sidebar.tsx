import React from 'react';
import { ChevronDown, Cpu } from 'lucide-react';
import { ModelType } from '../services/ai';

interface SidebarProps {
  onViewChange: (view: 'new' | 'canvas') => void;
  currentView: 'new' | 'canvas';
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

export default function Sidebar({ onViewChange, currentView, selectedModel, onModelChange }: SidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-gray-200 font-bold text-xl tracking-tight">
        SQD+BDO
      </div>
      <div className="flex-1 overflow-y-auto py-4 flex flex-col">
        <div className="px-4 py-2 flex items-center justify-between font-semibold border-b border-gray-100 cursor-pointer hover:bg-gray-50">
          Projects <ChevronDown size={16} />
        </div>
        <div className="px-4 py-2 flex items-center justify-between font-semibold bg-indigo-50 text-indigo-900 border-b border-gray-100 cursor-pointer">
          Workshops <ChevronDown size={16} />
        </div>
        <div className="bg-gray-50 py-2">
          <div className="px-8 py-1.5 text-sm font-medium text-gray-900">Beyond BulletPoints</div>
          <div className="px-8 py-1.5 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer">Introduction</div>
          <div className="px-8 py-1.5 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer">Open Recent</div>
          <div 
            className={`px-8 py-1.5 text-sm cursor-pointer ${currentView === 'new' ? 'bg-cyan-50 text-cyan-900 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => onViewChange('new')}
          >
            New Project
          </div>
        </div>
        
        <div className="mt-auto px-4 py-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            <Cpu size={14} /> AI Model
          </div>
          <div className="relative">
            <select 
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value as ModelType)}
              className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
            >
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
              <option value="minimax-m2.5-free">MiniMax M2.5 Free</option>
              <option value="minimax-m2.5">MiniMax M2.5</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
