import { useEffect, useState } from "react";

export interface FileItem {
  name: string;
  type: "file" | "dir";
  content?: string; // Base64
  sha?: string;
  path?: string;
}

export interface Draft {
  frontMatter: Record<string, unknown>;
  body: string;
  pendingImages?: FileItem[];
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
