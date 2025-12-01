import React from "react";
import { Content } from "../types.ts";
import { Header } from "./Header.tsx";
import { FrontMatterItemPanel } from "./FrontMatterItemPanel.tsx";

interface ContentSettingsProps {
  formData: Content;
  setFormData: (data: Content) => void;
  editingIndex: number | null;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDelete: () => void;
  repoInfo: { owner: string; repo: string; branch?: string };
  loading?: boolean;
}

export const ContentSettings: React.FC<ContentSettingsProps> = ({
  formData,
  setFormData,
  editingIndex,
  onSave,
  onCancel,
  onDelete,
  loading = false,
}) => {
  return (
    <div className="ui container">
      <Header>
        <div className="staticms-settings-header-title-container">
          <span className="staticms-settings-header-title">
            {editingIndex !== null ? "Edit Content" : "Add Content"}
          </span>
        </div>
      </Header>
      <div className="ui segment staticms-settings-segment">
        <form
          onSubmit={onSave}
          className="ui form staticms-settings-form"
        >
          <div className="field">
            <label>Content Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Blog Post"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
            />
            <small className="staticms-settings-help-text">
              A friendly name for this content. If left empty, the file path
              will be used.
            </small>
          </div>

          <div className="field">
            <label>Content Type</label>
            <div className="inline fields">
              <div className="field">
                <div className="ui radio checkbox">
                  <input
                    type="radio"
                    name="contentType"
                    checked={formData.type !== "collection"}
                    onChange={() =>
                      setFormData({ ...formData, type: "singleton" })}
                    disabled={loading}
                  />
                  <label>Singleton (Single File)</label>
                </div>
              </div>
              <div className="field">
                <div className="ui radio checkbox">
                  <input
                    type="radio"
                    name="contentType"
                    checked={formData.type === "collection"}
                    onChange={() =>
                      setFormData({ ...formData, type: "collection" })}
                    disabled={loading}
                  />
                  <label>Collection (Multiple Files)</label>
                </div>
              </div>
            </div>
          </div>

          <div className="field">
            <label>
              {formData.type === "collection"
                ? "Collection Directory Path"
                : "Content File Path"}
            </label>
            <input
              type="text"
              placeholder={formData.type === "collection"
                ? "e.g. content/blog"
                : "e.g. content/blog/post.md"}
              value={formData.filePath}
              onChange={(e) =>
                setFormData({ ...formData, filePath: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="field">
            <label>Branch (Optional)</label>
            <input
              type="text"
              placeholder="e.g. main, develop"
              value={formData.branch || ""}
              onChange={(e) =>
                setFormData({ ...formData, branch: e.target.value })}
              disabled={loading}
            />
            <small className="staticms-settings-help-text">
              Leave empty to use the repository's default branch.
            </small>
          </div>

          <div className="field">
            <label>Front Matter</label>
            <FrontMatterItemPanel
              item={formData.fields.reduce(
                (acc, field) => ({ ...acc, [field.name]: "" }),
                {} as Record<string, unknown>,
              )}
              itemIndex={0}
              currentContent={{ ...formData, fields: [] }}
              isPrLocked={loading}
              onUpdateItem={(_index, newItem) => {
                const newFields = Object.keys(newItem).map((name) => ({
                  name,
                }));
                setFormData({ ...formData, fields: newFields });
              }}
              editableKeys
              disableValues
            />
          </div>

          <div className="actions staticms-settings-actions">
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
            {editingIndex !== null && (
              <button
                type="button"
                onClick={onDelete}
                className={`ui button negative right floated ${
                  loading ? "loading" : ""
                }`}
                disabled={loading}
              >
                <i className="trash icon"></i>
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
