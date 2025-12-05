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
  repoInfo,
  loading = false,
}) => {
  const getUiType = () => {
    if (
      formData.type === "collection-files" ||
      formData.type === "collection-dirs"
    ) {
      return "collection";
    }
    return "singleton";
  };

  const getUiBinding = () => {
    if (
      formData.type === "singleton-dir" ||
      formData.type === "collection-dirs"
    ) {
      return "directory";
    }
    return "file";
  };

  const uiType = getUiType();
  const uiBinding = getUiBinding();

  const handleTypeChange = (newType: "singleton" | "collection") => {
    if (newType === "singleton") {
      setFormData({
        ...formData,
        type: uiBinding === "directory" ? "singleton-dir" : "singleton-file",
      });
    } else {
      setFormData({
        ...formData,
        type: uiBinding === "directory"
          ? "collection-dirs"
          : "collection-files",
      });
    }
  };

  const handleBindingChange = (newBinding: "file" | "directory") => {
    if (uiType === "singleton") {
      setFormData({
        ...formData,
        type: newBinding === "directory" ? "singleton-dir" : "singleton-file",
      });
    } else {
      setFormData({
        ...formData,
        type: newBinding === "directory"
          ? "collection-dirs"
          : "collection-files",
      });
    }
  };

  const getPathLabel = () => {
    if (uiType === "singleton") {
      return uiBinding === "directory"
        ? "Singleton Directory Path"
        : "Singleton File Path";
    }
    return "Collection Directory Path";
  };

  const getPathPlaceholder = () => {
    if (uiType === "singleton") {
      return uiBinding === "directory"
        ? "e.g. content/about"
        : "e.g. content/blog/post.md";
    }
    return uiBinding === "directory"
      ? "e.g. content/docs"
      : "e.g. content/blog";
  };

  return (
    <div className="ui container">
      <Header
        breadcrumbs={[
          {
            label: `${repoInfo.owner}/${repoInfo.repo}`,
            to: `/${repoInfo.owner}/${repoInfo.repo}`,
          },
          { label: editingIndex !== null ? "Edit Content" : "Add Content" },
        ]}
      />
      <div className="ui segment">
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

          <div className="two fields">
            <div className="field">
              <label>Content Type</label>
              <div className="inline fields">
                <div className="field">
                  <div className="ui radio checkbox">
                    <input
                      type="radio"
                      name="contentType"
                      checked={uiType === "singleton"}
                      onChange={() => handleTypeChange("singleton")}
                      disabled={loading}
                    />
                    <label>Singleton</label>
                  </div>
                </div>
                <div className="field">
                  <div className="ui radio checkbox">
                    <input
                      type="radio"
                      name="contentType"
                      checked={uiType === "collection"}
                      onChange={() => handleTypeChange("collection")}
                      disabled={loading}
                    />
                    <label>Collection</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="field">
              <label>Content Binding</label>
              <div className="inline fields">
                <div className="field">
                  <div className="ui radio checkbox">
                    <input
                      type="radio"
                      name="contentBinding"
                      checked={uiBinding === "file"}
                      onChange={() => handleBindingChange("file")}
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
                      checked={uiBinding === "directory"}
                      onChange={() => handleBindingChange("directory")}
                      disabled={loading}
                    />
                    <label>Directory</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="field">
            <label>{getPathLabel()}</label>
            <input
              type="text"
              placeholder={getPathPlaceholder()}
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
              fields={formData.fields.map((f) => ({
                ...f,
                value: f.defaultValue || "",
              }))}
              itemIndex={0}
              currentContent={{ ...formData, fields: [] }}
              isPrLocked={loading}
              onUpdateFields={(_index, newFields) => {
                const updatedFields = newFields.map((f) => ({
                  ...f,
                  defaultValue: f.value,
                  value: "",
                }));
                setFormData({ ...formData, fields: updatedFields });
              }}
              editableKeys
              disableValues={formData.type === "singleton-file" ||
                !formData.type}
              valuePlaceholder={formData.type === "collection-files" ||
                  formData.type === "collection-dirs"
                ? "Default value for new articles"
                : undefined}
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
