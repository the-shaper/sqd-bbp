import React, { useMemo, useRef, useState } from 'react';
import { UploadCloud, Save, Loader2, FileText, Image as ImageIcon, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { ProjectAttachment } from '../types';

interface NewProjectProps {
  projectName: string;
  onRenameProject: (name: string) => Promise<void>;
  onStart: () => void;
  projectData: { client: string; background: string; notes: string };
  setProjectData: React.Dispatch<React.SetStateAction<{ client: string; background: string; notes: string }>>;
  isGenerating: boolean;
  attachments: ProjectAttachment[];
  isUploadingAttachments: boolean;
  onUploadFiles: (files: FileList | null) => void;
  onUseAttachmentText: (attachment: ProjectAttachment, target: 'background' | 'notes') => void;
  onDeleteAttachment: (attachmentId: string) => Promise<void>;
}

export default function NewProject({
  projectName,
  onRenameProject,
  onStart,
  projectData,
  setProjectData,
  isGenerating,
  attachments,
  isUploadingAttachments,
  onUploadFiles,
  onUseAttachmentText,
  onDeleteAttachment,
}: NewProjectProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState(projectName);
  const [expandedAttachments, setExpandedAttachments] = useState<Record<string, boolean>>({});

  const sortedAttachments = useMemo(() => attachments, [attachments]);

  const handleProjectNameSave = async () => {
    const trimmed = projectNameDraft.trim();
    if (!trimmed || trimmed === projectName) {
      setProjectNameDraft(projectName);
      setIsEditingProjectName(false);
      return;
    }

    await onRenameProject(trimmed);
    setIsEditingProjectName(false);
  };

  return (
    <div className="h-full overflow-auto max-w-6xl mx-auto p-12">
      <div className="mb-14">
        {isEditingProjectName ? (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={projectNameDraft}
              onChange={(e) => setProjectNameDraft(e.target.value)}
              onBlur={handleProjectNameSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleProjectNameSave();
                if (e.key === 'Escape') {
                  setProjectNameDraft(projectName);
                  setIsEditingProjectName(false);
                }
              }}
              className="text-[1.75rem] font-bold tracking-tight border-b border-gray-300 bg-transparent outline-none focus:border-gray-900 min-w-[20rem]"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <h1 className="text-[2rem] font-bold tracking-tight">{projectName || 'Project Name'}</h1>
            <button
              onClick={() => {
                setProjectNameDraft(projectName);
                setIsEditingProjectName(true);
              }}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              title="Edit project name"
            >
              <Pencil size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[320px_1px_1fr] gap-8 items-start mb-14">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp"
            onChange={(e) => onUploadFiles(e.target.files)}
          />
        <button
          disabled={isGenerating || isUploadingAttachments}
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 border border-gray-300 rounded-none bg-gray-50 hover:bg-gray-100 font-semibold text-base transition-colors disabled:opacity-50"
        >
          Upload Docs <UploadCloud size={22} />
        </button>
        </div>
        <div className="self-stretch w-px bg-gray-300" />
        <div>
          <div className="text-lg font-bold mb-4">Documents</div>
          <div className="space-y-2">
            {sortedAttachments.length === 0 ? (
              <div className="text-gray-500 text-sm py-3">
                No documents yet. Upload PDFs, Word docs, spreadsheets, markdown, text files, or images.
              </div>
            ) : (
              sortedAttachments.map((attachment) => {
                const isImage = attachment.mimeType.startsWith('image/');
                const expanded = !!expandedAttachments[attachment.id];

                return (
                  <div key={attachment.id} className="border-b border-gray-200 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-500">
                        {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
                      </div>
                      <button
                        onClick={() =>
                          setExpandedAttachments((prev) => ({ ...prev, [attachment.id]: !prev[attachment.id] }))
                        }
                        className="flex items-center gap-2 text-left flex-1 min-w-0"
                      >
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <span className="truncate text-base text-gray-900">{attachment.name}</span>
                      </button>
                      <button
                        onClick={() => onDeleteAttachment(attachment.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete upload"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {expanded && (
                      <div className="mt-3 ml-9 rounded-lg bg-gray-50 border border-gray-200 p-4">
                        <div className="text-sm text-gray-500 mb-2 capitalize">
                          {attachment.extractionStatus} • {(attachment.size / 1024).toFixed(1)} KB
                        </div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                          {attachment.summary}
                        </div>
                        {attachment.extractedText && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => onUseAttachmentText(attachment, 'background')}
                              className="px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100"
                            >
                              Use in overview
                            </button>
                            <button
                              onClick={() => onUseAttachmentText(attachment, 'notes')}
                              className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
                            >
                              Add to notes
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 mb-10">
        <div className="h-px flex-1 border-t border-dashed border-gray-400" />
        <div className="text-lg font-bold">OR</div>
        <div className="h-px flex-1 border-t border-dashed border-gray-400" />
      </div>

      <div className="mb-10">
        <label className="block text-[1.75rem] font-bold mb-5">Project Overview</label>
        <textarea 
          value={projectData.background}
          onChange={(e) => setProjectData(p => ({ ...p, background: e.target.value }))}
          className="w-full min-h-[420px] border border-gray-300 rounded-none p-8 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base leading-relaxed disabled:opacity-50"
          placeholder={`No brief? please describe the project here with as much detail as possible\n\nOR\n\nUse the AI assistant on the right to help write a Project Overview`}
          disabled={isGenerating}
        ></textarea>
        <button 
          onClick={onStart}
          disabled={isGenerating}
          className="w-full mt-6 py-4 bg-black text-white hover:bg-gray-900 border border-black rounded-none font-bold flex items-center justify-center gap-3 text-lg transition-colors disabled:opacity-70"
        >
          {isGenerating ? (
            <>Generating Act I Ideas <Loader2 size={20} className="animate-spin" /></>
          ) : (
            <>Save & Generate Canvas <Save size={20} /></>
          )}
        </button>
      </div>

      <div className="mt-10">
        <label className="block text-lg font-bold mb-4">Additional Notes</label>
        <textarea 
          value={projectData.notes}
          onChange={(e) => setProjectData(p => ({ ...p, notes: e.target.value }))}
          className="w-full h-40 border border-gray-300 rounded-none p-5 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base disabled:opacity-50"
          placeholder="Type description or add more details"
          disabled={isGenerating}
        ></textarea>
      </div>
    </div>
  );
}
