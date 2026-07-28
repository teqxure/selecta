"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import type { AssistantMessage } from "./useAssistantChat";

export function MessageList({ messages, isStreaming }: { messages: AssistantMessage[]; isStreaming: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const lastMessage = messages[messages.length - 1];
  const isWaitingForFirstToken = isStreaming && lastMessage?.role === "assistant" && lastMessage.content === "";

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} isTyping={isWaitingForFirstToken && message.id === lastMessage.id} />
      ))}
      <div ref={endRef} aria-hidden />
    </div>
  );
}
