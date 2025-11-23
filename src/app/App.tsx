import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

interface Config {
  owner: string;
  repo: string;
  filePath: string;
}

function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Config>({
    owner: "",
    repo: "",
    filePath: "",
  });

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.owner) {
          setConfig(data);
          setFormData(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setConfig(formData);
        alert("Configuration saved!");
      } else {
        alert("Failed to save configuration");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving configuration");
    }
  };

  const [content, setContent] = useState("");
  const [sha, setSha] = useState("");
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [prDescription, setPrDescription] = useState(
    "Update content via Staticms",
  );

  useEffect(() => {
    if (config) {
      fetch("/api/content")
        .then((res) => res.json())
        .then((data) => {
          if (data.content) {
            setContent(data.content);
            setSha(data.sha);
          }
        })
        .catch(console.error);
    }
  }, [config]);

  const handleSaveContent = async () => {
    setIsSaving(true);
    setPrUrl(null);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, sha, description: prDescription }),
      });
      const data = await res.json();
      if (data.success) {
        setPrUrl(data.prUrl);
        alert("PR Created Successfully!");
      } else {
        alert("Failed to create PR: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error creating PR");
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

  if (!config) {
    return (
      <div className="app-container setup-screen">
        <div className="card setup-card">
          <h1 className="title gradient-text">Setup Staticms</h1>
          <p className="subtitle">
            Configure your GitHub target to get started.
          </p>

          <form onSubmit={handleSubmit} className="setup-form">
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
            <button type="submit" className="btn btn-primary">
              Save Configuration
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container dashboard">
      <div className="dashboard-content">
        <header className="dashboard-header">
          <h1 className="title gradient-text">Staticms Dashboard</h1>
          <button
            onClick={() => setConfig(null)}
            className="btn btn-secondary"
            type="button"
          >
            Settings
          </button>
        </header>

        <div className="card info-card">
          <h2>Current Target</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Owner</span>
              <span className="value">{config.owner}</span>
            </div>
            <div className="info-item">
              <span className="label">Repository</span>
              <span className="value">{config.repo}</span>
            </div>
            <div className="info-item">
              <span className="label">File Path</span>
              <span className="value">{config.filePath}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-widgets">
          <div className="card widget editor-widget">
            <div className="widget-header">
              <h2>Editor</h2>
              {prUrl && (
                <a
                  href={prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="pr-link"
                >
                  View Pull Request &rarr;
                </a>
              )}
            </div>
            <textarea
              className="markdown-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Loading content..."
            />
            <div className="editor-actions-container">
              <div className="pr-description-group">
                <label>PR Description</label>
                <textarea
                  className="pr-description-input"
                  value={prDescription}
                  onChange={(e) => setPrDescription(e.target.value)}
                  placeholder="Describe your changes..."
                  rows={2}
                />
              </div>
              <div className="editor-actions">
                <button
                  onClick={handleSaveContent}
                  disabled={isSaving}
                  className="btn btn-primary"
                  type="button"
                >
                  {isSaving ? "Creating PR..." : "Save & Create PR"}
                </button>
              </div>
            </div>
          </div>
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
