import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import jsyaml from "js-yaml";
import { Commit, Content, PrDetails } from "./types.ts";
import { ContentList } from "./components/ContentList.tsx";
import { ContentSettings } from "./components/ContentSettings.tsx";
import { ContentEditor } from "./components/ContentEditor.tsx";
import { Login } from "./components/Login.tsx";
import { RepositorySelector } from "./components/RepositorySelector.tsx";
import { Header } from "./components/Header.tsx";
import { useAuth } from "./hooks/useAuth.ts";

function App() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentContent, setCurrentContent] = useState<Content | null>(null);
  const [view, setView] = useState<
    | "content-list"
    | "content-editor"
    | "content-settings"
    | "repository-settings"
  >(
    "content-list",
  );

  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const [selectedRepo, setSelectedRepo] = useState<string | null>(
    localStorage.getItem("staticms_repo"),
  );

  const [formData, setFormData] = useState<Content>({
    owner: "",
    repo: "",
    filePath: "",
    fields: [],
  });

  const [targetRepo, setTargetRepo] = useState<
    {
      owner: string;
      repo: string;
      branch?: string;
    } | null
  >(null);

  const handleAddNewContentToRepo = (
    owner: string,
    repo: string,
    branch?: string,
  ) => {
    setTargetRepo({ owner, repo, branch });
    setFormData({
      owner,
      repo,
      branch,
      filePath: "",
      fields: [],
    });
    setEditingIndex(null);
    setView("content-settings");
  };

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Load config
        const configRes = await fetch("/api/config");
        const data = await configRes.json();
        if (data && data.contents) {
          // Ensure fields array exists for older configs
          const contentsWithFields = data.contents.map((c: Content) => ({
            ...c,
            fields: c.fields || [],
          }));
          setContents(contentsWithFields);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleLogout = async () => {
    await logout();
    setSelectedRepo(null);
    localStorage.removeItem("staticms_repo");
    setView("content-list");
  };

  const handleSaveContentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    let newContents = [...contents];
    if (editingIndex !== null) {
      newContents[editingIndex] = formData;
    } else {
      newContents = [...contents, formData];
    }

    // Validate file existence
    try {
      const params = new URLSearchParams({
        owner: formData.owner,
        repo: formData.repo,
        filePath: formData.filePath,
        t: Date.now().toString(),
        validate: "true",
      });
      if (formData.branch) {
        params.append("branch", formData.branch);
      }
      const checkRes = await fetch(`/api/content?${params.toString()}`);
      if (checkRes.status === 404) {
        alert("Content path not found in the repository.");
        setIsSaving(false);
        return;
      }
      if (checkRes.ok) {
        const data = await checkRes.json();
        if (data.type === "dir") {
          // If it's a directory, append index.md
          const newFilePath = formData.filePath.endsWith("/")
            ? `${formData.filePath}index.md`
            : `${formData.filePath}/index.md`;

          const updatedFormData = { ...formData, filePath: newFilePath };

          if (editingIndex !== null) {
            newContents[editingIndex] = updatedFormData;
          } else {
            newContents[newContents.length - 1] = updatedFormData;
          }
        }
      } else {
        console.error("Failed to validate file path");
        // Optional: decide if we block on other errors. For now, let's assume only 404 is blocking.
      }
    } catch (e) {
      console.error("Error validating file path", e);
    }

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: newContents }),
      });
      if (res.ok) {
        setContents(newContents);
        setFormData({ owner: "", repo: "", filePath: "", fields: [] });
        setEditingIndex(null);
        setTargetRepo(null);
        setView("content-list");
      } else {
        console.error("Failed to save configuration");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContent = async (index: number) => {
    if (!confirm("Are you sure you want to delete this content?")) return;
    const newContents = contents.filter((_, i) => i !== index);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: newContents }),
      });
      if (res.ok) {
        setContents(newContents);
        setFormData({ owner: "", repo: "", filePath: "", fields: [] });
        setEditingIndex(null);
        setTargetRepo(null);
        setView("content-list");
      } else {
        console.error("Failed to delete content");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditContentConfig = (index: number) => {
    const content = contents[index];
    setTargetRepo({
      owner: content.owner,
      repo: content.repo,
      branch: content.branch,
    });
    setFormData({
      ...content,
      fields: content.fields || [],
    });
    setEditingIndex(index);
    setView("content-settings");
  };

  const [_content, setContent] = useState(""); // Raw file content
  const [body, setBody] = useState(""); // Markdown body
  const [initialBody, setInitialBody] = useState("");
  const [frontMatter, setFrontMatter] = useState<
    Record<string, unknown> | Record<string, unknown>[]
  >({}); // Parsed FM
  const [customFields, setCustomFields] = useState<
    { id: string; key: string }[]
  >([]);
  const [initialFrontMatter, setInitialFrontMatter] = useState<
    Record<string, unknown> | Record<string, unknown>[]
  >({});
  const [sha, setSha] = useState("");
  const [commits, setCommits] = useState<Commit[]>([]);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);
  const [isPrOpen, setIsPrOpen] = useState(false);

  const [prDescription, setPrDescription] = useState("");

  const [isPrLocked, setIsPrLocked] = useState(false);
  const [prStatus, setPrStatus] = useState<"open" | "merged" | "closed" | null>(
    null,
  );
  const [prDetails, setPrDetails] = useState<PrDetails | null>(null);

  // Draft Saving Logic
  useEffect(() => {
    if (view === "content-editor" && currentContent) {
      const key =
        `draft_${currentContent.owner}|${currentContent.repo}|${currentContent.filePath}`;

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
    sha,
    initialBody,
    initialFrontMatter,
  ]);

  const resetContent = () => {
    if (!currentContent) return;

    const key =
      `draft_${currentContent.owner}|${currentContent.repo}|${currentContent.filePath}`;
    localStorage.removeItem(key);
    setHasDraft(false);
    setDraftTimestamp(null);

    const params = new URLSearchParams({
      owner: currentContent.owner,
      repo: currentContent.repo,
      filePath: currentContent.filePath,
      t: Date.now().toString(), // Prevent caching
    });
    if (currentContent.branch) {
      params.append("branch", currentContent.branch);
    }
    fetch(`/api/content?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.content) {
          setContent(data.content);
          setSha(data.sha);

          // Parse content based on file type
          const content = data.content;
          const isYaml = currentContent.filePath.endsWith(".yaml") ||
            currentContent.filePath.endsWith(".yml");
          let parsedBody = "";
          let parsedFM = {};

          if (isYaml) {
            try {
              const fm = jsyaml.load(content);
              parsedFM = typeof fm === "object" && fm !== null ? fm : {};
              parsedBody = "";
            } catch (e) {
              console.error("Error parsing yaml file", e);
            }
          } else {
            const fmRegex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*([\s\S]*)$/;
            const match = content.match(fmRegex);
            parsedBody = content;

            if (match) {
              try {
                const fm = jsyaml.load(match[1]);
                parsedFM = typeof fm === "object" && fm !== null ? fm : {};
                parsedBody = match[2] ? match[2].replace(/^[\r\n]+/, "") : ""; // Trim leading newlines from body
              } catch (e) {
                console.error("Error parsing front matter", e);
              }
            }
          }

          setFrontMatter(parsedFM);

          // Initialize custom fields
          const configuredKeys = currentContent.fields?.map((f) => f.name) ||
            [];
          const customKeys = Object.keys(parsedFM).filter((k) =>
            !configuredKeys.includes(k)
          );
          setCustomFields(
            customKeys.map((k) => ({ id: crypto.randomUUID(), key: k })),
          );

          setBody(parsedBody);
          setInitialBody(parsedBody);
          setInitialFrontMatter(parsedFM);
          setPrDescription("");
        }
      })
      .catch(console.error);

    // Fetch commit history
    fetch(`/api/commits?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.commits) {
          setCommits(data.commits);
        }
      })
      .catch(console.error);
  };

  const handleReset = () => {
    if (!currentContent) return;
    if (
      !confirm(
        "Are you sure you want to discard your local changes and reset to the remote content?",
      )
    ) return;

    resetContent();
  };

  // Check PR Status
  const checkPrStatus = async () => {
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
          // PR is merged or closed -> Clear PR status and Reset content
          setPrUrl(null);
          setPrStatus(null);
          setPrDetails(null);

          // Also clear the "created" draft from localStorage
          if (currentContent) {
            const key =
              `draft_${currentContent.owner}|${currentContent.repo}|${currentContent.filePath}`;
            localStorage.removeItem(key);
            const prKey =
              `pr_${currentContent.owner}|${currentContent.repo}|${currentContent.filePath}`;
            localStorage.removeItem(prKey);
          }

          resetContent();
          return "closed";
        }
      }
    } catch (e) {
      console.error("Failed to check PR status", e);
    }
    return null;
  };

  const [loadedBranch, setLoadedBranch] = useState("");

  // Refs for accessing latest state in SSE callback
  const bodyRef = React.useRef(body);
  const frontMatterRef = React.useRef(frontMatter);
  const initialBodyRef = React.useRef(initialBody);
  const initialFrontMatterRef = React.useRef(initialFrontMatter);
  const prDescriptionRef = React.useRef(prDescription);
  const loadedBranchRef = React.useRef(loadedBranch);

  useEffect(() => {
    bodyRef.current = body;
  }, [body]);
  useEffect(() => {
    frontMatterRef.current = frontMatter;
  }, [frontMatter]);
  useEffect(() => {
    initialBodyRef.current = initialBody;
  }, [initialBody]);
  useEffect(() => {
    initialFrontMatterRef.current = initialFrontMatter;
  }, [initialFrontMatter]);
  useEffect(() => {
    prDescriptionRef.current = prDescription;
  }, [prDescription]);
  useEffect(() => {
    loadedBranchRef.current = loadedBranch;
  }, [loadedBranch]);

  // SSE Subscription
  useEffect(() => {
    const eventSource = new EventSource("/api/events");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "push" && currentContent) {
          const repoFullName = `${currentContent.owner}/${currentContent.repo}`;
          if (data.repo === repoFullName) {
            // Check branch match
            if (data.branch !== loadedBranchRef.current) {
              console.log(
                `Ignoring push to ${data.branch} (current: ${loadedBranchRef.current})`,
              );
              return;
            }

            // Check if file is in commits
            const fileChanged = data.commits.some((commit: {
              added: string[];
              modified: string[];
              removed: string[];
            }) => {
              const normalize = (p: string) => p.replace(/^\//, "");
              const path = normalize(currentContent.filePath);
              return (
                commit.added.some((f: string) => normalize(f) === path) ||
                commit.modified.some((f: string) => normalize(f) === path) ||
                commit.removed.some((f: string) => normalize(f) === path)
              );
            });

            if (fileChanged) {
              console.log("File changed remotely, checking status...");

              // Check for unsaved changes
              const isDirty = bodyRef.current !== initialBodyRef.current ||
                JSON.stringify(frontMatterRef.current) !==
                  JSON.stringify(initialFrontMatterRef.current) ||
                prDescriptionRef.current !== "";

              if (isDirty) {
                console.log(
                  "Remote change detected but local changes exist. Skipping reset.",
                );
                return;
              }

              if (prUrl) {
                checkPrStatus().then((status) => {
                  // If PR is open, we still need to update the content because the file changed
                  if (status === "open") {
                    resetContent();
                  }
                  // If closed, resetContent is already called in checkPrStatus
                });
              } else {
                resetContent();
              }
            }
          }
        } else if (data.type === "pull_request" && currentContent) {
          const repoFullName = `${currentContent.owner}/${currentContent.repo}`;
          if (data.repo === repoFullName && data.prUrl === prUrl) {
            if (data.action === "closed") {
              console.log("PR closed remotely, resetting...");
              setIsPrLocked(false);
              setPrUrl(null);
              setPrStatus(null);

              // Clear local storage
              const key =
                `draft_${currentContent.owner}|${currentContent.repo}|${currentContent.filePath}`;
              localStorage.removeItem(key);
              const prKey =
                `pr_${currentContent.owner}|${currentContent.repo}|${currentContent.filePath}`;
              localStorage.removeItem(prKey);

              resetContent();
            }
          }
        }
      } catch (e) {
        console.error("Error parsing SSE event", e);
      }
    };
    return () => {
      eventSource.close();
    };
  }, [currentContent, prUrl]);

  const [loadingContentIndex, setLoadingContentIndex] = useState<number | null>(
    null,
  );

  const loadContentData = (content: Content) => {
    setPrUrl(null); // Reset PR URL state
    setEditorLoading(true); // Start loading
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
    fetch(`/api/content?${params.toString()}`)
      .then((res) => {
        if (res.status === 404) {
          return { error: "404" };
        }
        return res.json();
      })
      .then((data) => {
        if (data.error === "404") {
          // New file (e.g. index.md in a folder)
          setContent("");
          setSha("");
          setLoadedBranch(content.branch || ""); // We don't know the branch for sure if it's new, but use config

          setBody("");
          setInitialBody("");
          setFrontMatter({});
          setInitialFrontMatter({});
          setCustomFields([]);
          setPrDescription("");

          setCurrentContent(content);
          setView("content-editor");
          setLoadingContentIndex(null);
          setEditorLoading(false);
          return;
        }

        if (data.content) {
          setContent(data.content);
          setSha(data.sha);
          setLoadedBranch(data.branch);

          const rawContent = data.content;
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
                parsedBody = match[2] ? match[2].replace(/^[\r\n]+/, "") : ""; // Trim leading newlines from body
              } catch (e) {
                console.error("Error parsing front matter", e);
              }
            }
          }

          setInitialBody(parsedBody);
          setInitialFrontMatter(parsedFM);

          // Check for local draft
          const key =
            `draft_${content.owner}|${content.repo}|${content.filePath}`;
          const savedDraft = localStorage.getItem(key);

          if (savedDraft) {
            try {
              const draft = JSON.parse(savedDraft);
              if (draft.type === "created") {
                // This draft type is for a PR that was created, but not yet merged/closed
                // We should not restore content from this draft, but rather the PR URL
                setPrUrl(draft.prUrl);
                setHasDraft(true);
                setDraftTimestamp(draft.timestamp);
                setPrDescription(draft.description || "");
                // Continue to parse remote content since we don't have draft content
                setBody(parsedBody);
                setFrontMatter(parsedFM);

                // Initialize custom fields from remote content
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

                console.log("Restored draft from local storage");
              }
            } catch (e) {
              console.error("Failed to parse draft", e);
              // If draft parsing fails, proceed with remote content
              setBody(parsedBody);
              setFrontMatter(parsedFM);
              setHasDraft(false);
            }
          } else {
            setBody(parsedBody);
            setFrontMatter(parsedFM);
            setHasDraft(false);

            // Initialize custom fields from remote content (only for object root)
            if (!Array.isArray(parsedFM)) {
              const configuredKeys = content.fields?.map((f) => f.name) ||
                [];
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
          const prKey =
            `pr_${content.owner}|${content.repo}|${content.filePath}`;
          const savedPrUrl = localStorage.getItem(prKey);
          if (savedPrUrl) {
            setPrUrl(savedPrUrl);
          }
        }

        // Transition to editor view after data is loaded
        setCurrentContent(content);
        setView("content-editor");
        setLoadingContentIndex(null);
      })
      .catch((e) => {
        console.error(e);
        setLoadingContentIndex(null);
      })
      .finally(() => setEditorLoading(false));

    // Fetch commit history
    fetch(`/api/commits?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.commits) {
          setCommits(data.commits);
        }
      })
      .catch(console.error);
  };

  const handleSelectContent = (content: Content, index: number) => {
    setLoadingContentIndex(index);
    loadContentData(content);
  };

  useEffect(() => {
    if (prUrl) {
      checkPrStatus();
    } else {
      setIsPrLocked(false);
      setPrStatus(null);
    }
  }, [prUrl, currentContent]);

  const handleSaveContent = async () => {
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
        const prKey =
          `pr_${currentContent.owner}|${currentContent.repo}|${currentContent.filePath}`;
        localStorage.setItem(prKey, data.prUrl);

        // Clear draft on success
        const key =
          `draft_${currentContent.owner}|${currentContent.repo}|${currentContent.filePath}`;
        localStorage.removeItem(key);
        setHasDraft(false);
        setDraftTimestamp(null);
        setIsPrOpen(false);
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

  if (loading || authLoading) {
    return (
      <div className="ui container">
        <Header />
        <div
          className="ui active centered inline loader"
          style={{ marginTop: "4em" }}
        >
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (!selectedRepo) {
    return (
      <RepositorySelector
        onSelect={(repoFullName) => {
          setSelectedRepo(repoFullName);
          localStorage.setItem("staticms_repo", repoFullName);
        }}
        onLogout={handleLogout}
      />
    );
  }

  const [selectedRepoOwner, selectedRepoName] = selectedRepo.split("/");
  const filteredContents = contents.filter((c) =>
    c.owner === selectedRepoOwner && c.repo === selectedRepoName
  );

  if (view === "content-settings") {
    return (
      <ContentSettings
        formData={formData}
        setFormData={setFormData}
        editingIndex={editingIndex}
        onSave={handleSaveContentConfig}
        onCancel={() => {
          setTargetRepo(null);
          setView("content-list");
        }}
        onDelete={() => {
          if (editingIndex !== null) {
            handleDeleteContent(editingIndex);
          }
        }}
        repoInfo={targetRepo!}
        loading={isSaving}
      />
    );
  }

  if (view === "content-list") {
    return (
      <ContentList
        contents={filteredContents}
        selectedRepo={selectedRepo}
        onEditContentConfig={handleEditContentConfig}
        onSelectContent={handleSelectContent}
        onAddNewContentToRepo={handleAddNewContentToRepo}
        loadingItemIndex={loadingContentIndex}
        onLogout={handleLogout}
      />
    );
  }

  // If view is "content-editor" or any other view not explicitly handled,
  // and currentContent is available, render ContentEditor.
  // This assumes currentContent will be set when view is "content-editor".
  return (
    <ContentEditor
      currentContent={currentContent!}
      onBack={() => {
        setCurrentContent(null);
        setView("content-list");
      }}
      body={body}
      setBody={setBody}
      frontMatter={frontMatter}
      setFrontMatter={setFrontMatter}
      customFields={customFields}
      setCustomFields={setCustomFields}
      onSaveContent={handleSaveContent}
      commits={commits}
      prUrl={prUrl}
      isSaving={isSaving}
      hasDraft={hasDraft}
      draftTimestamp={draftTimestamp}
      prDescription={prDescription}
      setPrDescription={setPrDescription}
      isPrOpen={isPrOpen}
      setIsPrOpen={setIsPrOpen}
      isPrLocked={isPrLocked}
      prStatus={prStatus}
      onReset={handleReset}
      loading={editorLoading}
      prDetails={prDetails}
    />
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
