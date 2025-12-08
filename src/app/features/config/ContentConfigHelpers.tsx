import React from "react";
import { Field } from "@/app/hooks/useContentConfig.ts";

interface FieldEditorProps {
  field: Field;
  onChange: (field: Field) => void;
  onDelete: () => void;
  isCollection: boolean;
  disabled?: boolean;
}

export const FieldEditor: React.FC<FieldEditorProps> = ({
  field,
  onChange,
  onDelete,
  isCollection,
  disabled,
}) => {
  const handleChange = (key: keyof Field, value: unknown) => {
    onChange({ ...field, [key]: value });
  };

  return (
    <div
      className="ui segment custom-field-editor"
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "flex-start",
        padding: "10px",
      }}
    >
      {/* Name (Key) */}
      <div className="field" style={{ flex: 2 }}>
        <label
          style={{
            fontSize: "0.8em",
            fontWeight: "bold",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Name (Key)
        </label>
        <div className="ui input fluid mini">
          <input
            type="text"
            placeholder="e.g. title"
            value={field.name}
            onChange={(e) => handleChange("name", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Widget */}
      <div className="field" style={{ flex: 2 }}>
        <label
          style={{
            fontSize: "0.8em",
            fontWeight: "bold",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Widget
        </label>
        <select
          className="ui dropdown fluid mini"
          value={field.widget}
          onChange={(e) => handleChange("widget", e.target.value)}
          disabled={disabled}
          style={{ padding: "6px" }}
        >
          <option value="string">String (Short)</option>
          <option value="text">Text (Long)</option>
          <option value="markdown">Markdown</option>
          <option value="boolean">Boolean</option>
          <option value="image">Image</option>
          <option value="list">List</option>
          <option value="object">Object</option>
          <option value="datetime">Datetime</option>
          <option value="select">Select</option>
        </select>
      </div>

      {/* Default Value (Collection Only) */}
      <div
        className="field"
        style={{ flex: 2, visibility: isCollection ? "visible" : "hidden" }}
      >
        <label
          style={{
            fontSize: "0.8em",
            fontWeight: "bold",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Default
        </label>
        <div className="ui input fluid mini">
          <input
            type="text"
            placeholder="Optional"
            value={String(field.default || "")}
            onChange={(e) => handleChange("default", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Required */}
      <div className="field" style={{ flex: 1, textAlign: "center" }}>
        <label
          style={{
            fontSize: "0.8em",
            fontWeight: "bold",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Required
        </label>
        <div className="ui checkbox">
          <input
            type="checkbox"
            checked={field.required !== false} // Default is true usually
            onChange={(e) => handleChange("required", e.target.checked)}
            disabled={disabled}
          />
          <label></label>
        </div>
      </div>

      {/* Delete Button */}
      <div className="field" style={{ flex: 0, paddingTop: "1.2em" }}>
        <button
          type="button"
          className="ui icon button mini negative basic"
          onClick={onDelete}
          disabled={disabled}
          title="Remove field"
        >
          <i className="trash icon"></i>
        </button>
      </div>
    </div>
  );
};

interface FieldListProps {
  fields: Field[];
  onChange: (fields: Field[]) => void;
  isCollection: boolean;
  disabled?: boolean;
}

export const FieldList: React.FC<FieldListProps> = ({
  fields,
  onChange,
  isCollection,
  disabled,
}) => {
  const handleFieldChange = (index: number, newField: Field) => {
    const newFields = [...fields];
    newFields[index] = newField;
    onChange(newFields);
  };

  const handleDeleteField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    onChange(newFields);
  };

  const handleAddField = () => {
    onChange([
      ...fields,
      { name: "", widget: "string", required: true },
    ]);
  };

  return (
    <div>
      <div className="field-list">
        {fields.map((field, index) => (
          <FieldEditor
            key={index}
            field={field}
            onChange={(f) => handleFieldChange(index, f)}
            onDelete={() => handleDeleteField(index)}
            isCollection={isCollection}
            disabled={disabled}
          />
        ))}
      </div>
      <button
        type="button"
        className="ui button mini basic primary"
        onClick={handleAddField}
        disabled={disabled}
        style={{ marginTop: "10px" }}
      >
        <i className="plus icon"></i> Add Field
      </button>
      <div className="ui message info mini">
        <p>
          Note: Markdown Body is handled automatically and should NOT be defined
          here.
        </p>
      </div>
    </div>
  );
};
