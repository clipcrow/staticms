import { useEffect, useState } from "react";
import type { Draft, FileItem } from "@/shared/types.ts";

export type { Draft, FileItem };

export function useDraft(key: string, initialData: Draft) {
  const [draft, setInternalDraft] = useState<Draft>(initialData);
  const [loaded, setLoaded] = useState(false);
  const [fromStorage, setFromStorage] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setInternalDraft(parsed);
        setFromStorage(true);
        setIsSynced(false);
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    } else {
      setFromStorage(false);
      setIsSynced(true);
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (loaded && !isSynced) {
      localStorage.setItem(key, JSON.stringify(draft));
    } else if (loaded && isSynced) {
      localStorage.removeItem(key);
    }
  }, [key, draft, loaded, isSynced]);

  const clearDraft = () => {
    localStorage.removeItem(key);
    setInternalDraft(initialData);
    setFromStorage(false);
    setIsSynced(true);
  };

  const setDraft = (
    val: Draft | ((prev: Draft) => Draft),
    loadedVal?: boolean,
    sync?: boolean,
  ) => {
    setInternalDraft(val);
    if (loadedVal !== undefined) setLoaded(loadedVal);
    if (sync !== undefined) {
      setIsSynced(sync);
      if (sync) setFromStorage(false);
    } else {
      setIsSynced(false);
    }
  };

  return { draft, setDraft, loaded, fromStorage, clearDraft, isSynced };
}
