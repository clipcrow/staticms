import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import jsyaml from "js-yaml";

interface Field {
  name: string;
}

interface Content {
  owner: string;
  repo: string;
  filePath: string;
  fields: Field[];
}

interface Config {
  contents: Content[];
}

interface Commit {
  message: string;
  author: string;
  date: string;
  sha: string;
  html_url: string;
}

function App() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentContent, setCurrentContent] = useState<Content | null>(null);
  const [view, setView] = useState<"dashboard" | "editor" | "new-content">(
    "dashboard",
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
        setView("dashboard");
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
    setView("new-content");
  };

  // Form Design Handlers
  const handleAddField = () => {
    setFormData({
      ...formData,
      fields: [...formData.fields, { name: "New Field" }],
    });
  };

  const handleUpdateFieldName = (index: number, name: string) => {
    const newFields = [...formData.fields];
    newFields[index].name = name;
    setFormData({ ...formData, fields: newFields });
  };

  const handleDeleteField = (index: number) => {
    const newFields = formData.fields.filter((_, i) => i !== index);
    setFormData({ ...formData, fields: newFields });
  };

  const [_collection, setCollection] = useState(""); // Raw file content
  const [body, setBody] = useState(""); // Markdown body
  const [initialBody, setInitialBody] = useState("");
  const [frontMatter, setFrontMatter] = useState<Record<string, unknown>>({}); // Parsed FM
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [prDescription, setPrDescription] = useState("");

  const [isPrLocked, setIsPrLocked] = useState(false);
  const [prStatus, setPrStatus] = useState<"open" | "merged" | "closed" | null>(
    null,
  );

  // Draft Saving Logic
  useEffect(() => {
    if (view === "editor" && currentContent && sha) {
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
    setPrDescription("");

    const params = new URLSearchParams({
      owner: currentContent.owner,
      repo: currentContent.repo,
      filePath: currentContent.filePath,
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
          const fmRegex =
            /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/;
          const match = content.match(fmRegex);

          let parsedBody = content;
          let parsedFM = {};

          if (match) {
            try {
              const fm = jsyaml.load(match[1]);
              parsedFM = typeof fm === "object" && fm !== null ? fm : {};
              parsedBody = match[2];
            } catch (e) {
              console.error("Error parsing front matter", e);
            }
          }

          setFrontMatter(parsedFM);
          setBody(parsedBody);
          setInitialBody(parsedBody);
          setInitialFrontMatter(parsedFM);
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
              return (
                commit.added.includes(currentContent.filePath) ||
                commit.modified.includes(currentContent.filePath) ||
                commit.removed.includes(currentContent.filePath)
              );
            });

            if (fileChanged) {
              console.log("File changed remotely, refreshing...");
              setRefreshTrigger((prev) => prev + 1);
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
    if (view === "editor" && currentContent) {
      setEditorLoading(true); // Start loading
      const params = new URLSearchParams({
        owner: currentContent.owner,
        repo: currentContent.repo,
        filePath: currentContent.filePath,
      });
      fetch(`/api/collection?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.collection) {
            setCollection(data.collection);
            setSha(data.sha);

            // Parse Front Matter from remote content if no draft or draft failed
            const content = data.collection;
            // Robust regex for Front Matter (handles \n, \r\n, and trailing spaces)
            const fmRegex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\S]*$/; // Updated regex to handle optional trailing content
            const match = content.match(fmRegex);

            let parsedBody = content;
            let parsedFM = {};

            if (match) {
              try {
                const fm = jsyaml.load(match[1]);
                parsedFM = typeof fm === "object" && fm !== null ? fm : {};
                parsedBody = match[2] || ""; // Ensure body is not undefined
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
  }, [view, currentContent, refreshTrigger]);

  // Check PR Status
  useEffect(() => {
    if (prUrl) {
      const checkPrStatus = async () => {
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
    return (
      <div className="app-container loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (view === "new-content") {
    return (
      <div className="app-container setup-screen">
        <div className="card setup-card">
          <h1 className="title gradient-text">
            {editingIndex !== null ? "Edit Content" : "Add Content"}
          </h1>
          <p className="subtitle">
            {editingIndex !== null
              ? "Update your GitHub content configuration."
              : "Configure a new GitHub content."}
          </p>

          <form onSubmit={handleSaveContentConfig} className="setup-form">
            <div className="form-group">
              <label>GitHub Owner</label>
              <input
                type="text"
                placeholder="e.g. facebook"
                value={formData.owner}
                onChange={(e) =>
                  setFormData({ ...formData, owner: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>GitHub Repo</label>
              <input
                type="text"
                placeholder="e.g. react"
                value={formData.repo}
                onChange={(e) =>
                  setFormData({ ...formData, repo: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>File Path</label>
              <input
                type="text"
                placeholder="e.g. content/blog/post.md"
                value={formData.filePath}
                onChange={(e) =>
                  setFormData({ ...formData, filePath: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Form Fields (Front Matter)</label>
              <div className="fields-list">
                {formData.fields.map((field, index) => (
                  <div key={index} className="field-item">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) =>
                        handleUpdateFieldName(index, e.target.value)}
                      placeholder="Field Name"
                      className="field-input"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteField(index)}
                      className="btn-icon delete-icon"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddField}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: "0.5rem" }}
              >
                + Add Field
              </button>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setView("dashboard");
                  setEditingIndex(null);
                  setFormData({
                    owner: "",
                    repo: "",
                    filePath: "",
                    fields: [],
                  });
                }}
                className="btn btn-secondary"
                style={{ marginRight: "1rem" }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingIndex !== null ? "Update Content" : "Add Content"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (view === "editor" && currentContent) {
    if (editorLoading) {
      return (
        <div className="app-container loading">
          <div className="spinner"></div>
        </div>
      );
    }
    return (
      <div className="app-container editor-screen">
        <header className="editor-header">
          <div className="editor-nav">
            <button
              type="button"
              onClick={() => {
                setView("dashboard");
                setCurrentContent(null);
                setPrUrl(null);
                setCollection("");
                setBody("");
                setFrontMatter({});
                setBody("");
                setFrontMatter({});
                setSha(""); // Reset SHA
                setCommits([]);
              }}
              className="btn btn-secondary btn-back"
            >
              &larr; Back
            </button>

            <span className="file-path-badge">{currentContent.filePath}</span>
          </div>
          {isPrLocked && (
            <div className="locked-banner-header">
              🔒 This file is currently locked because there is an open Pull
              Request.
            </div>
          )}
        </header>
        <div className="editor-main-split">
          <div className="editor-content">
            <div className="editor-frontmatter-top">
              <h3>Front Matter</h3>
              <div className="frontmatter-grid">
                {/* Configured Fields */}
                {currentContent.fields?.map((field, index) => (
                  <div key={`configured-${index}`} className="form-group">
                    <label>{field.name}</label>
                    <input
                      type="text"
                      value={(frontMatter[field.name] as string) || ""}
                      onChange={(e) =>
                        setFrontMatter({
                          ...frontMatter,
                          [field.name]: e.target.value,
                        })}
                      readOnly={isPrLocked}
                      disabled={isPrLocked}
                    />
                  </div>
                ))}

                {/* Custom/Extra Fields */}
                {Object.keys(frontMatter)
                  .filter(
                    (key) =>
                      !currentContent.fields?.some((f) => f.name === key),
                  )
                  .map((key) => (
                    <div
                      key={`custom-${key}`}
                      className="form-group custom-field-group"
                    >
                      <div className="custom-field-header">
                        <input
                          type="text"
                          className="field-key-input"
                          value={key}
                          onChange={(e) => {
                            const newKey = e.target.value;
                            if (newKey && !frontMatter[newKey]) {
                              const { [key]: value, ...rest } = frontMatter;
                              setFrontMatter({
                                ...rest,
                                [newKey]: value,
                              });
                            }
                          }}
                          placeholder="Key"
                          readOnly={isPrLocked}
                          disabled={isPrLocked}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const { [key]: _, ...rest } = frontMatter;
                            setFrontMatter(rest);
                          }}
                          className="btn-icon delete-icon"
                          title="Delete Field"
                          disabled={isPrLocked}
                        >
                          🗑️
                        </button>
                      </div>
                      <input
                        type="text"
                        value={(frontMatter[key] as string) || ""}
                        onChange={(e) =>
                          setFrontMatter({
                            ...frontMatter,
                            [key]: e.target.value,
                          })}
                        placeholder="Value"
                        readOnly={isPrLocked}
                        disabled={isPrLocked}
                      />
                    </div>
                  ))}

                {/* Add New Field Button */}
                <div className="form-group add-field-group">
                  <button
                    type="button"
                    onClick={() => {
                      let newKey = "new_field";
                      let counter = 1;
                      while (frontMatter[newKey]) {
                        newKey = `new_field_${counter}`;
                        counter++;
                      }
                      setFrontMatter({
                        ...frontMatter,
                        [newKey]: "",
                      });
                    }}
                    className="btn btn-secondary btn-sm btn-add-field"
                    disabled={isPrLocked}
                  >
                    + Add Item
                  </button>
                </div>
              </div>
            </div>
            <textarea
              className="full-screen-editor"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Start editing markdown body..."
              readOnly={isPrLocked}
              disabled={isPrLocked}
            />
          </div>
          <div className="editor-sidebar-right">
            <div className="sidebar-header-row">
              <h3>History</h3>
              <button
                type="button"
                onClick={handleReset}
                disabled={!hasDraft || isPrLocked}
                className="btn btn-secondary btn-sm"
                title="Discard local changes and reset to remote content"
              >
                Reset
              </button>
            </div>

            {prUrl && (
              <div className="pr-status-block">
                <p>
                  {prStatus === "merged"
                    ? "✅ Pull Request Merged"
                    : prStatus === "closed"
                    ? "❌ Pull Request Closed"
                    : "⏳ Pull Request Open"}
                </p>
                <a
                  href={prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  View PR
                </a>
              </div>
            )}

            <div className="commits-list">
              {hasDraft && (
                <div
                  className={`draft-section ${
                    prStatus === "open"
                      ? "success"
                      : prStatus === "merged" || prStatus === "closed"
                      ? "closed"
                      : prUrl
                      ? "success"
                      : ""
                  }`}
                >
                  <div
                    className="draft-header"
                    onClick={() => setIsPrOpen(!isPrOpen)}
                  >
                    <span className="draft-indicator">
                      {prStatus === "merged"
                        ? "● PR Merged"
                        : prStatus === "closed"
                        ? "● PR Closed"
                        : prUrl
                        ? "● PR Created"
                        : "● Local Copy"}
                    </span>
                    <span className="draft-timestamp">
                      {draftTimestamp
                        ? new Date(draftTimestamp).toLocaleString()
                        : ""}
                    </span>
                    <span className="draft-toggle">{isPrOpen ? "▼" : "▶"}</span>
                  </div>
                  {isPrOpen && (
                    <div className="draft-content">
                      <div className="form-group">
                        <label>Description</label>
                        <textarea
                          className="pr-textarea"
                          value={prDescription}
                          onChange={(e) => setPrDescription(e.target.value)}
                          placeholder="PR Description..."
                          rows={4}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveCollection}
                        disabled={isSaving}
                        className="btn btn-primary btn-save"
                      >
                        {isSaving ? "Creating..." : "Create PR"}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {commits.map((commit) => (
                <div key={commit.sha} className="commit-item">
                  <div className="commit-message">
                    <a
                      href={commit.html_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {commit.message}
                    </a>
                  </div>
                  <div className="commit-meta">
                    {commit.author} •{" "}
                    {new Date(commit.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container dashboard">
      <div className="dashboard-content">
        <header className="dashboard-header">
          <h1 className="title gradient-text">Staticms Dashboard</h1>
        </header>

        <div className="card info-card">
          <div className="info-header">
            <h2>Contents</h2>
            <button
              type="button"
              onClick={() => {
                setFormData({ owner: "", repo: "", filePath: "", fields: [] });
                setEditingIndex(null);
                setView("new-content");
              }}
              className="btn btn-primary btn-edit"
            >
              Add Content
            </button>
          </div>

          {contents.length === 0
            ? (
              <div className="empty-state">
                <p>No contents configured yet.</p>
              </div>
            )
            : (
              <div className="contents-grid">
                {contents.map((content, index) => (
                  <div
                    key={index}
                    className="content-card clickable-card"
                    onClick={() => {
                      setCurrentContent(content);
                      setEditorLoading(true);
                      setView("editor");
                    }}
                  >
                    <div className="content-info">
                      <div className="info-item">
                        <span className="label">Repo</span>
                        <span className="value">
                          {content.owner}/{content.repo}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="label">File</span>
                        <span className="value">{content.filePath}</span>
                      </div>
                    </div>
                    <div className="content-actions">
                      <div className="content-actions-secondary">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditContentConfig(index);
                          }}
                          className="btn-icon"
                          title="Edit Configuration"
                        >
                          ⚙️
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContent(index);
                          }}
                          className="btn-icon delete-icon"
                          title="Delete Content"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
