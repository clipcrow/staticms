import { useCallback, useState } from "react";
import jsyaml from "js-yaml";
import { Commit, Content } from "../types.ts";

export const useRemoteContent = () => {
  const [body, setBody] = useState("");
  const [frontMatter, setFrontMatter] = useState<
    Record<string, unknown> | Record<string, unknown>[]
  >({});
  const [initialBody, setInitialBody] = useState("");
  const [initialFrontMatter, setInitialFrontMatter] = useState<
    Record<string, unknown> | Record<string, unknown>[]
  >({});
  const [customFields, setCustomFields] = useState<
    { id: string; key: string }[]
  >([]);
  const [sha, setSha] = useState("");
  const [commits, setCommits] = useState<Commit[]>([]);
  const [editorLoading, setEditorLoading] = useState(false);
  const [loadedBranch, setLoadedBranch] = useState("");

  const loadContent = useCallback(
    async (
      content: Content,
      getDraftKey: (c: Content) => string,
      getPrKey: (c: Content) => string,
      setPrUrl: (url: string | null) => void,
      setHasDraft: (has: boolean) => void,
      setDraftTimestamp: (ts: number | null) => void,
      setPrDescription: (desc: string) => void,
    ) => {
      setEditorLoading(true);
      setPrUrl(null); // Reset PR URL state

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
        const res = await fetch(`/api/content?${params.toString()}`);
        let data;
        if (res.status === 404) {
          data = { error: "404" };
        } else {
          data = await res.json();
        }

        if (data.error === "404") {
          // New file
          setBody("");
          setInitialBody("");
          setFrontMatter({});
          setInitialFrontMatter({});
          setCustomFields([]);
          setSha("");
          setLoadedBranch(content.branch || "");
          setPrDescription("");
          setEditorLoading(false);
          return;
        }

        if (data.content) {
          const rawContent = data.content;
          setSha(data.sha);
          setLoadedBranch(data.branch);

          const isYaml = content.filePath.endsWith(".yaml") ||
            content.filePath.endsWith(".yml");
          let parsedBody = "";
          let parsedFM: Record<string, unknown> | Record<string, unknown>[] =
            {};

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

          setInitialBody(parsedBody);
          setInitialFrontMatter(parsedFM);

          // Check for local draft
          const key = getDraftKey(content);
          const savedDraft = localStorage.getItem(key);

          if (savedDraft) {
            try {
              const draft = JSON.parse(savedDraft);
              if (draft.type === "created") {
                setPrUrl(draft.prUrl);
                setHasDraft(true);
                setDraftTimestamp(draft.timestamp);
                setPrDescription(draft.description || "");
                setBody(parsedBody);
                setFrontMatter(parsedFM);

                // Initialize custom fields from remote
                const configuredKeys = content.fields?.map((f) => f.name) || [];
                let customKeys: string[] = [];
                if (!Array.isArray(parsedFM)) {
                  customKeys = Object.keys(parsedFM).filter((k) =>
                    !configuredKeys.includes(k)
                  );
                }
                setCustomFields(
                  customKeys.map((k) => ({
                    id: crypto.randomUUID(),
                    key: k,
                  })),
                );
              } else {
                // Restore from draft
                setBody(draft.body);
                setFrontMatter(draft.frontMatter);
                setPrDescription(draft.prDescription);
                setHasDraft(true);
                setDraftTimestamp(draft.timestamp);

                // Initialize custom fields from draft
                const configuredKeys = content.fields?.map((f) => f.name) || [];
                let customKeys: string[] = [];
                if (!Array.isArray(draft.frontMatter)) {
                  customKeys = Object.keys(draft.frontMatter).filter((k) =>
                    !configuredKeys.includes(k)
                  );
                }
                setCustomFields(
                  customKeys.map((k) => ({
                    id: crypto.randomUUID(),
                    key: k,
                  })),
                );
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
            setPrDescription("");

            // Initialize custom fields from remote
            if (!Array.isArray(parsedFM)) {
              const configuredKeys = content.fields?.map((f) => f.name) || [];
              const customKeys = Object.keys(parsedFM).filter((k) =>
                !configuredKeys.includes(k)
              );
              setCustomFields(
                customKeys.map((k) => ({
                  id: crypto.randomUUID(),
                  key: k,
                })),
              );
            } else {
              setCustomFields([]);
            }
          }

          // Check for existing PR URL
          const prKey = getPrKey(content);
          const savedPrUrl = localStorage.getItem(prKey);
          if (savedPrUrl) {
            setPrUrl(savedPrUrl);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setEditorLoading(false);
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
    customFields,
    setCustomFields,
    sha,
    setSha,
    commits,
    setCommits,
    editorLoading,
    setEditorLoading,
    loadedBranch,
    setLoadedBranch,
    loadContent,
  };
};
