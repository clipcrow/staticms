import React from "react";
import { Content } from "../types.ts";
import { Header } from "./Header.tsx";

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
  const [newFieldName, setNewFieldName] = React.useState("");

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    setFormData({
      ...formData,
      fields: [...formData.fields, { name: newFieldName }],
    });
    setNewFieldName("");
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
            <label>Content Path</label>
            <input
              type="text"
              placeholder="e.g. content/blog/post.md"
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

          <h4 className="ui dividing header">Front Matter</h4>

          <div className="ui grid middle aligned">
            {formData.fields.map((field, index) => (
              <div
                key={index}
                className="row staticms-settings-row"
              >
                <div className="four wide column">
                  <div className="ui input fluid">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) =>
                        handleUpdateFieldName(index, e.target.value)}
                      placeholder="Field Name"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="eleven wide column">
                  <div className="ui input fluid disabled">
                    <input
                      type="text"
                      placeholder="Value will be set in editor"
                      readOnly
                    />
                  </div>
                </div>
                <div className="one wide column staticms-settings-delete-container">
                  <button
                    type="button"
                    onClick={() => handleDeleteField(index)}
                    className="ui icon button staticms-settings-delete-button"
                    title="Delete Field"
                    disabled={loading}
                  >
                    <i className="trash icon staticms-settings-trash-icon"></i>
                  </button>
                </div>
              </div>
            ))}

            {/* Add New Field */}
            <div className="row staticms-settings-row">
              <div className="four wide column">
                <div className="ui input fluid">
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="New Field Name"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="twelve wide column">
                <button
                  type="button"
                  onClick={handleAddField}
                  className="ui button"
                  disabled={!newFieldName.trim() || loading}
                >
                  <i className="plus icon"></i>
                  Add Field
                </button>
              </div>
            </div>
          </div>

          <div className="ui divider"></div>

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
