"use client";

import { Search, Scale, Sparkles, Info, HelpCircle } from "lucide-react";
import { SuggestedPrompts } from "./SuggestedPrompts";

const CAPABILITIES = [
  { icon: Search, label: "Find products" },
  { icon: Scale, label: "Compare products" },
  { icon: Sparkles, label: "Recommend products" },
  { icon: Info, label: "Explain listings" },
  { icon: HelpCircle, label: "Answer marketplace questions" },
];

export function WelcomeScreen({
  welcomeMessage,
  suggestedPrompts,
  onSelectPrompt,
}: {
  welcomeMessage: string;
  suggestedPrompts: string[];
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
      <p className="text-base font-medium text-foreground">{welcomeMessage}</p>

      <ul className="flex flex-col gap-2">
        {CAPABILITIES.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
            {label}
          </li>
        ))}
      </ul>

      {suggestedPrompts.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Try asking</p>
          <SuggestedPrompts prompts={suggestedPrompts} onSelect={onSelectPrompt} />
        </div>
      )}
    </div>
  );
}
