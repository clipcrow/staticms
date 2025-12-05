import { useCallback, useState } from "react";
import jsyaml from "js-yaml";
import { Commit, Content, FileItem } from "../types.ts";

export const useRemoteContent = () => {
  const [body, setBody] = useState("");
  const [frontMatter, setFrontMatter] = useState<
    Record<string, unknown> | Record<string, unknown>[]
  >({});
  const [initialBody, setInitialBody] = useState("");
  const [initialFrontMatter, setInitialFrontMatter] = useState<
    Record<string, unknown> | Record<string, unknown>[]
  >({});

  const [sha, setSha] = useState("");
  const [commits, setCommits] = useState<Commit[]>([]);
  const [editorLoading, setEditorLoading] = useState(false);
  const [loadedBranch, setLoadedBranch] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const loadContent = useCallback(
    async (
      content: Content,
      getDraftKey: (c: Content, u?: string) => string,
      setHasDraft: (has: boolean) => void,
      setDraftTimestamp: (ts: number | null) => void,
      setPrDescription: (desc: string) => void,
      setPendingImages: (images: FileItem[]) => void,
      isReset: boolean = false,
      // deno-lint-ignore no-explicit-any
      initialData?: any,
      onBackToCollection?: () => void,
      username?: string,
    ) => {
      if (isReset) {
        setIsResetting(true);
      } else if (!initialData) {
        setEditorLoading(true);
      }

      const params = new URLSearchParams({
        owner: content.owner,
        repo: content.repo,
        filePath: content.filePath,
        t: Date.now().toString(), // Prevent caching
        allowMissing: "true",
      });
      if (content.branch) {
        params.append("branch", content.branch);
      }

      try {
        let data;
        if (initialData) {
          data = initialData;
        } else {
          const res = await fetch(`/api/content?${params.toString()}`);
          if (res.status === 404) {
            data = { error: "404" };
          } else {
            data = await res.json();
          }
        }

        let rawContent = "";

        if (data.error === "404") {
          // New file
          setSha("");
          setLoadedBranch(content.branch || "");

          // If we are resetting and the file is 404 (doesn't exist remotely),
          // it means we just discarded the draft of a new file.
          // We should navigate back to the collection list.
          if (isReset && onBackToCollection) {
            onBackToCollection();
            return;
          }
        } else if (data.content) {
          rawContent = data.content;
          setSha(data.sha);
          setLoadedBranch(data.branch);
        }

        const isYaml = content.filePath.endsWith(".yaml") ||
          content.filePath.endsWith(".yml");
        let parsedBody = "";
        let parsedFM: Record<string, unknown> | Record<string, unknown>[] = {};

        if (rawContent) {
          if (isYaml) {
            try {
              const fm = jsyaml.load(rawContent);
              if (Array.isArray(fm)) {
                parsedFM = fm as Record<string, unknown>[];
              } else {
                parsedFM = typeof fm === "object" && fm !== null ? fm : {};
              }
              parsedBody = "";
            } catch (e) {
              console.error("Error parsing yaml file", e);
            }
          } else {
            const fmRegex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*([\s\S]*)$/;
            const match = rawContent.match(fmRegex);
            parsedBody = rawContent;

            if (match) {
              try {
                const fm = jsyaml.load(match[1]);
                parsedFM = typeof fm === "object" && fm !== null ? fm : {};
                parsedBody = match[2] ? match[2].replace(/^[\r\n]+/, "") : "";
              } catch (e) {
                console.error("Error parsing front matter", e);
              }
            }
          }
        }

        setInitialBody(parsedBody);
        setInitialFrontMatter(parsedFM);

        // Check for local draft (which now includes PR URL)
        const key = getDraftKey(content, username);
        const savedDraft = localStorage.getItem(key);

        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft);

            // Restore pending images if present
            if (draft.pendingImages) {
              setPendingImages(draft.pendingImages);
            }

            if (draft.type === "created") {
              setHasDraft(true);
              setDraftTimestamp(draft.timestamp);
              setPrDescription(draft.description || "");
              setBody(parsedBody); // Should be empty for new file
              setFrontMatter(parsedFM); // Should be empty for new file
            } else {
              // Restore from draft
              setBody(draft.body);
              setFrontMatter(draft.frontMatter);
              setPrDescription(draft.prDescription);
              setHasDraft(true);
              setDraftTimestamp(draft.timestamp);
            }
          } catch (e) {
            console.error("Failed to parse draft", e);
            setBody(parsedBody);
            setFrontMatter(parsedFM);
            setHasDraft(false);
          }
        } else {
          setBody(parsedBody);
          setFrontMatter(parsedFM);
          setHasDraft(false);
          setDraftTimestamp(null);
          setPrDescription("");
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isReset) {
          setIsResetting(false);
        } else {
          setEditorLoading(false);
        }
      }

      // Fetch commit history
      try {
        const commitRes = await fetch(`/api/commits?${params.toString()}`);
        const commitData = await commitRes.json();
        if (commitData.commits) {
          setCommits(commitData.commits);
        }
      } catch (e) {
        console.error(e);
      }
    },
    [],
  );

  return {
    body,
    setBody,
    frontMatter,
    setFrontMatter,
    initialBody,
    setInitialBody,
    initialFrontMatter,
    setInitialFrontMatter,
    sha,
    commits,
    editorLoading,
    isResetting,
    loadedBranch,
    loadContent,
  };
};
