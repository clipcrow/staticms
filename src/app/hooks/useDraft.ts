import { useCallback, useEffect, useState } from "react";
import { Content } from "../types.ts";

export const useDraft = (
  currentContent: Content | null,
  view: string,
  body: string,
  frontMatter: Record<string, unknown> | Record<string, unknown>[],
  initialBody: string,
  initialFrontMatter: Record<string, unknown> | Record<string, unknown>[],
  prDescription: string,
) => {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);

  const getDraftKey = useCallback((content: Content) => {
    return `draft_${content.owner}|${content.repo}|${content.filePath}`;
  }, []);

  // Draft Saving Logic
  useEffect(() => {
    if (view === "content-editor" && currentContent) {
      const key = getDraftKey(currentContent);

      const isDirty = body !== initialBody ||
        JSON.stringify(frontMatter) !== JSON.stringify(initialFrontMatter) ||
        prDescription !== "";

      if (isDirty) {
        const draft = {
          body,
          frontMatter,
          prDescription,
          timestamp: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(draft));
        setHasDraft(true);
        setDraftTimestamp(draft.timestamp);
      } else {
        // Only remove if it's not a "created" status
        const saved = localStorage.getItem(key);
        let isCreatedStatus = false;
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.type === "created") isCreatedStatus = true;
          } catch {
            // ignore
          }
        }

        if (!isCreatedStatus) {
          localStorage.removeItem(key);
          setHasDraft(false);
          setDraftTimestamp(null);
        }
      }
    }
  }, [
    body,
    frontMatter,
    prDescription,
    view,
    currentContent,
    initialBody,
    initialFrontMatter,
    getDraftKey,
  ]);

  const clearDraft = useCallback(() => {
    if (!currentContent) return;
    const key = getDraftKey(currentContent);
    localStorage.removeItem(key);
    setHasDraft(false);
    setDraftTimestamp(null);
  }, [currentContent, getDraftKey]);

  return {
    hasDraft,
    draftTimestamp,
    setHasDraft,
    setDraftTimestamp,
    clearDraft,
    getDraftKey,
  };
};
