import { useCallback, useState } from "react";
import { Content, PrDetails } from "../types.ts";

export const usePullRequest = (
  currentContent: Content | null,
) => {
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [isPrOpen, setIsPrOpen] = useState(false);
  const [prDescription, setPrDescription] = useState("");
  const [isPrLocked, setIsPrLocked] = useState(false);
  const [prStatus, setPrStatus] = useState<"open" | "merged" | "closed" | null>(
    null,
  );
  const [prDetails, setPrDetails] = useState<PrDetails | null>(null);

  const getPrKey = useCallback((content: Content) => {
    return `pr_${content.owner}|${content.repo}|${content.filePath}`;
  }, []);

  const clearPrState = useCallback(() => {
    if (!currentContent) return;
    const prKey = getPrKey(currentContent);
    localStorage.removeItem(prKey);
    setPrUrl(null);
    setPrStatus(null);
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
          setPrStatus("open");
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

  return {
    prUrl,
    setPrUrl,
    isPrOpen,
    setIsPrOpen,
    prDescription,
    setPrDescription,
    isPrLocked,
    setIsPrLocked,
    prStatus,
    setPrStatus,
    prDetails,
    setPrDetails,
    checkPrStatus,
    clearPrState,
    getPrKey,
  };
};
