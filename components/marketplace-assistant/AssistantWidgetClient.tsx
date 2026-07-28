"use client";

import { useState } from "react";
import { FloatingAssistantButton } from "./FloatingAssistantButton";
import { AssistantDrawer } from "./AssistantDrawer";

export interface AssistantWidgetClientProps {
  isAuthenticated: boolean;
  isFloatingButtonEnabled: boolean;
  welcomeMessage: string;
  placeholderText: string;
  suggestedPrompts: string[];
}

export function AssistantWidgetClient({
  isAuthenticated,
  isFloatingButtonEnabled,
  welcomeMessage,
  placeholderText,
  suggestedPrompts,
}: AssistantWidgetClientProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isFloatingButtonEnabled && !isOpen && <FloatingAssistantButton onClick={() => setIsOpen(true)} />}
      <AssistantDrawer
        open={isOpen}
        onClose={() => setIsOpen(false)}
        isAuthenticated={isAuthenticated}
        welcomeMessage={welcomeMessage}
        placeholderText={placeholderText}
        suggestedPrompts={suggestedPrompts}
      />
    </>
  );
}
