import { useEffect, useState } from "react";
import type { Draft, FileItem } from "@/shared/types.ts";

export type { Draft, FileItem };

export function useDraft(key: string, initialData: Draft) {
  const [draft, setDraft] = useState<Draft>(initialData);
  const [loaded, setLoaded] = useState(false);
  const [fromStorage, setFromStorage] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDraft(parsed);
        setFromStorage(true);
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    } else {
      setFromStorage(false);
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(key, JSON.stringify(draft));
    }
  }, [key, draft, loaded]);

  const clearDraft = () => {
    localStorage.removeItem(key);
    setDraft(initialData); // Reset to initial empty/default
    setFromStorage(false);
  };

  return { draft, setDraft, loaded, fromStorage, clearDraft };
}
