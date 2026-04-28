import type { CardData, ProjectAttachment } from "../../types";

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  projectBackgroundDraft?: string;
}

export interface ChatActionRequest {
  summary: string;
  onApprove?: () => void;
  onReject?: () => void;
}

export interface ChatPanelContext {
  currentView: "new" | "canvas";
  currentSession?: { id: string; name: string } | null;
  selectedCard?: CardData | null;
  projectData: { client: string; background: string; notes: string };
  isEditMode?: boolean;
  attachments?: ProjectAttachment[];
}

export type ProjectBackgroundApplyMode = "replace" | "append";
