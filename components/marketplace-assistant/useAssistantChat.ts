"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import {
  getLatestAssistantConversationAction,
  clearAssistantConversationAction,
} from "@/services/ai/marketplace-assistant.actions";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/** Mirrors AssistantStreamEvent in services/ai/marketplace-assistant.service.ts — duplicated (not imported) since that module is server-only and must never reach the client bundle. */
type AssistantSseEvent =
  | { type: "meta"; conversationId: string }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

const GUEST_HISTORY_KEY = "selecta_assistant_history";
const GUEST_HISTORY_LIMIT = 40;

function loadGuestHistory(): AssistantMessage[] {
  try {
    const raw = localStorage.getItem(GUEST_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useAssistantChat(isAuthenticated: boolean) {
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  /** Guards against the history fetch below (a ~1s DB round trip) resolving after the user has already started a new conversation — without this, a fast tap on a suggested prompt right after opening the drawer could have its in-flight message silently overwritten by stale server history. */
  const hasSentRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      if (isAuthenticated) {
        try {
          const conversation = await getLatestAssistantConversationAction();
          if (!cancelled && !hasSentRef.current && conversation) {
            setConversationId(conversation.id);
            setMessages(conversation.messages.map((m, i) => ({ id: `${conversation.id}-${i}`, role: m.role, content: m.content })));
          }
        } catch {
          // No conversation yet, or the request failed — start with a blank slate either way.
        }
      } else if (!cancelled && !hasSentRef.current) {
        setMessages(loadGuestHistory());
      }
      if (!cancelled) setHasLoadedHistory(true);
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated && hasLoadedHistory) {
      localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(messages.slice(-GUEST_HISTORY_LIMIT)));
    }
  }, [messages, isAuthenticated, hasLoadedHistory]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      hasSentRef.current = true;
      setError(null);
      const priorTurns = messages.map((m) => ({ role: m.role, content: m.content }));
      const userMessage: AssistantMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
      const assistantMessageId = crypto.randomUUID();
      setMessages((prev) => [...prev, userMessage, { id: assistantMessageId, role: "assistant", content: "" }]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            conversationId,
            message: trimmed,
            history: isAuthenticated ? undefined : priorTurns,
            context: {
              pathname,
              productId: params?.id,
              categoryId: searchParams?.get("categoryId") ?? undefined,
              searchQuery: searchParams?.get("q") ?? undefined,
            },
          }),
        });

        if (!response.ok || !response.body) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "Something went wrong — please try again.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const line = frame.replace(/^data:\s*/, "").trim();
            if (!line) continue;
            const event = JSON.parse(line) as AssistantSseEvent;

            if (event.type === "meta") {
              setConversationId(event.conversationId);
            } else if (event.type === "delta") {
              setMessages((prev) => prev.map((m) => (m.id === assistantMessageId ? { ...m, content: m.content + event.text } : m)));
            } else if (event.type === "error") {
              setError(event.message);
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User-initiated stop or drawer close — not an error state.
        } else {
          setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [conversationId, isAuthenticated, isStreaming, messages, pathname, params, searchParams],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const clear = useCallback(async () => {
    abortRef.current?.abort();
    if (isAuthenticated && conversationId) {
      await clearAssistantConversationAction(conversationId).catch(() => {});
    } else if (!isAuthenticated) {
      localStorage.removeItem(GUEST_HISTORY_KEY);
    }
    setMessages([]);
    setConversationId(undefined);
    setError(null);
    setIsStreaming(false);
  }, [isAuthenticated, conversationId]);

  return { messages, sendMessage, isStreaming, error, clear, stop, hasLoadedHistory };
}
