"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";

export function SearchBar({
  initialQuery,
  recentSearches,
  popularSearches,
}: {
  initialQuery: string;
  recentSearches: string[];
  popularSearches: string[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    const timeout = setTimeout(() => {
      fetch(`/api/search-suggestions?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => setSuggestions(data.suggestions ?? []))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(timeout);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToQuery(query: string) {
    setIsOpen(false);
    router.push(`${ROUTES.search}?q=${encodeURIComponent(query)}`);
  }

  const showRecentOrPopular = value.trim().length === 0 && (recentSearches.length > 0 || popularSearches.length > 0);
  const dropdownItems = value.trim().length >= 2 ? suggestions : [];

  return (
    <div ref={containerRef} className="relative">
      <form
        action={ROUTES.search}
        method="GET"
        className="flex h-13 items-center gap-2 rounded-full border border-border bg-secondary pl-5 pr-1.5 shadow-[var(--shadow-card)] transition-colors focus-within:border-accent/50"
      >
        <SearchIcon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" strokeWidth={2} />
        <input
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search by title or brand"
          aria-label="Search"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <Button type="submit" variant="accent" size="sm" className="rounded-full">
          Search
        </Button>
      </form>

      {isOpen && (dropdownItems.length > 0 || showRecentOrPopular) && (
        <div className="absolute z-10 mt-2 w-full rounded-2xl border border-border bg-background p-2 shadow-[var(--shadow-card)]">
          {dropdownItems.length > 0 &&
            dropdownItems.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => goToQuery(suggestion)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
              >
                <SearchIcon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                {suggestion}
              </button>
            ))}

          {showRecentOrPopular && recentSearches.length > 0 && (
            <div className="px-3 pt-1 pb-0.5">
              <p className="text-xs font-medium text-muted-foreground">Recent searches</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => goToQuery(term)}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs text-secondary-foreground hover:bg-accent/15 hover:text-accent"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showRecentOrPopular && popularSearches.length > 0 && (
            <div className="px-3 pt-2 pb-1">
              <p className="text-xs font-medium text-muted-foreground">Popular right now</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => goToQuery(term)}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs text-secondary-foreground hover:bg-accent/15 hover:text-accent"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
