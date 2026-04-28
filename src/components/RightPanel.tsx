import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Sparkles, Star, X } from 'lucide-react';
import { CardData, ProjectAttachment } from '../types';
import { ModelType, synthesizeNoteIntoCard } from '../services/ai';
import ChatPanel from './chat/ChatPanel';
import type { ProjectBackgroundApplyMode } from './chat/types';

interface RightPanelProps {
  selectedCard: string | null;
  currentView: 'new' | 'canvas';
  cards: CardData[];
  projectData: { client: string; background: string; notes: string };
  selectedModel: ModelType;
  currentSession?: { id: string; name: string } | null;
  isEditMode?: boolean;
  onApplyProjectBackground?: (text: string, mode: ProjectBackgroundApplyMode) => void;
  onCardAdd?: (card: Omit<CardData, 'id'>) => Promise<string | undefined>;
  attachments?: ProjectAttachment[];
}

export default function RightPanel({ 
  selectedCard, 
  currentView, 
  cards, 
  projectData, 
  selectedModel,
  currentSession,
  isEditMode,
  onApplyProjectBackground,
  onCardAdd,
  attachments = [],
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'notepad' | 'cards' | 'chat'>('chat');
  const [cardNotes, setCardNotes] = useState<Record<string, string>>({});
  const [pendingCardText, setPendingCardText] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [isCreatingCard, setIsCreatingCard] = useState(false);

  const card = selectedCard ? cards.find(c => c.id === selectedCard) : null;
  const noteStorageKey = useMemo(
    () => `bbp_card_notes_${currentSession?.id || 'local'}`,
    [currentSession?.id]
  );
  const currentNote = card ? cardNotes[card.id] || '' : '';

  useEffect(() => {
    try {
      const stored = localStorage.getItem(noteStorageKey);
      setCardNotes(stored ? JSON.parse(stored) : {});
    } catch (error) {
      console.warn('Failed to load card notes:', error);
      setCardNotes({});
    }
  }, [noteStorageKey]);

  useEffect(() => {
    setPendingCardText('');
    setSynthesisError(null);
  }, [selectedCard]);

  const updateCurrentNote = (value: string) => {
    if (!card) return;

    setCardNotes(prev => {
      const next = { ...prev, [card.id]: value };
      try {
        localStorage.setItem(noteStorageKey, JSON.stringify(next));
      } catch (error) {
        console.warn('Failed to save card notes:', error);
      }
      return next;
    });
  };

  const handleSynthesizeNote = async () => {
    if (!card || !currentNote.trim()) return;

    setIsSynthesizing(true);
    setSynthesisError(null);
    setPendingCardText('');

    try {
      const text = await synthesizeNoteIntoCard(
        projectData.client,
        projectData.background,
        projectData.notes,
        card,
        currentNote,
        selectedModel
      );
      setPendingCardText(text);
    } catch (error) {
      console.error('Error synthesizing note:', error);
      setSynthesisError('Could not synthesize this note. Please try again.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleCreateSynthesizedCard = async () => {
    if (!card || !pendingCardText.trim() || !onCardAdd) return;

    setIsCreatingCard(true);
    setSynthesisError(null);

    try {
      const nextOrder = cards
        .filter(existingCard => existingCard.section === card.section)
        .reduce((maxOrder, existingCard) => Math.max(maxOrder, existingCard.order ?? 0), -1) + 1;

      await onCardAdd({
        section: card.section,
        content: pendingCardText.trim(),
        starred: false,
        order: nextOrder,
      });
      setPendingCardText('');
    } catch (error) {
      console.error('Error creating synthesized card:', error);
      setSynthesisError('Could not create the card. Please try again.');
    } finally {
      setIsCreatingCard(false);
    }
  };

  if (currentView === 'new') {
    return (
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col shrink-0 h-full">
        <div className="p-8 border-b border-gray-200 shrink-0">
          <div className="text-base text-gray-500 mb-2">Hero: <span className="font-bold text-gray-900">{projectData.client || 'Client Name'}</span></div>
          <div className="text-base text-gray-500">Challenge <span className="font-bold text-gray-900">Description of challenge, brief</span></div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <ChatPanel
            context={{
              currentView,
              currentSession,
              selectedCard: card,
              projectData,
              isEditMode,
              attachments,
            }}
            selectedModel={selectedModel}
            onApplyProjectBackgroundDraft={onApplyProjectBackground}
          />
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
              placeholder="Capture a thought, objection, or detail for this card..."
              value={currentNote}
              onChange={(e) => updateCurrentNote(e.target.value)}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-gray-400">
                {currentNote.length > 0 ? `${currentNote.length} characters` : 'Saved per selected card'}
              </div>
              <button
                onClick={handleSynthesizeNote}
                disabled={!isEditMode || !currentNote.trim() || isSynthesizing}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSynthesizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Synthesize into new card
              </button>
            </div>

            {synthesisError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {synthesisError}
              </div>
            )}

            {pendingCardText && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="mb-2 text-sm font-semibold text-amber-900">Create new card?</div>
                <div className="rounded-lg border border-amber-100 bg-white p-3 text-sm font-medium leading-snug text-gray-900">
                  {pendingCardText}
                </div>
                <div className="mt-2 text-xs text-amber-700">{pendingCardText.length} / 100 characters</div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleCreateSynthesizedCard}
                    disabled={isCreatingCard}
                    className="flex items-center gap-2 rounded-md bg-amber-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isCreatingCard ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Create
                  </button>
                  <button
                    onClick={() => setPendingCardText('')}
                    disabled={isCreatingCard}
                    className="flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 disabled:opacity-60"
                  >
                    <X size={14} />
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'cards' && !card && (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-lg p-8">
            Select a card to edit
          </div>
        )}
        {activeTab === 'chat' && (
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              context={{
                currentView,
                currentSession,
                selectedCard: card,
                projectData,
                isEditMode,
                attachments,
              }}
              selectedModel={selectedModel}
            />
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
