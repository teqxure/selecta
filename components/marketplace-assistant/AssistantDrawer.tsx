"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssistantChat } from "./useAssistantChat";
import { WelcomeScreen } from "./WelcomeScreen";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

export interface AssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  welcomeMessage: string;
  placeholderText: string;
  suggestedPrompts: string[];
}

/**
 * Built on the native <dialog> element like components/ui/Modal.tsx — free
 * focus trapping, Escape-to-close, top-layer stacking — but right-anchored
 * and full-height rather than centered, so it's a separate component
 * rather than a reuse of Modal itself.
 */
export function AssistantDrawer({ open, onClose, isAuthenticated, welcomeMessage, placeholderText, suggestedPrompts }: AssistantDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { messages, sendMessage, isStreaming, error, clear, stop } = useAssistantChat(isAuthenticated);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    const raf = requestAnimationFrame(() => setIsVisible(false));
    const timeout = setTimeout(() => {
      if (dialog.open) dialog.close();
    }, 200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      aria-label="Selecta Assistant"
      className={cn(
        "fixed inset-0 m-0 h-full max-h-full w-full max-w-full border-0 bg-transparent p-0 backdrop:bg-midnight/50",
        "sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:w-[420px] sm:max-w-[90vw]",
      )}
    >
      <div
        className={cn(
          "flex h-full w-full flex-col bg-background text-foreground shadow-2xl transition-transform duration-200 ease-out",
          isVisible ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full",
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Sparkles className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="font-display text-base font-semibold">Selecta Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clear}
                aria-label="Clear conversation"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </header>

        {messages.length === 0 ? (
          <WelcomeScreen welcomeMessage={welcomeMessage} suggestedPrompts={suggestedPrompts} onSelectPrompt={sendMessage} />
        ) : (
          <MessageList messages={messages} isStreaming={isStreaming} />
        )}

        {error && (
          <div className="mx-4 mb-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">{error}</div>
        )}

        <ChatInput placeholder={placeholderText} isStreaming={isStreaming} onSend={sendMessage} onStop={stop} />
      </div>
    </dialog>
  );
}
