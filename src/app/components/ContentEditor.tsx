import React from "react";
import { Commit, Content } from "../types.ts";
import { Loading } from "./Loading.tsx";

interface ContentEditorProps {
  currentContent: Content;
  body: string;
  setBody: (body: string) => void;
  frontMatter: Record<string, unknown>;
  setFrontMatter: (fm: Record<string, unknown>) => void;
  customFields: { id: string; key: string }[];
  setCustomFields: React.Dispatch<
    React.SetStateAction<{ id: string; key: string }[]>
  >;
  isPrLocked: boolean;
  prStatus: "open" | "merged" | "closed" | null;
  prUrl: string | null;
  hasDraft: boolean;
  draftTimestamp: number | null;
  isPrOpen: boolean;
  setIsPrOpen: (isOpen: boolean) => void;
  prDescription: string;
  setPrDescription: (desc: string) => void;
  isSaving: boolean;
  commits: Commit[];
  onSaveCollection: () => void;
  onReset: () => void;
  onBack: () => void;
  loading: boolean;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  currentContent,
  body,
  setBody,
  frontMatter,
  setFrontMatter,
  customFields,
  setCustomFields,
  isPrLocked,
  prStatus,
  prUrl,
  hasDraft,
  draftTimestamp,
  isPrOpen,
  setIsPrOpen,
  prDescription,
  setPrDescription,
  isSaving,
  commits,
  onSaveCollection,
  onReset,
  onBack,
  loading,
}) => {
  if (loading) {
    return <Loading />;
  }

  return (
    <div className="app-container editor-screen">
      <header className="editor-header">
        <div className="editor-nav">
          <button
            type="button"
            onClick={onBack}
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
              {customFields.map((field) => (
                <div key={field.id} className="form-group custom-field-group">
                  <div className="custom-field-header">
                    <input
                      type="text"
                      className="field-key-input"
                      value={field.key}
                      onChange={(e) => {
                        const newKey = e.target.value;
                        const oldKey = field.key;

                        // Update customFields state
                        setCustomFields((prev) =>
                          prev.map((f) =>
                            f.id === field.id ? { ...f, key: newKey } : f
                          )
                        );

                        // Update frontMatter state
                        if (oldKey !== newKey) {
                          const { [oldKey]: value, ...rest } = frontMatter;
                          // Strategy: Rename the key in frontMatter.
                          // Let's try: Update frontMatter immediately.
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
                        setCustomFields((prev) =>
                          prev.filter((f) =>
                            f.id !== field.id
                          )
                        );
                        const { [field.key]: _, ...rest } = frontMatter;
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
                    value={(frontMatter[field.key] as string) || ""}
                    onChange={(e) =>
                      setFrontMatter({
                        ...frontMatter,
                        [field.key]: e.target.value,
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

                    const newId = crypto.randomUUID();
                    setCustomFields([
                      ...customFields,
                      { id: newId, key: newKey },
                    ]);

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
              onClick={onReset}
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
                      onClick={onSaveCollection}
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
                  <a href={commit.html_url} target="_blank" rel="noreferrer">
                    {commit.message}
                  </a>
                </div>
                <div className="commit-meta">
                  {commit.author} • {new Date(commit.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
