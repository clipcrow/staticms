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
    <tr className="staticms-config-field-row">
      {/* Name (Key) */}
      <td className="staticms-config-name-cell">
        <div className="ui input fluid mini">
          <input
            type="text"
            placeholder="e.g. title"
            value={field.name}
            onChange={(e) => handleChange("name", e.target.value)}
            disabled={disabled}
          />
        </div>
      </td>

      {/* Default Value (Collection Only) */}
      {isCollection
        ? (
          <td>
            <div className="ui input fluid mini staticms-config-default-cell">
              <input
                type="text"
                placeholder="Optional"
                value={String(field.default || "")}
                onChange={(e) => handleChange("default", e.target.value)}
                disabled={disabled}
              />
            </div>
          </td>
        )
        : <td></td>}

      {/* Required */}
      <td className="center aligned staticms-config-action-cell">
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
      <td className="center aligned staticms-config-action-cell">
        <button
          type="button"
          className="ui icon button mini basic delete-field-btn"
          onClick={disabled ? undefined : onDelete}
          disabled={disabled}
          title="Remove field"
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
        className="ui button mini basic primary staticms-add-field-btn"
        onClick={handleAddField}
        disabled={disabled}
      >
        <i className="plus icon"></i> Add Field
      </button>
    </div>
  );
};
