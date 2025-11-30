import { useCallback, useEffect, useState } from "react";
import { Content, PrDetails } from "../types.ts";

export const useContentEditor = (
  currentContent: Content | null,
  view: string,
  body: string,
  frontMatter: Record<string, unknown> | Record<string, unknown>[],
  initialBody: string,
  initialFrontMatter: Record<string, unknown> | Record<string, unknown>[],
) => {
  // PR State
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [prDescription, setPrDescription] = useState("");
  const [isPrLocked, setIsPrLocked] = useState(false);
  const [prDetails, setPrDetails] = useState<PrDetails | null>(null);

  // Draft State
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);

  // Helper Keys
  const getPrKey = useCallback((content: Content) => {
    return `pr_${content.owner}|${content.repo}|${content.filePath}`;
  }, []);

  const getDraftKey = useCallback((content: Content) => {
    return `draft_${content.owner}|${content.repo}|${content.filePath}`;
  }, []);

  // PR Logic
  const clearPrState = useCallback(() => {
    if (!currentContent) return;
    const prKey = getPrKey(currentContent);
    localStorage.removeItem(prKey);
    setPrUrl(null);
    setPrDetails(null);
    setIsPrLocked(false);
  }, [currentContent, getPrKey]);

  const checkPrStatus = useCallback(async () => {
    if (!prUrl) return null;
    try {
      const res = await fetch(
        `/api/pr-status?prUrl=${encodeURIComponent(prUrl)}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.state === "open") {
          setIsPrLocked(true);
          setPrDetails(data);
          return "open";
        } else {
          setIsPrLocked(false);
          // PR is merged or closed -> Clear PR status
          clearPrState();
          return "closed";
        }
      }
    } catch (e) {
      console.error("Failed to check PR status", e);
    }
    return null;
  }, [prUrl, clearPrState]);

  // Draft Logic
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
    // PR State & Methods
    prUrl,
    setPrUrl,
    prDescription,
    setPrDescription,
    isPrLocked,
    setIsPrLocked,
    prDetails,
    setPrDetails,
    checkPrStatus,
    clearPrState,
    getPrKey,

    // Draft State & Methods
    hasDraft,
    draftTimestamp,
    setHasDraft,
    setDraftTimestamp,
    clearDraft,
    getDraftKey,
  };
};
