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
        // If explicitly clean, treat as synced. Default (undefined) is dirty (legacy).
        setIsSynced(parsed.isDirty === false);
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
    if (!loaded) return;

    if (!isSynced) {
      // Dirty: Save with isDirty=true
      const toSave = { ...draft, isDirty: true };
      localStorage.setItem(key, JSON.stringify(toSave));
    } else {
      // Synced: Check if we need to keep PR info
      if (draft.pr) {
        const toSave = { ...draft, isDirty: false };
        localStorage.setItem(key, JSON.stringify(toSave));
      } else {
        // Clean and no PR -> Remove
        localStorage.removeItem(key);
      }
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
      if (sync) {
        // If syncing, we are potentially loading from storage (if clean PR object) or remote
        // But usually sync=true means "MATCHES REMOTE".
        // We set fromStorage=false usually, but if we loaded a Clean PR Object, fromStorage was true?
        // Let's reset fromStorage to false if we are syncing (Clean),
        // effectively treating it as "Not a draft restoration event".
        setFromStorage(false);
      }
    } else {
      setIsSynced(false);
    }
  };

  return { draft, setDraft, loaded, fromStorage, clearDraft, isSynced };
}
