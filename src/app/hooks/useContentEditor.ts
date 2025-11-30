import { useCallback, useEffect, useState } from "react";
import jsyaml from "js-yaml";
import { Content, PrDetails } from "../types.ts";

export const useContentEditor = (
  currentContent: Content | null,
  body: string,
  frontMatter: Record<string, unknown> | Record<string, unknown>[],
  initialBody: string,
  initialFrontMatter: Record<string, unknown> | Record<string, unknown>[],
  setInitialBody: (body: string) => void,
  setInitialFrontMatter: (
    fm: Record<string, unknown> | Record<string, unknown>[],
  ) => void,
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
    setPrDescription("");
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
    if (currentContent) {
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

  const [isSaving, setIsSaving] = useState(false);

  const saveContent = async (sha: string) => {
    if (!currentContent) return;
    setIsSaving(true);
    setPrUrl(null); // Clear PR URL state temporarily until new PR is created

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
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPrUrl(data.prUrl);

        // Save PR URL to local storage
        const prKey = getPrKey(currentContent);
        localStorage.setItem(prKey, data.prUrl);

        // Clear draft on success
        clearDraft();
        setPrDescription("");

        // Update initial state to prevent "Unsaved Changes" detection
        setInitialBody(body);
        setInitialFrontMatter(frontMatter);

        // Fetch PR details immediately
        checkPrStatus();
      } else {
        console.error("Failed to create PR: " + data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

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
    saveContent,
    isSaving,
  };
};
