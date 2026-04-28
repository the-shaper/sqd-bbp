import React from "react";
import type { ChatActionRequest } from "./types";

interface ChatActionConfirmationProps {
  action?: ChatActionRequest | null;
}

export default function ChatActionConfirmation({ action }: ChatActionConfirmationProps) {
  if (!action) return null;

  return (
    <div className="mx-6 mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="text-sm font-semibold text-amber-900 mb-1">Pending Edit Confirmation</div>
      <div className="text-sm text-amber-800 mb-3">{action.summary}</div>
      <div className="flex gap-2">
        <button
          onClick={action.onApprove}
          className="px-3 py-1.5 rounded-md bg-amber-900 text-white text-sm font-medium"
        >
          Apply
        </button>
        <button
          onClick={action.onReject}
          className="px-3 py-1.5 rounded-md border border-amber-300 text-amber-900 text-sm font-medium bg-white"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

