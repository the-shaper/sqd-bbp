import React from 'react';
import { UploadCloud, Save, Loader2 } from 'lucide-react';

interface NewProjectProps {
  onStart: () => void;
  projectData: { client: string; background: string; notes: string };
  setProjectData: React.Dispatch<React.SetStateAction<{ client: string; background: string; notes: string }>>;
  isGenerating: boolean;
}

export default function NewProject({ onStart, projectData, setProjectData, isGenerating }: NewProjectProps) {
  return (
    <div className="max-w-4xl mx-auto p-12">
      <h1 className="text-4xl font-bold mb-10">New Project</h1>
      
      <div className="mb-10">
        <label className="block text-xl font-bold mb-4">Who is the Client</label>
        <input 
          type="text" 
          value={projectData.client}
          onChange={(e) => setProjectData(p => ({ ...p, client: e.target.value }))}
          className="w-full border border-gray-300 rounded-md p-4 bg-white text-gray-900 text-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
          placeholder="Enter client name"
          disabled={isGenerating}
        />
      </div>

      <div className="flex items-center gap-6 mb-10">
        <button disabled={isGenerating} className="flex items-center gap-3 px-8 py-4 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 font-medium text-lg transition-colors disabled:opacity-50">
          Upload Brief <UploadCloud size={20} />
        </button>
        <span className="text-gray-500 text-base">Add a note in regards to the brief</span>
      </div>

      <div className="mb-10">
        <label className="block text-3xl font-bold mb-4">Project Background</label>
        <textarea 
          value={projectData.background}
          onChange={(e) => setProjectData(p => ({ ...p, background: e.target.value }))}
          className="w-full h-48 border border-gray-300 rounded-md p-5 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg disabled:opacity-50"
          placeholder="Type description or add more details"
          disabled={isGenerating}
        ></textarea>
        <button 
          onClick={onStart}
          disabled={isGenerating}
          className="w-full mt-4 py-4 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md font-bold flex items-center justify-center gap-3 text-lg transition-colors disabled:opacity-70"
        >
          {isGenerating ? (
            <>Generating Act I Ideas <Loader2 size={20} className="animate-spin" /></>
          ) : (
            <>Save & Generate Canvas <Save size={20} /></>
          )}
        </button>
      </div>

      <div>
        <label className="block text-2xl font-bold mb-4">Additional Notes:</label>
        <textarea 
          value={projectData.notes}
          onChange={(e) => setProjectData(p => ({ ...p, notes: e.target.value }))}
          className="w-full h-48 border border-gray-300 rounded-md p-5 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg disabled:opacity-50"
          placeholder="Type description or add more details"
          disabled={isGenerating}
        ></textarea>
      </div>
    </div>
  );
}
