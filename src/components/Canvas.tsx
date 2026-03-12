import React, { useState, useEffect } from 'react';
import { Star, Plus, Save, Download, Sparkles, Loader2 } from 'lucide-react';
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

export default function Canvas({ onSelectCard, selectedCard, cards, setCards, projectData, showToast, selectedModel }: CanvasProps) {
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const [connections, setConnections] = useState<{ id: string, from: string, to: string }[]>([]);
  const [drawingLine, setDrawingLine] = useState<{ startNodeId: string, endX: number, endY: number, startX: number, startY: number } | null>(null);

  const [generatingCards, setGeneratingCards] = useState<Record<string, boolean>>({});
  const [generatingStory, setGeneratingStory] = useState(false);

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
            setConnections(prev => {
              if (prev.some(c => c.from === fromCardId && c.to === toCardId)) return prev;
              return [...prev, { id: `${fromCardId}-${toCardId}`, from: fromCardId, to: toCardId }];
            });
            connected = true;
          }
        }
        
        if (connected) {
          setDrawingLine(null);
          return;
        }

        const dist = Math.hypot(e.clientX - drawingLine.startX, e.clientY - drawingLine.startY);
        if (dist < 10 && el && el.id === drawingLine.startNodeId) {
          // It was a click on the start node. Keep drawing mode active.
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
    setDraggedCardId(cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverCard = (e: React.DragEvent, targetCardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedCardId && draggedCardId !== targetCardId) {
      setDragOverCardId(targetCardId);
      setDragOverColId(null);
    }
  };

  const handleDropOnCard = (e: React.DragEvent, targetCardId: string, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCardId(null);
    setDragOverColId(null);
    if (!draggedCardId || draggedCardId === targetCardId) return;

    const newCards = [...cards];
    const sourceIndex = newCards.findIndex(c => c.id === draggedCardId);
    const targetIndex = newCards.findIndex(c => c.id === targetCardId);
    
    if (sourceIndex > -1 && targetIndex > -1) {
      const [movedCard] = newCards.splice(sourceIndex, 1);
      movedCard.section = colId as any;
      newCards.splice(targetIndex, 0, movedCard);
      setCards(newCards);
    }
    setDraggedCardId(null);
  };

  const handleDragOverCol = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (draggedCardId) {
      setDragOverColId(colId);
      setDragOverCardId(null);
    }
  };

  const handleDropOnCol = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverColId(null);
    setDragOverCardId(null);
    if (!draggedCardId) return;

    const newCards = [...cards];
    const sourceIndex = newCards.findIndex(c => c.id === draggedCardId);
    
    if (sourceIndex > -1) {
      const [movedCard] = newCards.splice(sourceIndex, 1);
      movedCard.section = colId as any;
      newCards.push(movedCard);
      setCards(newCards);
    }
    setDraggedCardId(null);
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setDragOverCardId(null);
    setDragOverColId(null);
  };

  const handleAddCard = (colId: string) => {
    const newCard: CardData = {
      id: `card-${Date.now()}`,
      section: colId as any,
      content: '',
      starred: false
    };
    setCards([...cards, newCard]);
  };

  const handleUpdateCard = (cardId: string, content: string) => {
    setCards(cards.map(c => c.id === cardId ? { ...c, content } : c));
  };

  const handleGenerateSingle = async (cardId: string, colId: string) => {
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
      const newCard: CardData = { id: newCardId, section: 'story', content: story, starred: false };
      setCards([...cards, newCard]);
      setConnections([...connections, { id: `${lastNodeId}-${newCardId}`, from: lastNodeId, to: newCardId }]);
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

  return (
    <div id="canvas-container" className="h-full w-full relative bg-[#f5f5f5]">
      <InfiniteCanvas>
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
            {COLUMNS.map((col, colIdx) => (
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
                {cards.filter(c => c.section === col.id).map((card, cardIdx) => (
                  <div 
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card.id)}
                    onDragOver={(e) => handleDragOverCard(e, card.id)}
                    onDrop={(e) => handleDropOnCard(e, card.id, col.id)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCard(card.id);
                    }}
                    className={`relative p-5 rounded-xl text-sm cursor-grab active:cursor-grabbing transition-all duration-200
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
                        if (drawingLine) {
                          const toCardId = card.id;
                          const fromCardId = drawingLine.startNodeId.replace('node-right-', '');
                          if (fromCardId !== toCardId) {
                            setConnections(prev => {
                              if (prev.some(c => c.from === fromCardId && c.to === toCardId)) return prev;
                              return [...prev, { id: `${fromCardId}-${toCardId}`, from: fromCardId, to: toCardId }];
                            });
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
                        setConnections(prev => prev.filter(c => c.to !== card.id));
                      }}
                    />
                    
                    {/* Right Node (Outgoing) */}
                    <div 
                      id={`node-right-${card.id}`}
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-white border-[3px] border-gray-400 rounded-full z-10 hover:border-indigo-500 hover:scale-125 transition-transform shadow-sm cursor-crosshair" 
                      title="Outgoing connection (Double-click to break)"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault(); // Prevent drag start
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
                        setConnections(prev => prev.filter(c => c.from !== card.id));
                      }}
                    />

                    {card.starred && <Star size={14} className="absolute top-3 left-3 fill-gray-900 text-gray-900" />}
                    
                    {card.content ? (
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
                
                {col.id !== 'change' && col.id !== 'story' && (
                  <button 
                    onClick={() => handleAddCard(col.id)}
                    className="mx-auto w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-all mt-2 shadow-sm cursor-pointer"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </InfiniteCanvas>

      {/* Render cursor dummy outside so it uses screen coordinates correctly */}
      {drawingLine && (
        <div id="cursor-dummy" style={{ position: 'fixed', left: drawingLine.endX, top: drawingLine.endY, width: 1, height: 1, pointerEvents: 'none', zIndex: 9999 }} />
      )}
      
      {/* Floating Save/Download buttons */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-50">
        {connections.length > 0 && (
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
          <button className="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-700 hover:text-gray-900"><Save size={24} /></button>
          <div className="w-px h-6 bg-gray-200"></div>
          <button className="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-700 hover:text-gray-900"><Download size={24} /></button>
        </div>
      </div>
    </div>
  );
}
