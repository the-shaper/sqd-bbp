import React, { useState, useEffect, useCallback } from 'react';
import { Star, Plus, Save, Download, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { COLUMNS } from '../data';
import { CardData } from '../types';
import { motion } from 'motion/react';
import InfiniteCanvas from './InfiniteCanvas';
import { generateSingleIdea, generateTransformationStory, ModelType } from '../services/ai';

interface CanvasProps {
  onSelectCard: (id: string) => void;
  selectedCard: string | null;
  cards: CardData[];
  setCards: React.Dispatch<React.SetStateAction<CardData[]>>;
  projectData: { client: string; background: string; notes: string };
  showToast: (msg: string) => void;
  selectedModel: ModelType;
  isEditMode?: boolean;
  currentSession?: { id: string; name: string } | null;
  onEditRequest?: () => void;
  onCardUpdate?: (cardId: string, updates: Partial<CardData>) => Promise<void>;
  onCardAdd?: (card: Omit<CardData, 'id'>) => Promise<string | undefined>;
  onCursorMove?: (x: number, y: number) => void;
  connections?: Array<{ id: string; from: string; to: string }>;
  onCardDelete?: (cardId: string) => Promise<void>;
  onCardReorder?: (section: string, cardIds: string[]) => Promise<void>;
  onConnectionCreate?: (from: string, to: string) => Promise<void>;
  onConnectionDelete?: (connectionId: string) => Promise<void>;
}

interface ConnectionLineProps {
  startId: string;
  endId: string;
  isDrawing?: boolean;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ startId, endId, isDrawing = false }) => {
  const [path, setPath] = useState('');
  
  useEffect(() => {
    let animationFrameId: number;
    const updatePath = () => {
      const startEl = document.getElementById(startId);
      const endEl = document.getElementById(endId);
      const containerEl = document.getElementById('board-container');
      
      if (startEl && endEl && containerEl) {
        const startRect = startEl.getBoundingClientRect();
        const endRect = endEl.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();
        
        const scale = containerEl.offsetWidth > 0 ? containerRect.width / containerEl.offsetWidth : 1;
        
        const startX = (startRect.left - containerRect.left + startRect.width / 2) / scale;
        const startY = (startRect.top - containerRect.top + startRect.height / 2) / scale;
        const endX = (endRect.left - containerRect.left + endRect.width / 2) / scale;
        const endY = (endRect.top - containerRect.top + endRect.height / 2) / scale;
        
        const dx = Math.max(Math.abs(endX - startX) * 0.5, 50);
        setPath(`M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`);
      }
      animationFrameId = requestAnimationFrame(updatePath);
    };
    updatePath();
    return () => cancelAnimationFrame(animationFrameId);
  }, [startId, endId]);

  if (!path) return null;

  const markerId = `arrowhead-${startId}-${endId}`;

  return (
    <svg className="absolute inset-0 pointer-events-none z-0" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <marker id={markerId} markerWidth="3" markerHeight="2" refX="2.5" refY="1" orient="auto">
          <polygon points="0 0, 3 1, 0 2" fill="#6366f1" />
        </marker>
      </defs>
      <path 
        d={path} 
        fill="none" 
        stroke="#6366f1" 
        strokeWidth={3} 
        strokeLinecap="round" 
        strokeDasharray={isDrawing ? "5,5" : "none"}
        markerEnd={`url(#${markerId})`}
      />
    </svg>
  );
}

export default function Canvas({ onSelectCard, selectedCard, cards, setCards, projectData, showToast, selectedModel, isEditMode, currentSession, onEditRequest, onCardUpdate, onCardAdd, onCursorMove, connections = [], onCardDelete, onCardReorder, onConnectionCreate, onConnectionDelete }: CanvasProps) {
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const [drawingLine, setDrawingLine] = useState<{ startNodeId: string, endX: number, endY: number, startX: number, startY: number } | null>(null);

  const [generatingCards, setGeneratingCards] = useState<Record<string, boolean>>({});
  const [generatingStory, setGeneratingStory] = useState(false);
  
  // Track which card is being edited inline
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // InfiniteCanvas pan/scale state - lifted here to persist across card edits
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (drawingLine) {
        setDrawingLine(prev => prev ? { ...prev, endX: e.clientX, endY: e.clientY } : null);
      }
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (drawingLine) {
        const dummy = document.getElementById('cursor-dummy');
        if (dummy) dummy.style.display = 'none';
        
        const el = document.elementFromPoint(e.clientX, e.clientY);
        
        if (dummy) dummy.style.display = 'block';

        let connected = false;
        if (el && el.id && el.id.startsWith('node-left-')) {
          const toCardId = el.id.replace('node-left-', '');
          const fromCardId = drawingLine.startNodeId.replace('node-right-', '');
          if (fromCardId !== toCardId) {
            if (!connections.some(c => c.from === fromCardId && c.to === toCardId)) {
              onConnectionCreate?.(fromCardId, toCardId);
            }
            connected = true;
          }
        }
        
        if (connected) {
          setDrawingLine(null);
          return;
        }

        const dist = Math.hypot(e.clientX - drawingLine.startX, e.clientY - drawingLine.startY);
        if (dist < 10 && el && el.id === drawingLine.startNodeId) {
          return;
        }

        setDrawingLine(null);
      }
    };

    if (drawingLine) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [drawingLine]);

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    if (!isEditMode) return;
    setDraggedCardId(cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverCard = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedCardId && draggedCardId !== targetCardId && isEditMode) {
      setDragOverCardId(targetCardId);
      setDragOverColId(null);
    }
  };

  const handleDropOnCard = (e: React.DragEvent, targetCardId: string, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCardId(null);
    setDragOverColId(null);
    if (!draggedCardId || draggedCardId === targetCardId || !isEditMode) return;

    const newCards = [...cards];
    const sourceIndex = newCards.findIndex(c => c.id === draggedCardId);
    const targetIndex = newCards.findIndex(c => c.id === targetCardId);
    
    if (sourceIndex > -1 && targetIndex > -1) {
      const [movedCard] = newCards.splice(sourceIndex, 1);
      const sectionChanged = movedCard.section !== colId;
      movedCard.section = colId as any;
      newCards.splice(targetIndex, 0, movedCard);
      setCards(newCards);

      if (sectionChanged && onCardUpdate) {
        onCardUpdate(movedCard.id, { section: colId as any });
      }
      if (onCardReorder) {
        const sectionCards = newCards.filter(c => c.section === colId);
        onCardReorder(colId, sectionCards.map(c => c.id));
      }
    }
    setDraggedCardId(null);
  };

  const handleDragOverCol = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (draggedCardId && isEditMode) {
      setDragOverColId(colId);
      setDragOverCardId(null);
    }
  };

  const handleDropOnCol = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverColId(null);
    setDragOverCardId(null);
    if (!draggedCardId || !isEditMode) return;

    const newCards = [...cards];
    const sourceIndex = newCards.findIndex(c => c.id === draggedCardId);
    
    if (sourceIndex > -1) {
      const [movedCard] = newCards.splice(sourceIndex, 1);
      const sectionChanged = movedCard.section !== colId;
      movedCard.section = colId as any;
      newCards.push(movedCard);
      setCards(newCards);

      if (sectionChanged && onCardUpdate) {
        onCardUpdate(movedCard.id, { section: colId as any });
      }
      if (onCardReorder) {
        const sectionCards = newCards.filter(c => c.section === colId);
        onCardReorder(colId, sectionCards.map(c => c.id));
      }
    }
    setDraggedCardId(null);
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setDragOverCardId(null);
    setDragOverColId(null);
  };

  const handleAddCard = async (colId: string) => {
    if (!isEditMode) {
      showToast('Enter password to add cards');
      return;
    }
    
    // Get the next index for this section
    const sectionCards = cards.filter(c => c.section === colId);
    const nextIndex = sectionCards.length;
    
    const newCardData = {
      section: colId as any,
      content: '',
      starred: false,
      order: nextIndex
    };
    
    // Call API to create card if callback provided
    if (onCardAdd) {
      try {
        const cardId = await onCardAdd(newCardData);
        if (cardId) {
          setEditingCardId(cardId);
          setEditContent('');
        }
      } catch (error) {
        console.error('Error creating card:', error);
        showToast('Failed to create card');
      }
    } else {
      // Fallback to local state only
      const newCard: CardData = {
        id: `card-${Date.now()}`,
        ...newCardData
      };
      setCards([...cards, newCard]);
      setEditingCardId(newCard.id);
      setEditContent('');
    }
  };

  const handleUpdateCard = (cardId: string, content: string) => {
    if (!isEditMode) return;
    
    // Prevent infinite loop by returning early if content hasn't changed
    const card = cards.find(c => c.id === cardId);
    if (!card || card.content === content) return;

    setCards(cards.map(c => c.id === cardId ? { ...c, content } : c));
    if (onCardUpdate) {
      onCardUpdate(cardId, { content }).catch((error) => {
        console.error('Error updating card:', error);
        showToast('Failed to save changes');
      });
    }
  };

  const handleDoubleClick = (card: CardData) => {
    if (!isEditMode) {
      showToast('Enter password to edit cards');
      return;
    }
    
    setEditingCardId(card.id);
    setEditContent(card.content);
  };

  const handleSaveEdit = async (cardId: string) => {
    if (!isEditMode) return;
    
    // Update local state
    setCards(cards.map(c => c.id === cardId ? { ...c, content: editContent } : c));
    
    // Call API to persist if callback provided
    if (onCardUpdate) {
      try {
        await onCardUpdate(cardId, { content: editContent });
      } catch (error) {
        console.error('Error updating card:', error);
        showToast('Failed to save changes');
      }
    }
    
    setEditingCardId(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingCardId(null);
    setEditContent('');
  };

  const handleGenerateSingle = async (cardId: string, colId: string) => {
    if (!isEditMode) return;
    
    setGeneratingCards(prev => ({ ...prev, [cardId]: true }));
    try {
      const idea = await generateSingleIdea(projectData.client, projectData.background, projectData.notes, colId, selectedModel);
      handleUpdateCard(cardId, idea);
    } catch (e: any) {
      console.error(e);
      if (e?.message?.includes('429') || e?.message?.includes('quota') || e?.status === 429) {
        showToast("AI quota exceeded. Please type your idea manually.");
      } else {
        showToast("Failed to generate idea. Please try again or type manually.");
      }
    } finally {
      setGeneratingCards(prev => ({ ...prev, [cardId]: false }));
    }
  };

  const handleGenerateStory = async () => {
    if (!isEditMode) {
      showToast('Enter password to generate stories');
      return;
    }
    
    if (connections.length === 0) return;
    
    const COLUMN_ORDER = ['place', 'role', 'challenge', 'point_a', 'point_b', 'change', 'story'];
    
    const sources = new Set(connections.map(c => c.from));
    const destinations = connections.map(c => c.to);
    const endpoints = destinations.filter(d => !sources.has(d));
    
    const candidateIds = endpoints.length > 0 ? endpoints : destinations;
    
    const getColIndex = (cardId: string) => {
      const card = cards.find(c => c.id === cardId);
      return card ? COLUMN_ORDER.indexOf(card.section) : -1;
    };
    
    candidateIds.sort((a, b) => getColIndex(b) - getColIndex(a));
    const lastNodeId = candidateIds[0];

    const chain = [];
    let current: string | null = lastNodeId;
    const visited = new Set<string>();
    while (current && !visited.has(current)) {
      visited.add(current);
      const card = cards.find(c => c.id === current);
      if (card) chain.unshift(card.content);
      const prevConn = connections.find(c => c.to === current);
      current = prevConn ? prevConn.from : null;
    }

    setGeneratingStory(true);
    try {
      const story = await generateTransformationStory(projectData.client, projectData.background, projectData.notes, chain.join(" -> "), selectedModel);
      const newCardId = `gen-story-${Date.now()}`;
      if (onCardAdd) {
        const generatedCardId = await onCardAdd({ section: 'story', content: story, starred: false, order: 0 });
        if (generatedCardId && onConnectionCreate) {
          await onConnectionCreate(lastNodeId, generatedCardId);
        }
      } else {
        const newCard: CardData = { id: newCardId, section: 'story', content: story, starred: false };
        setCards([...cards, newCard]);
      }
    } catch (e: any) {
      console.error(e);
      if (e?.message?.includes('429') || e?.message?.includes('quota') || e?.status === 429) {
        showToast("AI quota exceeded. Please add a story card manually.");
      } else {
        showToast("Failed to generate story. Please try again.");
      }
    } finally {
      setGeneratingStory(false);
    }
  };

  // Handle mouse move for cursor tracking
  const handleMouseMove = (e: React.MouseEvent) => {
    if (onCursorMove) {
      const container = document.getElementById('canvas-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        onCursorMove(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  };

  // Handle delete card with confirmation
  const handleDeleteCard = useCallback(async (cardId: string) => {
    if (!isEditMode) {
      showToast('Enter password to delete cards');
      return;
    }
    
    const confirmed = window.confirm('Are you sure you want to delete this card?');
    if (!confirmed) return;
    
    try {
      if (onCardDelete) {
        await onCardDelete(cardId);
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      showToast('Failed to delete card');
    }
  }, [isEditMode, onCardDelete, showToast]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedCard && isEditMode) {
        const activeEl = document.activeElement;
        const isEditingText = activeEl?.tagName === 'TEXTAREA' || activeEl?.tagName === 'INPUT';
        if (!isEditingText) {
          handleDeleteCard(selectedCard);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCard, isEditMode, handleDeleteCard]);

  return (
    <div id="canvas-container" className="h-full w-full relative bg-[#f5f5f5]" onMouseMove={handleMouseMove}>
      <InfiniteCanvas pan={pan} scale={scale} onPanChange={setPan} onScaleChange={setScale}>
        <motion.div 
          id="board-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] shadow-sm border border-gray-200 p-12 inline-block min-w-max relative"
          data-pan-target="true"
        >
          {/* Render established connections */}
          {connections.map(conn => (
            <ConnectionLine key={conn.id} startId={`node-right-${conn.from}`} endId={`node-left-${conn.to}`} />
          ))}
          
          {/* Render currently drawn line */}
          {drawingLine && (
            <ConnectionLine startId={drawingLine.startNodeId} endId="cursor-dummy" isDrawing={true} />
          )}

          <div className="mb-16 relative z-10" data-pan-target="true">
            <h2 className="text-4xl font-bold mb-3 tracking-tight pointer-events-none">Act I</h2>
            <p className="text-2xl text-gray-800 font-medium pointer-events-none">Set up the story from the audience's viewpoint</p>
          </div>

          <div className="flex gap-8 items-start relative z-10" data-pan-target="true">
            {COLUMNS.map((col, colIdx) => {
              // Get cards for this column and sort by order
              const columnCards = cards
                .filter(c => c.section === col.id)
                .sort((a, b) => (a.order || 0) - (b.order || 0));
              
              return (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: colIdx * 0.1 }}
                  key={col.id} 
                  className={`${col.id === 'story' ? 'w-[340px]' : 'w-64'} shrink-0 flex flex-col gap-5 relative rounded-2xl transition-colors ${dragOverColId === col.id && !dragOverCardId ? 'bg-gray-50 ring-2 ring-gray-200 p-2 -m-2' : ''}`}
                  onDragOver={(e) => handleDragOverCol(e, col.id)}
                  onDrop={(e) => handleDropOnCol(e, col.id)}
                  data-pan-target="true"
                >
                  <h3 className="font-bold text-center mb-4 text-lg pointer-events-none">{col.title}</h3>
                  {columnCards.map((card, cardIdx) => (
                    <div 
                      key={card.id}
                      draggable={isEditMode}
                      onDragStart={(e) => handleDragStart(e, card.id)}
                      onDragOver={(e) => handleDragOverCard(e, card.id)}
                      onDrop={(e) => handleDropOnCard(e, card.id, col.id)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCard(card.id);
                      }}
                      onDoubleClick={() => handleDoubleClick(card)}
                      className={`relative p-5 rounded-xl text-sm cursor-grab active:cursor-grabbing transition-all duration-200 group
                        ${col.color} 
                        ${selectedCard === card.id ? 'ring-2 ring-indigo-500 shadow-lg scale-[1.02]' : 'hover:shadow-md border border-black/5'}
                        ${col.id === 'story' ? 'min-h-[240px] text-base p-6 flex items-center justify-center text-center rounded-3xl' : col.id === 'change' ? 'min-h-[180px] flex items-center justify-center text-center rounded-3xl' : 'min-h-[100px]'}
                        ${draggedCardId === card.id ? 'opacity-50 ring-2 ring-indigo-500 scale-105 shadow-2xl z-50' : ''}
                        ${dragOverCardId === card.id ? 'border-t-4 border-t-indigo-500 pt-6' : ''}
                      `}
                    >
                      {/* Left Node (Incoming) */}
                      <div 
                        id={`node-left-${card.id}`}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-[3px] border-gray-400 rounded-full z-10 hover:border-indigo-500 hover:scale-125 transition-transform shadow-sm cursor-crosshair" 
                        title="Incoming connection (Double-click to break)" 
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (drawingLine && isEditMode) {
                            const toCardId = card.id;
                            const fromCardId = drawingLine.startNodeId.replace('node-right-', '');
                            if (fromCardId !== toCardId) {
                              if (!connections.some(c => c.from === fromCardId && c.to === toCardId)) {
                                onConnectionCreate?.(fromCardId, toCardId);
                              }
                            }
                            setDrawingLine(null);
                          }
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        onDragStart={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (isEditMode) {
                            const incomingConns = connections.filter(c => c.to === card.id);
                            incomingConns.forEach(conn => onConnectionDelete?.(conn.id));
                          }
                        }}
                      />
                      
                      {/* Right Node (Outgoing) */}
                      <div 
                        id={`node-right-${card.id}`}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-white border-[3px] border-gray-400 rounded-full z-10 hover:border-indigo-500 hover:scale-125 transition-transform shadow-sm cursor-crosshair" 
                        title="Outgoing connection (Double-click to break)"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (!isEditMode) return;
                          if (drawingLine && drawingLine.startNodeId === `node-right-${card.id}`) {
                            setDrawingLine(null);
                          } else {
                            setDrawingLine({ startNodeId: `node-right-${card.id}`, endX: e.clientX, endY: e.clientY, startX: e.clientX, startY: e.clientY });
                          }
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                        }}
                        onDragStart={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (isEditMode) {
                            const outgoingConns = connections.filter(c => c.from === card.id);
                            outgoingConns.forEach(conn => onConnectionDelete?.(conn.id));
                          }
                        }}
                      />

                      {!!card.starred && <Star size={14} className="absolute top-3 left-3 fill-gray-900 text-gray-900" />}
                      
                      {/* Delete button - visible on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCard(card.id);
                        }}
                        className="absolute bottom-2 right-2 p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete card"
                      >
                        <Trash2 size={14} />
                      </button>
                      
                      {/* Card Number */}
                      <div className="absolute top-2 right-2 text-xs text-gray-400 font-mono">
                        #{cardIdx + 1}
                      </div>
                      
                      {/* Editing Mode */}
                      {editingCardId === card.id ? (
                        <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                          <textarea
                            autoFocus
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder="Type your idea..."
                            className="w-full text-sm p-2 rounded border border-gray-300 resize-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-text"
                            onKeyDown={(e) => { 
                              if (e.key === 'Enter' && !e.shiftKey) { 
                                e.preventDefault(); 
                                handleSaveEdit(card.id); 
                              }
                              if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleSaveEdit(card.id)}
                              className="flex-1 py-1.5 px-2 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700"
                            >
                              Save
                            </button>
                            <button 
                              onClick={handleCancelEdit}
                              className="flex-1 py-1.5 px-2 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : card.content ? (
                        <div className={`${card.starred ? 'mt-5' : ''} font-medium leading-snug text-gray-900`}>
                          {card.content}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 mt-2" onClick={e => e.stopPropagation()}>
                          <textarea
                            autoFocus
                            placeholder="Type your idea..."
                            className="w-full text-sm p-2 rounded border border-gray-300 resize-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-text"
                            onBlur={(e) => handleUpdateCard(card.id, e.target.value)}
                            onKeyDown={(e) => { 
                              if (e.key === 'Enter' && !e.shiftKey) { 
                                e.preventDefault(); 
                                handleUpdateCard(card.id, e.currentTarget.value); 
                              }
                            }}
                          />
                          <button 
                            onClick={() => handleGenerateSingle(card.id, col.id)} 
                            disabled={generatingCards[card.id]}
                            className="flex items-center justify-center gap-2 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {generatingCards[card.id] ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} 
                            Generate Idea
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {col.id !== 'change' && col.id !== 'story' && isEditMode && (
                    <button 
                      onClick={() => handleAddCard(col.id)}
                      className="mx-auto w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-all mt-2 shadow-sm cursor-pointer"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </InfiniteCanvas>

      {/* Render cursor dummy outside so it uses screen coordinates correctly */}
      {drawingLine && (
        <div id="cursor-dummy" style={{ position: 'fixed', left: drawingLine.endX, top: drawingLine.endY, width: 1, height: 1, pointerEvents: 'none', zIndex: 9999 }} />
      )}
      
      {/* Floating Save/Download buttons */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-50">
        {connections.length > 0 && isEditMode && (
          <button 
            onClick={handleGenerateStory}
            disabled={generatingStory}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium shadow-lg transition-all disabled:opacity-70"
          >
            {generatingStory ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            Generate Story
          </button>
        )}
        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-full shadow-xl border border-gray-200/50 p-3">
          <button 
            className="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-700 hover:text-gray-900"
            onClick={() => {
              if (currentSession?.id) {
                window.open(`/api/sessions/${currentSession.id}/export/markdown`, '_blank');
              }
            }}
            title="Export as Markdown"
          >
            <Save size={24} />
          </button>
          <div className="w-px h-6 bg-gray-200"></div>
          <button 
            className="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-700 hover:text-gray-900"
            onClick={() => {
              if (currentSession?.id) {
                window.open(`/api/sessions/${currentSession.id}/export/zip`, '_blank');
              }
            }}
            title="Download ZIP"
          >
            <Download size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
