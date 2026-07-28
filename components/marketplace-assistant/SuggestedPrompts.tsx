"use client";

export function SuggestedPrompts({ prompts, onSelect, disabled }: { prompts: string[]; onSelect: (prompt: string) => void; disabled?: boolean }) {
  if (prompts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
          className="rounded-full border border-border bg-secondary px-3.5 py-2 text-left text-sm text-secondary-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
