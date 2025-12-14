import yaml from "js-yaml";
import { useEffect, useRef, useState } from "react";
import { Draft } from "@/shared/types.ts";
import { parseFrontMatter } from "@/app/components/editor/utils.ts";
import { fetchWithAuth } from "@/app/utils/fetcher.ts";

interface UseContentSyncProps {
  owner: string;
  repo: string;
  branch?: string;
  filePath: string;
  mode: "new" | "edit";
  loaded: boolean;
  draft: Draft;
  fromStorage: boolean;
  setDraft: (
    val: Draft | ((prev: Draft) => Draft),
    loadedVal?: boolean,
    sync?: boolean,
  ) => void;
  showToast: (
    message: string,
    type: "success" | "error" | "info" | "warning",
  ) => void;
}

export function useContentSync({
  owner,
  repo,
  branch = "main",
  filePath,
  mode,
  loaded,
  draft,
  fromStorage,
  setDraft,
  showToast,
}: UseContentSyncProps) {
  const [fetching, setFetching] = useState(false);
  const fetchedKeyRef = useRef<string | null>(null);
  const [originalDraft, setOriginalDraft] = useState<Draft | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const draftRef = useRef(draft);
  const fromStorageRef = useRef(fromStorage);

  useEffect(() => {
    draftRef.current = draft;
    fromStorageRef.current = fromStorage;
  }, [draft, fromStorage]);

  const triggerReload = () => {
    fetchedKeyRef.current = null;
    setReloadTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const currentKey = `${branch}:${filePath}`;
    if (
      mode === "new" ||
      !loaded ||
      !owner ||
      !repo ||
      !filePath ||
      fetching ||
      fetchedKeyRef.current === currentKey
    ) {
      return;
    }

    setFetching(true);
    fetchedKeyRef.current = currentKey;
    fetchWithAuth(
      `/api/repo/${owner}/${repo}/contents/${filePath}?branch=${
        encodeURIComponent(branch)
      }`,
    )
      .then(async (res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Failed to fetch remote content");
        return await res.text();
      })
      .then((text) => {
        if (text === null) {
          // 404 Case
          if (fromStorageRef.current) {
            // We have a local draft, proceed with it.
            // originalDraft remains null.
            return;
          } else {
            throw new Error("Content not found");
          }
        }
        try {
          // Detect YAML mode by extension
          const isYaml = filePath.endsWith(".yml") ||
            filePath.endsWith(".yaml");
          // deno-lint-ignore no-explicit-any
          let data: any = {};
          let content = "";

          if (isYaml) {
            // Parse as pure YAML
            data = yaml.load(text) || {};
            content = "";
          } else {
            // Parse as FrontMatter + Markdown
            const parsed = parseFrontMatter(text);
            data = parsed.data;
            content = parsed.content;
          }

          const newRemoteDraft = {
            frontMatter: data,
            body: content,
            pendingImages: [],
          };
          setOriginalDraft(newRemoteDraft);

          const currentDraft = draftRef.current;
          const isStorage = fromStorageRef.current;

          if (isStorage) {
            // Compare current draft with new remote
            const isBodyEqual = currentDraft.body === newRemoteDraft.body;
            // Key order in JSON.stringify is generally stable for same object structure, but technically risky.
            // For now, consistent with existing comparison logic.
            const isFMEqual = JSON.stringify(currentDraft.frontMatter) ===
              JSON.stringify(newRemoteDraft.frontMatter);

            const isClean = isBodyEqual && isFMEqual;

            if (isClean) {
              setDraft(currentDraft, true, true); // Synced -> Clears storage
              showToast("Draft matches remote content. Synced.", "info");
            } else {
              setDraft(currentDraft, true, false); // Keep draft, but allow dirty check update (originalDraft updated)
            }
          } else {
            setDraft(newRemoteDraft, true, true);
          }
        } catch (e) {
          console.error("Failed to parse content", e);
          setDraft((prev: Draft) => ({ ...prev, body: text }));
        }
      })
      .catch((e) => {
        console.error("[ContentEditor] Fetch failed:", e);
        showToast(`Failed to load content: ${e.message}`, "error");
      })
      .finally(() => {
        setFetching(false);
      });
  }, [
    mode,
    loaded,
    owner,
    repo,
    filePath,
    branch,
    fetching,
    setDraft,
    showToast,
    reloadTrigger,
  ]);

  return { fetching, originalDraft, triggerReload };
}
