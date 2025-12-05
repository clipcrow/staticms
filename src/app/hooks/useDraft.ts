import { useCallback, useEffect, useState } from "react";
import jsyaml from "js-yaml";
import { Content, FileItem, PrDetails } from "../types.ts";
import { getDraft, getDraftKey } from "./utils.ts";
import { useAuth } from "./useAuth.ts";

export const useDraft = (
  currentContent: Content | null,
  body: string,
  frontMatter: Record<string, unknown> | Record<string, unknown>[],
  initialBody: string,
  initialFrontMatter: Record<string, unknown> | Record<string, unknown>[],
  setInitialBody: (body: string) => void,
  setInitialFrontMatter: (
    fm: Record<string, unknown> | Record<string, unknown>[],
  ) => void,
  loadContent: (
    content: Content,
    getDraftKey: (c: Content, u?: string) => string,
    setHasDraft: (has: boolean) => void,
    setDraftTimestamp: (ts: number | null) => void,
    setPrDescription: (desc: string) => void,
    setPendingImages: (images: FileItem[]) => void,
    isReset?: boolean,
    // deno-lint-ignore no-explicit-any
    initialData?: any,
    onBackToCollection?: () => void,
    username?: string,
  ) => Promise<void>,
  onBackToCollection?: () => void,
) => {
  // PR State
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [prDescription, setPrDescription] = useState("");
  const [isPrLocked, setIsPrLocked] = useState(false);
  const [prDetails, setPrDetails] = useState<PrDetails | null>(null);

  // Draft State
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);
  const [pendingImages, setPendingImages] = useState<FileItem[]>([]);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  // for Loading Indicators
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingLocal, setIsResettingLocal] = useState(false);

  const { username } = useAuth();

  // Derived State
  const isDirty = body !== initialBody ||
    JSON.stringify(frontMatter) !== JSON.stringify(initialFrontMatter) ||
    prDescription !== "" ||
    pendingImages.length > 0;

  // PR Logic
  const clearPrState = useCallback(() => {
    setPrUrl(null);
    setPrDescription("");
    setPrDetails(null);
    setIsPrLocked(false);
  }, []);

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
    if (!isDraftLoaded || isResettingLocal) return;

    if (currentContent) {
      const key = getDraftKey(currentContent, username || undefined);

      if (isDirty || prUrl) {
        const draft = {
          body,
          frontMatter,
          prDescription,
          pendingImages,
          timestamp: Date.now(),
          prUrl,
        };
        localStorage.setItem(key, JSON.stringify(draft));
        setHasDraft(true);
        setDraftTimestamp(draft.timestamp);
      } else {
        // Only remove if it's not a "created" status
        const draft = getDraft(currentContent, username || undefined);
        const isCreatedStatus = draft?.type === "created";

        if (!isCreatedStatus) {
          localStorage.removeItem(key);
          setHasDraft(false);
          setDraftTimestamp(null);
        } else {
          setHasDraft(true);
          if (draft) {
            setDraftTimestamp(draft.timestamp || null);
          }
        }
      }
    }
  }, [
    body,
    frontMatter,
    prDescription,
    pendingImages,
    currentContent,
    initialBody,
    initialFrontMatter,
    isDirty,
    prUrl,
    isDraftLoaded,
    isResettingLocal,
    username,
  ]);

  // Load draft on mount (including pending images and PR URL)
  // Note: useRemoteContent also loads this, but we need to ensure local state is synced if needed.
  // Actually, useRemoteContent calls loadContent which handles initialization.
  // But we need to handle the case where we might have pendingImages which useRemoteContent doesn't handle?
  // useRemoteContent handles body/frontMatter/prUrl.
  // We handle pendingImages here.
  useEffect(() => {
    if (currentContent) {
      const draft = getDraft(currentContent, username || undefined);
      if (draft) {
        if (draft.pendingImages) {
          setPendingImages(draft.pendingImages);
        }
        if (draft.prUrl) {
          setPrUrl(draft.prUrl);
        }
      } else {
        // Reset PR URL if no draft found (important for navigation)
        setPrUrl(null);
        setPendingImages([]);
      }
      setIsDraftLoaded(true);
    }
  }, [currentContent, username]);

  const clearDraft = useCallback(() => {
    // Reset local changes
    setPendingImages([]);
    setPrDescription("");
    // We don't reset body/frontMatter here directly because we expect the caller (wrapper) to handle reset?
    // Or we should expose a way to reset them.
    // Actually, clearDraft is usually called when we want to discard changes.
    // But we can't setBody here because it's passed as prop.
    // The wrapper handles resetContent.

    // If we want to clear draft from storage, we rely on the useEffect.
    // If we reset state variables, isDirty becomes false.
    // If prUrl is null, storage is cleared.
  }, []);

  const saveContent = async (sha: string) => {
    if (!currentContent) return;
    setIsSaving(true);
    // We don't clear PR URL here anymore, we update it after success.

    // Reconstruct content with Front Matter
    const isYaml = currentContent.filePath.endsWith(".yaml") ||
      currentContent.filePath.endsWith(".yml");
    let finalContent = body;

    if (currentContent.fields && currentContent.fields.length > 0) {
      // Only include fields that are defined in the config
      if (Array.isArray(frontMatter)) {
        // For array, we map over each item and filter/merge fields
        const newFM = frontMatter.map((item) => {
          const fmToSave: Record<string, unknown> = {};
          currentContent.fields.forEach((field) => {
            fmToSave[field.name] = item[field.name] || "";
          });
          return { ...item, ...fmToSave };
        });

        try {
          const yamlString = jsyaml.dump(newFM);
          if (isYaml) {
            finalContent = yamlString;
          } else {
            // Arrays are typically only for pure YAML files, but just in case
            finalContent = `---\n${yamlString}---\n${body}`;
          }
        } catch (e) {
          console.error("Error dumping yaml", e);
          finalContent = body;
        }
      } else {
        const fmToSave: Record<string, unknown> = {};
        currentContent.fields.forEach((field) => {
          fmToSave[field.name] = frontMatter[field.name] || "";
        });

        // If there are other existing FM keys not in config, should we keep them?
        // For now, let's merge existing FM with configured fields to avoid data loss
        const mergedFM = { ...frontMatter, ...fmToSave };

        if (Object.keys(mergedFM).length > 0) {
          try {
            const yamlString = jsyaml.dump(mergedFM);
            if (isYaml) {
              finalContent = yamlString;
            } else {
              finalContent = `---\n${yamlString}---\n${body}`;
            }
          } catch (e) {
            console.error("Error dumping yaml", e);
            // Fallback to raw body if YAML fails
            finalContent = body;
          }
        }
      }
    } else if (
      (Array.isArray(frontMatter) && frontMatter.length > 0) ||
      (!Array.isArray(frontMatter) && Object.keys(frontMatter).length > 0)
    ) {
      // If no fields configured but FM exists, preserve it
      try {
        const yamlString = jsyaml.dump(frontMatter);
        if (isYaml) {
          finalContent = yamlString;
        } else {
          finalContent = `---\n${yamlString}---\n${body}`;
        }
      } catch (e) {
        console.error("Error dumping yaml", e);
        finalContent = body;
      }
    } else if (isYaml) {
      // YAML file with no fields/frontMatter? Should probably be empty object or empty string
      finalContent = "";
    }

    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const HH = String(now.getHours()).padStart(2, "0");
      const MM = String(now.getMinutes()).padStart(2, "0");
      const generatedTitle = `STATICMS ${yyyy}${mm}${dd}${HH}${MM}`;

      console.log(
        `[handleSaveContent] Sending branch: "${currentContent.branch}"`,
      );

      // Use pendingImages from state
      // (We don't need to read from localStorage separately anymore)

      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: currentContent.owner,
          repo: currentContent.repo,
          path: currentContent.filePath,
          branch: currentContent.branch,
          content: finalContent,
          message: prDescription || "Update content via Staticms",
          title: generatedTitle,
          description: prDescription,
          sha,
          images: pendingImages,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPrUrl(data.prUrl);

        // Manually save to localStorage to ensure loadContent picks it up
        // We mark it as "created" so loadContent knows to use the remote content (which we just updated)
        // but preserve the PR URL.
        const key = getDraftKey(currentContent, username || undefined);
        const draft = {
          prUrl: data.prUrl,
          timestamp: Date.now(),
          type: "created",
        };
        localStorage.setItem(key, JSON.stringify(draft));

        // Clear draft state (local changes)
        setPendingImages([]);
        setPrDescription("");

        // Update initial state to prevent "Unsaved Changes" detection
        setInitialBody(body);
        setInitialFrontMatter(frontMatter);

        // Fetch PR details immediately
        checkPrStatus();

        // Reload content to refresh images list from remote
        loadContent(
          currentContent,
          getDraftKey,
          setHasDraft,
          setDraftTimestamp,
          setPrDescription,
          setPendingImages,
          true, // Treat as reset to force reload
          undefined, // initialData
          onBackToCollection,
          username || undefined,
        );
      } else {
        console.error("Failed to create PR: " + data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const resetContent = useCallback(async () => {
    if (!currentContent) return;

    setIsResettingLocal(true);

    // Manually remove from local storage to ensure loadContent doesn't pick it up
    // but keep hasDraft state true so the UI doesn't flicker/hide immediately
    // Wait, if we unify, removing the key removes PR URL too.
    // If we want to keep PR URL, we should not remove the key, but update it.
    // But loadContent will read from the key.
    // If we want loadContent to ignore the "draft" part but keep "PR" part...
    // loadContent logic needs to be smart.

    // For now, let's assume resetContent clears everything including PR link if it's a hard reset.
    const key = getDraftKey(currentContent, username || undefined);
    localStorage.removeItem(key);

    // Clear pending images state
    setPendingImages([]);

    await loadContent(
      currentContent,
      getDraftKey,
      setHasDraft,
      setDraftTimestamp,
      setPrDescription,
      setPendingImages,
      true,
      undefined,
      onBackToCollection,
      username || undefined,
    );

    setIsResettingLocal(false);
  }, [
    currentContent,
    loadContent,
    setPrUrl,
    setHasDraft,
    setDraftTimestamp,
    setPrDescription,
    setPendingImages,
    setIsResettingLocal,
    onBackToCollection,
    username,
  ]);

  // Check PR Status Effect
  useEffect(() => {
    if (prUrl) {
      checkPrStatus().then((status) => {
        if (status === "closed") {
          // If PR is closed, we clear the PR state.
          // clearPrState() sets prUrl to null.
          // The useEffect will then update storage (removing key if no other changes).
          // But we might also want to reset content if it was merged?
          // The original code called resetContent().
          resetContent();
        }
      });
    } else {
      setIsPrLocked(false);
      setPrDetails(null);
    }
  }, [prUrl, checkPrStatus, resetContent]);

  return {
    // PR State & Methods
    prUrl,
    setPrUrl,
    prDescription,
    setPrDescription,
    isPrLocked,
    setIsPrLocked,
    prDetails,
    checkPrStatus,
    clearPrState,

    // Draft State & Methods
    hasDraft,
    draftTimestamp,
    setHasDraft,
    setDraftTimestamp,
    clearDraft,
    saveContent,
    isSaving,
    resetContent,

    // Pending Images State
    pendingImages,
    setPendingImages,

    // New
    hasUnsavedChanges: isDirty,
  };
};
