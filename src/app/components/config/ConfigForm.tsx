import React, { useEffect } from "react";
import { BreadcrumbItem, useSetHeader } from "@/app/contexts/HeaderContext.tsx";
import { Collection } from "@/app/hooks/useContentConfig.ts";
import { MarkdownEditor } from "@/app/components/editor/MarkdownEditor.tsx";
import { FieldList } from "./ConfigHelpers.tsx";
import { Content } from "@/shared/types.ts";
import { FileTreeSelector } from "./FileTreeSelector.tsx";

interface ConfigFormProps {
  formData: Collection;
  setFormData: React.Dispatch<React.SetStateAction<Collection>>;
  editingIndex: number | null;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDelete: () => void;
  repoInfo: { owner: string; repo: string };
  loading?: boolean;
  breadcrumbs: BreadcrumbItem[];
  title?: React.ReactNode;
  defaultBranch?: string;
}

export const ConfigForm: React.FC<ConfigFormProps> = ({
  formData,
  setFormData,
  editingIndex,
  onSave,
  onCancel,
  onDelete,
  repoInfo,
  loading = false,
  breadcrumbs,
  title,
  defaultBranch,
}) => {
  // Initialize type/binding if missing (e.g. fresh add)
  useEffect(() => {
    if (!formData.type) {
      setFormData((prev) => ({ ...prev, type: "singleton" }));
    }
  }, []);

  const handleChange = (key: keyof Collection, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
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

  useSetHeader(breadcrumbs, title);

  return (
    <>
      <div className="ui container staticms-config-form-container">
        <form id="content-config-form" onSubmit={onSave}>
          {/* Basic Settings */}
          <div className="staticms-config-section">
            <div className="ui form staticms-config-form-inner">
              {/* Content Name (Label) */}
              <div className="ui stackable grid">
                <div className="eight wide column">
                  {/* Content Type */}
                  <div className="required field">
                    <label>Content Type</label>
                    <div className="grouped fields">
                      <div className="field">
                        <div className="ui radio checkbox">
                          <input
                            type="radio"
                            name="contentType"
                            checked={formData.type === "singleton" ||
                              !formData.type}
                            onChange={() => handleChange("type", "singleton")}
                            disabled={loading}
                          />
                          <label>Singleton (File/One-off)</label>
                        </div>
                      </div>
                      <div className="field">
                        <div className="ui radio checkbox">
                          <input
                            type="radio"
                            name="contentType"
                            checked={formData.type === "collection"}
                            onChange={() => handleChange("type", "collection")}
                            disabled={loading}
                          />
                          <label>Collection (Folder based)</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Binding Selection */}
                  <div className="required field staticms-config-binding-field">
                    <label>Binding</label>
                    <div className="grouped fields">
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
                            onChange={() =>
                              handleChange("binding", "directory")}
                            disabled={loading}
                          />
                          <label>Directory</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <small
                    className="helper-text staticms-helper-text-block"
                    style={{
                      display: "block",
                      marginTop: "1em",
                      color: "#666",
                    }}
                  >
                    {isCollection && binding === "file" &&
                      "Collection + File: Manages multiple Markdown files in the folder."}
                    {isCollection && binding === "directory" &&
                      "Collection + Directory: Manages subfolders with index.md in the folder."}
                    {!isCollection && binding === "file" &&
                      "Singleton + File: Edits a specific file (Markdown/YAML)."}
                    {!isCollection && binding === "directory" &&
                      "Singleton + Directory: Edits index.md in the specific folder."}
                  </small>

                  {/* Content Name (Label) */}
                  <div className="field staticms-config-name-field">
                    <label>Content Name</label>
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
                </div>

                <div className="eight wide column">
                  {/* Path */}
                  <div className="required field">
                    <label>{getPathLabel()}</label>

                    <div className="field">
                      <div className="staticms-path-display-wrapper">
                        <div className="staticms-path-display-inner">
                          <i
                            className={`${
                              binding === "directory" ? "folder open" : "file"
                            } icon`}
                          >
                          </i>
                          <span className="staticms-path-text">
                            {formData.path || (
                              <span className="placeholder">(None)</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="field staticms-file-tree-wrapper">
                        <FileTreeSelector
                          owner={repoInfo.owner}
                          repo={repoInfo.repo}
                          branch={formData.branch || defaultBranch || "main"}
                          selectedPath={formData.path}
                          mode={binding === "directory" ||
                              (isCollection && binding === "file")
                            ? "directory"
                            : "file"}
                          extensions={!isCollection && binding === "file"
                            ? [".md", ".markdown", ".mdx", ".yml", ".yaml"]
                            : undefined}
                          onSelect={(path) => handleChange("path", path)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Field Schema Editor */}
          <div className="ui form staticms-field-schema-area">
            <div className="field">
              <label>Field Schema</label>
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
            <div className="staticms-archetype-section">
              <h4 className="ui dividing header staticms-archetype-header">
                Archetype Template
              </h4>
              <div className="staticms-archetype-editor-wrapper">
                <MarkdownEditor
                  body={formData.archetype || ""}
                  setBody={(val) => handleChange("archetype", val)}
                  isPrLocked={loading}
                  currentContent={shimContent}
                  height={400}
                />
              </div>
              <small className="helper-text staticms-archetype-helper-text">
                Default markdown body content for new articles.
              </small>
            </div>
          )}
        </form>
      </div>

      {/* Fixed Footer Actions */}
      <div className="staticms-config-form-footer">
        {/* Left Actions (Cancel, Save) */}
        <div className="staticms-config-form-footer-left">
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
            form="content-config-form"
            className={`ui primary button ${loading ? "loading" : ""}`}
            disabled={loading}
          >
            {editingIndex !== null ? "Update" : "Add"}
          </button>
        </div>

        {/* Right Actions (Delete) */}
        <div>
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
      </div>
    </>
  );
};
