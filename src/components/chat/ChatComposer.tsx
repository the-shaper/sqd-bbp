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
  placeholder = "Need help with ideas? Just say it",
}: ChatComposerProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-6 border-t border-gray-200 bg-gray-50 shrink-0">
      {showStarter && (
        <button
          onClick={onStarter}
          className="w-full py-3 border border-gray-300 rounded-md text-base font-medium mb-4 bg-white hover:bg-gray-100 transition-colors shadow-sm"
        >
          {starterLabel}
        </button>
      )}
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full border border-gray-300 rounded-md p-4 pr-12 text-base resize-none h-24 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
          placeholder={placeholder}
          disabled={isTyping}
        />
        <button
          onClick={onSend}
          disabled={!input.trim() || isTyping}
          className="absolute bottom-4 right-4 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:hover:text-gray-400"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

