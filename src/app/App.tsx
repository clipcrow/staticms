import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import jsyaml from "js-yaml";
import { Commit, Content } from "./types.ts";
import { ContentList } from "./components/ContentList.tsx";
import { ContentSettings } from "./components/ContentSettings.tsx";
import { ContentEditor } from "./components/ContentEditor.tsx";
import { Loading } from "./components/Loading.tsx";
import { RepositorySettings } from "./components/RepositorySettings.tsx";

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

  const handleAddNewRepository = () => {
    setTargetRepo(null);
    setView("repository-settings");
  };

  const handleRepositoryNext = (
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
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.contents) {
          // Ensure fields array exists for older configs
          const contentsWithFields = data.contents.map((c: Content) => ({
            ...c,
            fields: c.fields || [],
          }));
          setContents(contentsWithFields);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSaveContentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    let newContents = [...contents];
    if (editingIndex !== null) {
      newContents[editingIndex] = formData;
    } else {
      newContents = [...contents, formData];
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

  const [_collection, setCollection] = useState(""); // Raw file content
  const [body, setBody] = useState(""); // Markdown body
  const [initialBody, setInitialBody] = useState("");
  const [frontMatter, setFrontMatter] = useState<Record<string, unknown>>({}); // Parsed FM
  const [customFields, setCustomFields] = useState<
    { id: string; key: string }[]
  >([]);
  const [initialFrontMatter, setInitialFrontMatter] = useState<
    Record<string, unknown>
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

  // Draft Saving Logic
  useEffect(() => {
    if (view === "content-editor" && currentContent && sha) {
      const key =
        `draft_${currentContent.owner}_${currentContent.repo}_${currentContent.filePath}`;

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
      `draft_${currentContent.owner}_${currentContent.repo}_${currentContent.filePath}`;
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
    fetch(`/api/collection?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.collection) {
          setCollection(data.collection);
          setSha(data.sha);

          // Parse content based on file type
          const content = data.collection;
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
          return "open";
        } else {
          setIsPrLocked(false);
          // PR is merged or closed -> Clear PR status and Reset content
          setPrUrl(null);
          setPrStatus(null);

          // Also clear the "created" draft from localStorage
          if (currentContent) {
            const key =
              `draft_${currentContent.owner}_${currentContent.repo}_${currentContent.filePath}`;
            localStorage.removeItem(key);
            const prKey =
              `pr_${currentContent.owner}_${currentContent.repo}_${currentContent.filePath}`;
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
                `draft_${currentContent.owner}_${currentContent.repo}_${currentContent.filePath}`;
              localStorage.removeItem(key);
              const prKey =
                `pr_${currentContent.owner}_${currentContent.repo}_${currentContent.filePath}`;
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

  useEffect(() => {
    if (view === "content-editor" && currentContent) {
      setEditorLoading(true); // Start loading
      const params = new URLSearchParams({
        owner: currentContent.owner,
        repo: currentContent.repo,
        filePath: currentContent.filePath,
        t: Date.now().toString(), // Prevent caching
      });
      if (currentContent.branch) {
        params.append("branch", currentContent.branch);
      }
      fetch(`/api/collection?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.collection) {
            setCollection(data.collection);
            setSha(data.sha);
            setLoadedBranch(data.branch);

            const content = data.collection;
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

            setInitialBody(parsedBody);
            setInitialFrontMatter(parsedFM);

            // Check for local draft
            const key =
              `draft_${currentContent.owner}_${currentContent.repo}_${currentContent.filePath}`;
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
                  const configuredKeys = currentContent.fields?.map((f) =>
                    f.name
                  ) || [];
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
                  // Restore from draft
                  setBody(draft.body);
                  setFrontMatter(draft.frontMatter);
                  setPrDescription(draft.prDescription);
                  setHasDraft(true);
                  setDraftTimestamp(draft.timestamp);

                  // Initialize custom fields from draft
                  const configuredKeys = currentContent.fields?.map((f) =>
                    f.name
                  ) || [];
                  const customKeys = Object.keys(draft.frontMatter).filter((
                    k,
                  ) => !configuredKeys.includes(k));
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

              // Initialize custom fields from remote content
              const configuredKeys = currentContent.fields?.map((f) =>
                f.name
              ) || [];
              const customKeys = Object.keys(parsedFM).filter((k) =>
                !configuredKeys.includes(k)
              );
              setCustomFields(
                customKeys.map((k) => ({
                  id: crypto.randomUUID(),
                  key: k,
                })),
              );
            }

            // Check for existing PR URL
            const prKey =
              `pr_${currentContent.owner}_${currentContent.repo}_${currentContent.filePath}`;
            const savedPrUrl = localStorage.getItem(prKey);
            if (savedPrUrl) {
              setPrUrl(savedPrUrl);
            }
          }
        })
        .catch(console.error)
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
    }
  }, [view, currentContent]);

  useEffect(() => {
    if (prUrl) {
      checkPrStatus();
    } else {
      setIsPrLocked(false);
      setPrStatus(null);
    }
  }, [prUrl, currentContent]);

  const handleSaveCollection = async () => {
    if (!currentContent) return;
    setIsSaving(true);
    setPrUrl(null); // Clear PR URL state temporarily until new PR is created

    // Reconstruct content with Front Matter
    const isYaml = currentContent.filePath.endsWith(".yaml") ||
      currentContent.filePath.endsWith(".yml");
    let finalContent = body;

    if (currentContent.fields && currentContent.fields.length > 0) {
      // Only include fields that are defined in the config
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
    } else if (Object.keys(frontMatter).length > 0) {
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
        `[handleSaveCollection] Sending branch: "${currentContent.branch}"`,
      );

      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: currentContent.owner,
          repo: currentContent.repo,
          path: currentContent.filePath,
          branch: currentContent.branch,
          content: finalContent,
          message: prDescription || "Update collection via Staticms",
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
          `pr_${currentContent.owner}_${currentContent.repo}_${currentContent.filePath}`;
        localStorage.setItem(prKey, data.prUrl);

        // Clear draft on success
        const key =
          `draft_${currentContent.owner}_${currentContent.repo}_${currentContent.filePath}`;
        localStorage.removeItem(key);
        setHasDraft(false);
        setDraftTimestamp(null);
        setIsPrOpen(false);
        setPrDescription("");

        // Update initial state to prevent "Unsaved Changes" detection
        setInitialBody(body);
        setInitialFrontMatter(frontMatter);
      } else {
        console.error("Failed to create PR: " + data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (view === "repository-settings") {
    return (
      <RepositorySettings
        onNext={handleRepositoryNext}
        onCancel={() => setView("content-list")}
      />
    );
  }

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
      />
    );
  }

  if (view === "content-list") {
    return (
      <ContentList
        contents={contents}
        onEditContentConfig={handleEditContentConfig}
        onSelectContent={(content) => {
          setCurrentContent(content);
          setView("content-editor");
        }}
        onAddNewContent={handleAddNewRepository}
        onAddNewContentToRepo={handleAddNewContentToRepo}
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
      onSaveCollection={handleSaveCollection}
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
    />
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
