/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import RightPanel from './components/RightPanel';
import NewProject from './components/NewProject';
import Canvas from './components/Canvas';
import { CardData } from './types';
import { INITIAL_CARDS } from './data';
import { generateCards, ModelType } from './services/ai';

export default function App() {
  const [currentView, setCurrentView] = useState<'new' | 'canvas'>('new');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelType>('minimax-m2.5');
  
  const [projectData, setProjectData] = useState({ client: '', background: '', notes: '' });
  const [cards, setCards] = useState<CardData[]>(INITIAL_CARDS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleStartProject = async () => {
    if (!projectData.client && !projectData.background) {
      setCurrentView('canvas');
      return;
    }
    
    setIsGenerating(true);
    try {
      const generatedCards = await generateCards(projectData.client, projectData.background, projectData.notes, selectedModel);
      if (generatedCards && generatedCards.length > 0) {
        setCards(generatedCards);
      } else {
        setCards([]);
      }
      setCurrentView('canvas');
      setSelectedCard(null);
    } catch (error: any) {
      console.error("Failed to generate cards", error);
      if (error?.message?.includes('429') || error?.message?.includes('quota') || error?.status === 429) {
        showToast("AI quota exceeded. Starting with an empty canvas.");
      } else if (error?.message) {
        showToast(`Error: ${error.message}`);
      } else {
        showToast("Failed to generate cards. Starting with an empty canvas.");
      }
      setCards([]);
      setCurrentView('canvas');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-900 font-sans overflow-hidden antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-red-500 text-white px-6 py-3 rounded-full shadow-lg font-medium flex items-center gap-2">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 opacity-80 hover:opacity-100">&times;</button>
        </div>
      )}
      <Sidebar onViewChange={setCurrentView} currentView={currentView} selectedModel={selectedModel} onModelChange={setSelectedModel} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <div className="flex flex-1 overflow-hidden relative">
          <main className="flex-1 overflow-auto relative bg-gray-50/30">
            {currentView === 'new' ? (
              <NewProject 
                onStart={handleStartProject} 
                projectData={projectData}
                setProjectData={setProjectData}
                isGenerating={isGenerating}
              />
            ) : (
              <Canvas onSelectCard={setSelectedCard} selectedCard={selectedCard} cards={cards} setCards={setCards} projectData={projectData} showToast={showToast} selectedModel={selectedModel} />
            )}
          </main>
          <RightPanel selectedCard={selectedCard} currentView={currentView} cards={cards} projectData={projectData} selectedModel={selectedModel} />
        </div>
      </div>
    </div>
  );
}
