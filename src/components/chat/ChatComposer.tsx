import React from "react";
import { Send } from "lucide-react";

interface ChatComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  isTyping: boolean;
  showStarter: boolean;
  starterLabel: string;
  onStarter: () => void;
  selectedContextLabel?: string;
  placeholder?: string;
}

export default function ChatComposer({
  input,
  setInput,
  onSend,
  isTyping,
  showStarter,
  starterLabel,
  onStarter,
  selectedContextLabel,
  placeholder = "Need help with ideas? Just say it",
}: ChatComposerProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0">
      {showStarter && (
        <button
          onClick={onStarter}
          className="w-full py-2.5 border border-gray-300 rounded-md text-sm font-medium mb-3 bg-white hover:bg-gray-100 transition-colors shadow-sm"
        >
          {starterLabel}
        </button>
      )}
      <div className="relative rounded-md border border-gray-300 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
        {selectedContextLabel && (
          <div className="px-3 pt-3">
            <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
              {selectedContextLabel}
            </span>
          </div>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent p-3 pr-11 text-sm resize-none h-36 outline-none"
          placeholder={placeholder}
          disabled={isTyping}
        />
        <button
          onClick={onSend}
          disabled={!input.trim() || isTyping}
          className="absolute bottom-3 right-3 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:hover:text-gray-400"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
