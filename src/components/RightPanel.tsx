import React, { useState, useRef, useEffect } from 'react';
import { Send, Star, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { CardData } from '../types';
import { generateChatResponse, ModelType } from '../services/ai';

interface RightPanelProps {
  selectedCard: string | null;
  currentView: 'new' | 'canvas';
  cards: CardData[];
  projectData: { client: string; background: string; notes: string };
  selectedModel: ModelType;
  currentSession?: { id: string; name: string } | null;
  isEditMode?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export default function RightPanel({ 
  selectedCard, 
  currentView, 
  cards, 
  projectData, 
  selectedModel,
  currentSession,
  isEditMode 
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'notepad' | 'cards' | 'chat'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const card = selectedCard ? cards.find(c => c.id === selectedCard) : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await generateChatResponse(
        projectData.client,
        projectData.background,
        projectData.notes,
        userMessage.text,
        history,
        selectedModel,
        currentView
      );

      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Sorry, I encountered an error while trying to respond. Please try again."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderChatInterface = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-base text-gray-500 text-center mt-10">
            Start a conversation to generate background descriptions and ideas.
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-base ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-sm' 
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                <div className="markdown-body">
                  <Markdown>{msg.text}</Markdown>
                </div>
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

      <div className="p-6 border-t border-gray-200 bg-gray-50 shrink-0">
        {messages.length === 0 && (
          <button 
            onClick={() => {
              if (currentView === 'new') {
                setInput("Let's start the guided Q&A to build my project background.");
              } else {
                setInput("Help me generate a background description for my project.");
              }
            }}
            className="w-full py-3 border border-gray-300 rounded-md text-base font-medium mb-4 bg-white hover:bg-gray-100 transition-colors shadow-sm"
          >
            {currentView === 'new' ? 'Start Guided Q&A' : 'Help me generate background description'}
          </button>
        )}
        <div className="relative">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full border border-gray-300 rounded-md p-4 pr-12 text-base resize-none h-24 focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            placeholder="Need help with ideas? Just say it"
            disabled={isTyping}
          />
          <button 
            onClick={handleSendMessage}
            disabled={!input.trim() || isTyping}
            className="absolute bottom-4 right-4 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:hover:text-gray-400"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  if (currentView === 'new') {
    return (
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col shrink-0 h-full">
        <div className="p-8 border-b border-gray-200 shrink-0">
          <div className="text-base text-gray-500 mb-2">Hero: <span className="font-bold text-gray-900">{projectData.client || 'Client Name'}</span></div>
          <div className="text-base text-gray-500">Challenge <span className="font-bold text-gray-900">Description of challenge, brief</span></div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {renderChatInterface()}
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col shrink-0 h-full">
      <div className="p-8 border-b border-gray-200 flex flex-col max-h-[35vh] shrink-0">
        <div className="text-base text-gray-500 mb-2 shrink-0">Hero: <span className="font-bold text-gray-900">{projectData.client || 'Client Name'}</span></div>
        <div className="text-base text-gray-500 mb-5 shrink-0">Challenge: <span className="font-bold text-gray-900">Description of challenge, brief</span></div>
        <div className="overflow-y-auto pr-3 -mr-3 custom-scrollbar">
          <p className="text-base text-gray-700 leading-relaxed">
            {projectData.background || "No background description provided."}
          </p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
        <button 
          className={`flex-1 py-4 text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === 'notepad' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          onClick={() => setActiveTab('notepad')}
        >
          Notepad
        </button>
        <button 
          className={`flex-1 py-4 text-sm font-bold tracking-wider uppercase border-l border-gray-200 transition-colors ${activeTab === 'cards' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          onClick={() => setActiveTab('cards')}
        >
          Cards
        </button>
        <button 
          className={`flex-1 py-4 text-sm font-bold tracking-wider uppercase border-l border-gray-200 transition-colors ${activeTab === 'chat' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'cards' && card && (
          <div className="flex-1 overflow-y-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 custom-scrollbar">
            <h3 className="text-2xl font-bold mb-6">Act I</h3>
            <div className="text-base font-bold mb-3 capitalize">Your {card.section.replace('_', ' ')}</div>
            <div className={`p-5 rounded-xl mb-8 relative border border-black/5 shadow-sm
              ${card.section === 'place' ? 'bg-[#e8f5e9]' : ''}
              ${card.section === 'role' ? 'bg-[#ffebee]' : ''}
              ${card.section === 'challenge' ? 'bg-[#e3f2fd]' : ''}
              ${card.section === 'point_a' ? 'bg-[#f3e5f5]' : ''}
              ${card.section === 'point_b' ? 'bg-[#e0f7fa]' : ''}
              ${card.section === 'change' ? 'bg-white border-2 border-gray-800' : ''}
              ${card.section === 'story' ? 'bg-[#fff9c4]' : ''}
            `}>
              {card.starred && <Star size={16} className="absolute top-4 left-4 text-gray-900 fill-gray-900" />}
              <div className={`text-base font-medium ${card.starred ? 'mt-6' : ''}`}>
                {card.content}
              </div>
            </div>
            
            <div className="font-bold text-base mb-3">Add Notes</div>
            <textarea 
              className="w-full h-40 p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-gray-600 leading-relaxed shadow-sm"
              defaultValue="Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt."
            />
          </div>
        )}
        {activeTab === 'cards' && !card && (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-lg p-8">
            Select a card to view details
          </div>
        )}
        {activeTab === 'chat' && (
          <div className="flex-1 overflow-hidden">
            {renderChatInterface()}
          </div>
        )}
        {activeTab === 'notepad' && (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-lg p-8">
            Notepad interface
          </div>
        )}
      </div>
    </div>
  );
}
