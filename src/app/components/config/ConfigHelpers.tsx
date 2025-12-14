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
    <tr style={{ verticalAlign: "middle" }}>
      {/* Name (Key) */}
      <td style={{ width: "35%", minWidth: "150px" }}>
        <div className="ui input fluid mini">
          <input
            type="text"
            placeholder="e.g. title"
            value={field.name}
            onChange={(e) => handleChange("name", e.target.value)}
            disabled={disabled}
            style={{ height: "32px" }}
          />
        </div>
      </td>

      {/* Default Value (Collection Only) */}
      {isCollection
        ? (
          <td>
            <div className="ui input fluid mini">
              <input
                type="text"
                placeholder="Optional"
                value={String(field.default || "")}
                onChange={(e) => handleChange("default", e.target.value)}
                disabled={disabled}
                style={{ height: "32px" }}
              />
            </div>
          </td>
        )
        : <td></td>}

      {/* Required */}
      <td
        className="center aligned"
        style={{ width: "1%", whiteSpace: "nowrap" }}
      >
        <div className="ui checkbox">
          <input
            type="checkbox"
            checked={field.required !== false} // Default is true usually
            onChange={(e) => handleChange("required", e.target.checked)}
            disabled={disabled}
          />
          <label></label>
        </div>
      </td>

      {/* Delete Button */}
      <td
        className="center aligned"
        style={{ width: "1%", whiteSpace: "nowrap" }}
      >
        <button
          type="button"
          className="ui icon button mini basic"
          onClick={disabled ? undefined : onDelete}
          disabled={disabled}
          title="Remove field"
          style={{ margin: 0, boxShadow: "none" }}
        >
          <i className="trash icon red"></i>
        </button>
      </td>
    </tr>
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
      { name: "", required: true },
    ]);
  };

  return (
    <div>
      <table className="ui table">
        <tbody>
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
          {fields.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="center aligned priority-low"
              >
                No fields defined. Click "Add Field" to start.
              </td>
            </tr>
          )}
        </tbody>
      </table>

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
