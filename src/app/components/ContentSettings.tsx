import React from "react";
import { Content } from "../types.ts";

interface ContentSettingsProps {
  formData: Content;
  setFormData: (data: Content) => void;
  editingIndex: number | null;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDelete: () => void;
  repoInfo: { owner: string; repo: string; branch?: string };
}

export const ContentSettings: React.FC<ContentSettingsProps> = ({
  formData,
  setFormData,
  editingIndex,
  onSave,
  onCancel,
  onDelete,
  repoInfo,
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

        <div className="ui message" style={{ marginTop: "2em" }}>
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

        <form
          onSubmit={onSave}
          className="ui form"
          style={{ marginTop: "2em" }}
        >
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

          <h4 className="ui dividing header">Front Matter</h4>

          <div className="ui grid middle aligned">
            {formData.fields.map((field, index) => (
              <div key={index} className="row">
                <div className="four wide column">
                  <div className="ui input fluid">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) =>
                        handleUpdateFieldName(index, e.target.value)}
                      placeholder="Field Name"
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
                <div className="one wide column">
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteField(index)}
                    className="ui icon button basic negative circular mini"
                    title="Delete Field"
                  >
                    <i className="trash icon"></i>
                  </button>
                </div>
              </div>
            ))}

            {/* Add New Field */}
            <div className="row">
              <div className="four wide column">
                <div className="ui input fluid">
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="New Field Name"
                  />
                </div>
              </div>
              <div className="twelve wide column">
                <button
                  type="button"
                  onClick={handleAddField}
                  className="ui button"
                  disabled={!newFieldName.trim()}
                >
                  <i className="plus icon"></i>
                  Add Field
                </button>
              </div>
            </div>
          </div>

          <div className="ui divider"></div>

          <div className="actions" style={{ marginTop: "5em" }}>
            <button
              type="button"
              onClick={onCancel}
              className="ui button"
            >
              Cancel
            </button>
            <button type="submit" className="ui primary button">
              {editingIndex !== null ? "Update" : "Add"}
            </button>
            {editingIndex !== null && (
              <button
                type="button"
                onClick={onDelete}
                className="ui button negative right floated"
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
