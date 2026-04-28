import { useMemo, useState } from "react";
import { generateChatResponse, type ModelType } from "../../services/ai";
import type { ChatMessage, ChatPanelContext, ProjectBackgroundApplyMode } from "./types";

interface UseChatPanelOptions {
  context: ChatPanelContext;
  selectedModel: ModelType;
  onApplyProjectBackgroundDraft?: (text: string, mode: ProjectBackgroundApplyMode) => void;
}

function parseProjectBackgroundDraft(text: string): { displayText: string; draft?: string } {
  const match = text.match(/<project-background>([\s\S]*?)<\/project-background>/i);
  if (!match) {
    return { displayText: text.trim() };
  }

  const draft = match[1].trim();
  const wrapperText = text.replace(match[0], "").trim();
  const displayText = wrapperText
    ? `${wrapperText}\n\n${draft}`
    : draft;

  return {
    displayText: displayText || "Here is a clean project background draft ready to use.",
    draft: draft || undefined,
  };
}

function isApplyBackgroundCommand(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return (
    normalized.includes("add that text to project background") ||
    normalized.includes("add this to project background") ||
    normalized.includes("use that as project background") ||
    normalized.includes("replace the project background with that") ||
    normalized.includes("replace project background with that") ||
    normalized.includes("apply that to project background")
  );
}

export function useChatPanel({ context, selectedModel, onApplyProjectBackgroundDraft }: UseChatPanelOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const starterLabel = context.currentView === "new"
    ? "Start Guided Q&A"
    : "Help me generate background description";

  const starterPrompt = context.currentView === "new"
    ? "Let's start the guided Q&A to build my project background."
    : "Help me generate a background description for my project.";

  const emptyState = context.currentView === "new"
    ? "Start a conversation to generate background descriptions and ideas."
    : "Ask about the selected context, your overview, or how to improve the current cards.";

  const chatContextSummary = useMemo(() => {
    if (context.currentView === "new") {
      return [
        { label: "Context", value: "Project Overview" },
        { label: "Client", value: context.projectData.client || "Not set yet" },
      ];
    }

    return [
      { label: "Context", value: "Canvas" },
      { label: "Session", value: context.currentSession?.name || "No session loaded" },
      {
        label: "Selected Card",
        value: context.selectedCard
          ? `${context.selectedCard.section.replace("_", " ")}`
          : "No card selected",
      },
      { label: "Edit Access", value: context.isEditMode ? "Enabled" : "View only" },
    ];
  }, [context]);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const trimmedInput = input.trim();

    if (context.currentView === "new" && onApplyProjectBackgroundDraft && isApplyBackgroundCommand(trimmedInput)) {
      const latestDraft = [...messages].reverse().find((message) => message.projectBackgroundDraft?.trim());

      if (latestDraft?.projectBackgroundDraft) {
        onApplyProjectBackgroundDraft(latestDraft.projectBackgroundDraft, "replace");
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "user", text: trimmedInput },
          {
            id: (Date.now() + 1).toString(),
            role: "model",
            text: "Done. I used the latest clean background draft and replaced the Project Background field.",
          },
        ]);
        setInput("");
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: trimmedInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const responseText = await generateChatResponse(
        context.projectData.client,
        context.projectData.background,
        context.projectData.notes,
        userMessage.text,
        history,
        selectedModel,
        context.currentView,
        {
          sessionId: context.currentSession?.id,
          sessionName: context.currentSession?.name,
          canEdit: context.isEditMode,
          attachments: (context.attachments || []).slice(0, 5).map((attachment) => ({
            name: attachment.name,
            summary: attachment.summary,
            extractedText: attachment.extractedText,
          })),
          selectedCard: context.selectedCard
            ? {
                id: context.selectedCard.id,
                section: context.selectedCard.section,
                content: context.selectedCard.content,
                starred: context.selectedCard.starred,
              }
            : null,
        }
      );

      const parsedResponse = parseProjectBackgroundDraft(responseText);

      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: parsedResponse.displayText,
        projectBackgroundDraft: parsedResponse.draft,
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: "Sorry, I encountered an error while trying to respond. Please try again.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return {
    messages,
    input,
    setInput,
    isTyping,
    handleSendMessage,
    starterLabel,
    starterPrompt,
    emptyState,
    chatContextSummary,
  };
}
