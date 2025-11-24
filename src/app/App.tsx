import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import jsyaml from "js-yaml";
import { Commit, Content } from "./types.ts";
import { ContentList } from "./components/ContentList.tsx";
import { ContentSettings } from "./components/ContentSettings.tsx";
import { ContentEditor } from "./components/ContentEditor.tsx";
import { Loading } from "./components/Loading.tsx";

function App() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentContent, setCurrentContent] = useState<Content | null>(null);
  const [view, setView] = useState<
    "content-list" | "content-editor" | "content-settings"
  >(
    "content-list",
  );

  const [formData, setFormData] = useState<Content>({
    owner: "",
    repo: "",
    filePath: "",
    fields: [],
  });

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
    setFormData({
      ...contents[index],
      fields: contents[index].fields || [],
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
    fetch(`/api/collection?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.collection) {
          setCollection(data.collection);
          setSha(data.sha);

          // Parse Front Matter directly (ignoring draft since we just deleted it)
          const content = data.collection;
          // Robust regex for Front Matter (handles \n, \r\n, and trailing spaces)
          const fmRegex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*([\s\S]*)$/;
          const match = content.match(fmRegex);

          let parsedBody = content;
          let parsedFM = {};

          if (match) {
            try {
              const fm = jsyaml.load(match[1]);
              parsedFM = typeof fm === "object" && fm !== null ? fm : {};
              parsedBody = match[2] ? match[2].replace(/^[\r\n]+/, "") : ""; // Trim leading newlines from body
            } catch (e) {
              console.error("Error parsing front matter", e);
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
    if (!prUrl) return;
    try {
      const res = await fetch(
        `/api/pr-status?prUrl=${encodeURIComponent(prUrl)}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.state === "open") {
          setIsPrLocked(true);
          setPrStatus("open");
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
        }
      }
    } catch (e) {
      console.error("Failed to check PR status", e);
    }
  };

  // SSE Subscription
  useEffect(() => {
    const eventSource = new EventSource("/api/events");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "push" && currentContent) {
          const repoFullName = `${currentContent.owner}/${currentContent.repo}`;
          if (data.repo === repoFullName) {
            // Check if file is in commits
            // deno-lint-ignore no-explicit-any
            const fileChanged = data.commits.some((commit: any) => {
              const normalize = (p: string) => p.replace(/^\//, "");
              const path = normalize(currentContent.filePath);
              return (
                commit.added.some((f: string) => normalize(f) === path) ||
                commit.modified.some((f: string) => normalize(f) === path) ||
                commit.removed.some((f: string) => normalize(f) === path)
              );
            });

            if (fileChanged) {
              console.log("File changed remotely, resetting content...");
              resetContent();
              if (prUrl) {
                checkPrStatus();
              }
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
  }, [currentContent]);

  useEffect(() => {
    if (view === "content-editor" && currentContent) {
      setEditorLoading(true); // Start loading
      const params = new URLSearchParams({
        owner: currentContent.owner,
        repo: currentContent.repo,
        filePath: currentContent.filePath,
        t: Date.now().toString(), // Prevent caching
      });
      fetch(`/api/collection?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.collection) {
            setCollection(data.collection);
            setSha(data.sha);

            const content = data.collection;
            const fmRegex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*([\s\S]*)$/;
            const match = content.match(fmRegex);

            let parsedBody = content;
            let parsedFM = {};

            if (match) {
              try {
                const fm = jsyaml.load(match[1]);
                parsedFM = typeof fm === "object" && fm !== null ? fm : {};
                parsedBody = match[2] ? match[2].replace(/^[\r\n]+/, "") : ""; // Trim leading newlines from body
              } catch (e) {
                console.error("Error parsing front matter", e);
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
          finalContent = `---\n${yamlString}---\n${body}`;
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
        finalContent = `---\n${yamlString}---\n${body}`;
      } catch (e) {
        console.error("Error dumping yaml", e);
        finalContent = body;
      }
    }

    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const HH = String(now.getHours()).padStart(2, "0");
      const MM = String(now.getMinutes()).padStart(2, "0");
      const generatedTitle = `STATICMS ${yyyy}${mm}${dd}${HH}${MM}`;

      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: currentContent.owner,
          repo: currentContent.repo,
          path: currentContent.filePath,
          content: finalContent,
          message: prDescription || "Update collection via Staticms",
          branch: `staticms-update-${Date.now()}`,
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

  if (view === "content-settings") {
    return (
      <ContentSettings
        formData={formData}
        setFormData={setFormData}
        editingIndex={editingIndex}
        onSave={handleSaveContentConfig}
        onCancel={() => {
          setView("content-list");
          setEditingIndex(null);
          setFormData({
            owner: "",
            repo: "",
            filePath: "",
            fields: [],
          });
        }}
      />
    );
  }

  if (view === "content-editor" && currentContent) {
    return (
      <ContentEditor
        currentContent={currentContent}
        body={body}
        setBody={setBody}
        frontMatter={frontMatter}
        setFrontMatter={setFrontMatter}
        customFields={customFields}
        setCustomFields={setCustomFields}
        isPrLocked={isPrLocked}
        prStatus={prStatus}
        prUrl={prUrl}
        hasDraft={hasDraft}
        draftTimestamp={draftTimestamp}
        isPrOpen={isPrOpen}
        setIsPrOpen={setIsPrOpen}
        prDescription={prDescription}
        setPrDescription={setPrDescription}
        isSaving={isSaving}
        commits={commits}
        onSaveCollection={handleSaveCollection}
        onReset={handleReset}
        onBack={() => {
          setView("content-list");
          setCurrentContent(null);
          setPrUrl(null);
          setCollection("");
          setBody("");
          setFrontMatter({});
          setSha("");
          setCommits([]);
        }}
        loading={editorLoading}
      />
    );
  }

  return (
    <ContentList
      contents={contents}
      onEditContentConfig={handleEditContentConfig}
      onDeleteContent={handleDeleteContent}
      onSelectContent={(content) => {
        setCurrentContent(content);
        setView("content-editor");
      }}
      onAddNewContent={() => {
        setFormData({ owner: "", repo: "", filePath: "", fields: [] });
        setEditingIndex(null);
        setView("content-settings");
      }}
    />
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
