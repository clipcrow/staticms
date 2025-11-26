import React from "react";
import { Content } from "../types.ts";

interface ContentSettingsProps {
  formData: Content;
  setFormData: (data: Content) => void;
  editingIndex: number | null;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  repoInfo: { owner: string; repo: string; branch?: string };
}

export const ContentSettings: React.FC<ContentSettingsProps> = ({
  formData,
  setFormData,
  editingIndex,
  onSave,
  onCancel,
  repoInfo,
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
    <div className="ui container" style={{ marginTop: "2em" }}>
      <div className="ui segment">
        <h2 className="ui header">
          {editingIndex !== null ? "Edit Content" : "Add Content"}
          <div className="sub header">
            {editingIndex !== null
              ? "Update your content configuration."
              : "Configure a new content file."}
          </div>
        </h2>

        <div className="ui message">
          <div className="header">Repository</div>
          <p>
            {repoInfo.owner}/{repoInfo.repo}
            {repoInfo.branch && (
              <span
                className="ui label mini basic"
                style={{ marginLeft: "0.5em" }}
              >
                <i className="code branch icon"></i>
                {repoInfo.branch}
              </span>
            )}
          </p>
        </div>

        <form onSubmit={onSave} className="ui form">
          <div className="field">
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

          <h4 className="ui dividing header">Form Fields (Front Matter)</h4>

          {formData.fields.map((field, index) => (
            <div key={index} className="field">
              <div className="ui action input">
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) =>
                    handleUpdateFieldName(index, e.target.value)}
                  placeholder="Field Name"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleDeleteField(index)}
                  className="ui icon button negative"
                >
                  <i className="trash icon"></i>
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddField}
            className="ui button basic"
            style={{ marginBottom: "1em" }}
          >
            <i className="plus icon"></i>
            Add Field
          </button>

          <div className="ui divider"></div>

          <div className="actions">
            <button
              type="button"
              onClick={onCancel}
              className="ui button"
            >
              Cancel
            </button>
            <button type="submit" className="ui primary button">
              {editingIndex !== null ? "Update Content" : "Add Content"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
