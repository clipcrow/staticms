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
  const [frontMatter, setFrontMatter] = useState<Record<string, unknown>>({}); // Parsed FM
  const [sha, setSha] = useState("");
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [prDescription, setPrDescription] = useState(
    "Update collection via Staticms",
  );
  const [prTitle, setPrTitle] = useState("");

  // Draft Saving Logic
  useEffect(() => {
    if (view === "editor" && currentContent && sha) {
      const key =
        `draft_${currentContent.owner}_${currentContent.repo}_${currentContent.filePath}`;
      const draft = {
        body,
        frontMatter,
        prTitle,
        prDescription,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(draft));
    }
  }, [body, frontMatter, prTitle, prDescription, view, currentContent, sha]);

  const handleReset = () => {
    if (!currentContent) return;
    if (
      !confirm(
        "Are you sure you want to discard your local changes and reset to the remote content?",
      )
    ) return;

    const key =
      `draft_${currentContent.owner}_${currentContent.repo}_${currentContent.filePath}`;
    localStorage.removeItem(key);

    // Trigger re-fetch by temporarily clearing currentContent or forcing update
    // Easier: just manually call the fetch logic or reload the view
    // Let's just clear state and let useEffect re-run?
    // No, useEffect depends on [view, currentContent]. They haven't changed.
    // We can manually fetch here.

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
          const fmRegex =
            /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/;
          const match = content.match(fmRegex);

          if (match) {
            try {
              const fm = jsyaml.load(match[1]);
              setFrontMatter(typeof fm === "object" && fm !== null ? fm : {});
              setBody(match[2]);
            } catch (e) {
              console.error("Error parsing front matter", e);
              setFrontMatter({});
              setBody(content);
            }
          } else {
            setFrontMatter({});
            setBody(content);
          }
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (view === "editor" && currentContent) {
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

            // Check for local draft
            const key =
              `draft_${currentContent.owner}_${currentContent.repo}_${currentContent.filePath}`;
            const savedDraft = localStorage.getItem(key);

            if (savedDraft) {
              try {
                const draft = JSON.parse(savedDraft);
                // Restore from draft
                setBody(draft.body);
                setFrontMatter(draft.frontMatter);
                setPrTitle(draft.prTitle);
                setPrDescription(draft.prDescription);
                console.log("Restored draft from local storage");
                return; // Skip parsing remote content if draft exists
              } catch (e) {
                console.error("Failed to parse draft", e);
              }
            }

            // Parse Front Matter from remote content if no draft or draft failed
            const content = data.collection;
            // Robust regex for Front Matter (handles \n, \r\n, and trailing spaces)
            const fmRegex =
              /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/;
            const match = content.match(fmRegex);

            if (match) {
              try {
                const fm = jsyaml.load(match[1]);
                setFrontMatter(typeof fm === "object" && fm !== null ? fm : {});
                setBody(match[2]);
              } catch (e) {
                console.error("Error parsing front matter", e);
                setFrontMatter({});
                setBody(content);
              }
            } else {
              // Check if the file is purely YAML (no body, no fences) - optional, but sticking to fenced FM for now
              setFrontMatter({});
              setBody(content);
            }
          }
        })
        .catch(console.error);
    }
  }, [view, currentContent]);

  const handleSaveCollection = async () => {
    if (!currentContent) return;
    setIsSaving(true);
    setPrUrl(null);

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
      const res = await fetch("/api/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: finalContent,
          sha,
          description: prDescription,
          title: prTitle,
          owner: currentContent.owner,
          repo: currentContent.repo,
          filePath: currentContent.filePath,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPrUrl(data.prUrl);
        // Clear draft on success
        const key =
          `draft_${currentContent.owner}_${currentContent.repo}_${currentContent.filePath}`;
        localStorage.removeItem(key);
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
                setSha(""); // Reset SHA
              }}
              className="btn btn-secondary btn-back"
            >
              &larr; Back
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary btn-sm"
              title="Discard local changes and reset to remote content"
            >
              Reset
            </button>
            <span className="file-path-badge">{currentContent.filePath}</span>
          </div>
        </header>
        <div className="editor-main-split">
          {currentContent.fields && currentContent.fields.length > 0 && (
            <div className="editor-sidebar">
              <h3>Front Matter</h3>
              {currentContent.fields.map((field, index) => (
                <div key={index} className="form-group">
                  <label>{field.name}</label>
                  <input
                    type="text"
                    value={(frontMatter[field.name] as string) || ""}
                    onChange={(e) =>
                      setFrontMatter({
                        ...frontMatter,
                        [field.name]: e.target.value,
                      })}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="editor-content">
            <textarea
              className="full-screen-editor"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Start editing markdown body..."
            />
          </div>
          <div className="editor-sidebar-right">
            <h3>Pull Request</h3>
            {prUrl && (
              <div className="pr-success-banner">
                <a href={prUrl} target="_blank" rel="noreferrer">
                  View Created PR
                </a>
              </div>
            )}
            <div className="form-group">
              <label>Title</label>
              <input
                className="pr-input"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder="PR Title..."
              />
            </div>
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
