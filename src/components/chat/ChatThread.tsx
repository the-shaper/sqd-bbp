import React, { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import Markdown from "react-markdown";
import type { ChatMessage } from "./types";

interface ChatThreadProps {
  messages: ChatMessage[];
  isTyping: boolean;
  emptyState: string;
  renderMessageActions?: (message: ChatMessage) => React.ReactNode;
}

export default function ChatThread({ messages, isTyping, emptyState, renderMessageActions }: ChatThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
      {messages.length === 0 ? (
        <div className="text-base text-gray-500 text-center mt-10">
          {emptyState}
        </div>
      ) : (
        messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%]">
              <div
                className={`rounded-2xl px-4 py-3 text-base ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}
              >
                <div className="markdown-body">
                  <Markdown>{msg.text}</Markdown>
                </div>
              </div>
              {renderMessageActions?.(msg)}
            </div>
          </div>
        ))
      )}
      {isTyping && (
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-gray-100 text-gray-800 rounded-bl-sm flex items-center gap-2">
            <Loader2 size={16} className="animate-spin text-gray-500" />
            <span className="text-sm text-gray-500">Thinking...</span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
