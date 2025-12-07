import { useEffect, useState } from "react";

export interface Draft {
  frontMatter: Record<string, unknown>;
  body: string;
}

export function useDraft(key: string, initialData: Draft) {
  const [draft, setDraft] = useState<Draft>(initialData);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with initialData structure in case of schema changes? For now, just load.
        setDraft(parsed);
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(key, JSON.stringify(draft));
    }
  }, [key, draft, loaded]);

  return { draft, setDraft, loaded };
}
