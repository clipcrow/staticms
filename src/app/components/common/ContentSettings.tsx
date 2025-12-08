import React, { useEffect } from "react";
import { Collection } from "@/app/hooks/useContentConfig.ts";
import { MarkdownEditor } from "../editor/MarkdownEditor.tsx";
import { FieldList } from "@/app/features/config/ContentConfigHelpers.tsx";
// Use Content type only for MarkdownEditor shim
import { Content } from "../editor/types.ts";

interface ContentSettingsProps {
  formData: Collection;
  setFormData: (data: Collection) => void;
  editingIndex: number | null;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDelete: () => void;
  repoInfo: { owner: string; repo: string };
  loading?: boolean;
}

export const ContentSettings: React.FC<ContentSettingsProps> = ({
  formData,
  setFormData,
  editingIndex,
  onSave,
  onCancel,
  onDelete,
  repoInfo,
  loading = false,
}) => {
  // Initialize type/binding if missing (e.g. fresh add)
  useEffect(() => {
    if (!formData.type) {
      setFormData({ ...formData, type: "collection" });
    }
    // Default binding based on type if not set?
    // Actually, "Binding" is mostly for Singleton. For Collection it implies behavior.
    // Spec says: "Content Binding" -> Type: Collection/Singleton, Binding: File/Directory.
    // If Collection, spec says "Collection + File" is default.
  }, []);

  const handleChange = (key: keyof Collection, value: unknown) => {
    setFormData({ ...formData, [key]: value });
  };

  // Helper to determine path label
  const getPathLabel = () => {
    const binding = formData.binding || "file"; // default to file if unset
    if (binding === "directory") {
      return "Content Folder Path";
    }
    return "Content File Path";
  };

  const isCollection = formData.type === "collection";
  const binding = formData.binding || "file"; // default to file

  // Shim for MarkdownEditor which expects legacy Content type
  const shimContent: Content = {
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    name: "Archetype",
    filePath: "", // Dummy
    type: "collection-files", // Dummy
    fields: [],
    branch: formData.branch,
  };

  return (
    <div className="ui container">
      <form onSubmit={onSave}>
        {/* Basic Settings */}
        <div className="ui segment">
          <h4 className="ui dividing header">Basic Settings</h4>
          <div className="ui form">
            {/* Content Name (Label) */}
            <div className="field">
              <label>Content Name (Label) - Optional</label>
              <input
                type="text"
                placeholder="e.g. Blog Post"
                value={formData.label || ""}
                onChange={(e) => handleChange("label", e.target.value)}
                disabled={loading}
              />
              <small className="helper-text">
                Display name in UI. If empty, the Path will be used.
              </small>
            </div>

            {/* Type Selection */}
            <div className="field">
              <label>Content Type</label>
              <div className="inline fields">
                <div className="field">
                  <div className="ui radio checkbox">
                    <input
                      type="radio"
                      name="contentType"
                      checked={formData.type === "collection" || !formData.type}
                      onChange={() => handleChange("type", "collection")}
                      disabled={loading}
                    />
                    <label>Collection (Folder based)</label>
                  </div>
                </div>
                <div className="field">
                  <div className="ui radio checkbox">
                    <input
                      type="radio"
                      name="contentType"
                      checked={formData.type === "singleton"}
                      onChange={() => handleChange("type", "singleton")}
                      disabled={loading}
                    />
                    <label>Singleton (File/One-off)</label>
                  </div>
                </div>
              </div>
            </div>

            {/* Binding Selection */}
            <div className="field">
              <label>Binding</label>
              <div className="inline fields">
                <div className="field">
                  <div className="ui radio checkbox">
                    <input
                      type="radio"
                      name="contentBinding"
                      checked={binding === "file"}
                      onChange={() => handleChange("binding", "file")}
                      disabled={loading}
                    />
                    <label>File</label>
                  </div>
                </div>
                <div className="field">
                  <div className="ui radio checkbox">
                    <input
                      type="radio"
                      name="contentBinding"
                      checked={binding === "directory"}
                      onChange={() => handleChange("binding", "directory")}
                      disabled={loading}
                    />
                    <label>Directory</label>
                  </div>
                </div>
              </div>
              <div
                className="ui info message mini"
                style={{ marginTop: "5px" }}
              >
                <p style={{ fontSize: "0.9em" }}>
                  {isCollection && binding === "file" &&
                    "Collection + File: Manages multiple Markdown files in the folder."}
                  {isCollection && binding === "directory" &&
                    "Collection + Directory: Manages subfolders with index.md in the folder."}
                  {!isCollection && binding === "file" &&
                    "Singleton + File: Edits a specific file (Markdown/YAML)."}
                  {!isCollection && binding === "directory" &&
                    "Singleton + Directory: Edits index.md in the specific folder."}
                </p>
              </div>
            </div>

            {/* Path */}
            <div className="required field">
              <label>{getPathLabel()}</label>
              <input
                type="text"
                placeholder={binding === "directory"
                  ? "content/posts"
                  : "content/about.md"}
                value={formData.path || ""}
                onChange={(e) => handleChange("path", e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Target Branch */}
            <div className="field">
              <label>Target Branch (Optional)</label>
              <input
                type="text"
                placeholder="e.g. features/preview"
                value={formData.branch || ""}
                onChange={(e) => handleChange("branch", e.target.value)}
                disabled={loading}
              />
              <small className="helper-text">
                If set, this branch is used for content. If it doesn't exist, it
                will be created on save.
              </small>
            </div>
          </div>
        </div>

        {/* Field Schema Editor */}
        <div className="ui segment">
          <h4 className="ui dividing header">Field Schema</h4>
          <div className="ui form">
            <FieldList
              fields={formData.fields || []}
              onChange={(fields) => handleChange("fields", fields)}
              isCollection={isCollection}
              disabled={loading}
            />
          </div>
        </div>

        {/* Archetype (Collection Only) */}
        {isCollection && (
          <div className="ui segment">
            <h4 className="ui dividing header">Archetype Template</h4>
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <MarkdownEditor
                body={formData.archetype || ""} // Assuming we store archetype in extra key or similar? Spec says "Archetype Body".
                // We need to add 'archetype' key to Collection interface as loose prop [key:string]: any allows it.
                setBody={(val) => handleChange("archetype", val)}
                isPrLocked={loading}
                currentContent={shimContent}
                height={200}
              />
            </div>
            <small className="helper-text">
              Default markdown body content for new articles.
            </small>
          </div>
        )}

        {/* Actions */}
        <div
          className="actions staticms-settings-actions"
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "20px",
          }}
        >
          <div>
            <button
              type="button"
              onClick={onCancel}
              className="ui button"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`ui primary button ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              {editingIndex !== null ? "Update" : "Add"}
            </button>
          </div>

          {editingIndex !== null && (
            <button
              type="button"
              onClick={onDelete}
              className={`ui button negative ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              <i className="trash icon"></i>
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
