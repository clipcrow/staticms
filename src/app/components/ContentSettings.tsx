import React from "react";
import { Content } from "../types.ts";

interface ContentSettingsProps {
  formData: Content;
  setFormData: (data: Content) => void;
  editingIndex: number | null;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const ContentSettings: React.FC<ContentSettingsProps> = ({
  formData,
  setFormData,
  editingIndex,
  onSave,
  onCancel,
}) => {
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

        <form onSubmit={onSave} className="setup-form">
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
              onClick={onCancel}
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
};
