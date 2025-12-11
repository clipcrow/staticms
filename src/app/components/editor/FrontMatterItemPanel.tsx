import React, { useState } from "react";
import { Content, Field } from "@/shared/types.ts";

interface FrontMatterItemPanelProps {
  fields: Field[];
  itemIndex: number;
  currentContent: Content;
  isPrLocked: boolean;
  draggedItemIndex?: number | null;
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDragEnd?: () => void;
  onUpdateFields: (index: number, newFields: Field[]) => void;
  onDeleteItem?: (index: number) => void;
  editableKeys?: boolean;
  disableValues?: boolean;
  valuePlaceholder?: string;
}

export const FrontMatterItemPanel: React.FC<FrontMatterItemPanelProps> = ({
  fields,
  itemIndex,
  currentContent,
  isPrLocked,
  draggedItemIndex,
  onDragStart,
  onDragOver,
  onDragEnd,
  onUpdateFields,
  onDeleteItem,
  editableKeys = false,
  disableValues = false,
  valuePlaceholder,
}) => {
  const [newFieldName, setNewFieldName] = useState("");
  const configuredFieldNames = currentContent.fields?.map((f) => f.name) || [];
  const unconfiguredFields = fields.filter((f) =>
    !configuredFieldNames.includes(f.name)
  );

  // Create a map for easy access to values of configured fields
  const fieldMap = new Map(fields.map((f) => [f.name, f]));

  const handleAddField = () => {
    if (!newFieldName || !newFieldName.trim()) return;
    const newField: Field = {
      name: newFieldName,
      value: "",
    };
    onUpdateFields(itemIndex, [...fields, newField]);
    setNewFieldName("");
  };

  const handleDeleteField = (name: string) => {
    const newFields = fields.filter((f) => f.name !== name);
    onUpdateFields(itemIndex, newFields);
  };

  const handleRenameField = (oldName: string, newName: string) => {
    if (oldName === newName) return;
    const newFields = fields.map((f) =>
      f.name === oldName ? { ...f, name: newName } : f
    );
    onUpdateFields(itemIndex, newFields);
  };

  const handleUpdateValue = (name: string, value: string) => {
    const existingField = fields.find((f) => f.name === name);
    let newFields;
    if (existingField) {
      newFields = fields.map((f) => f.name === name ? { ...f, value } : f);
    } else {
      // Should not happen for configured fields if they are initialized properly,
      // but if a configured field is missing from 'fields', we add it.
      newFields = [...fields, { name, value }];
    }
    onUpdateFields(itemIndex, newFields);
  };

  const isDraggable = Boolean(
    !isPrLocked && onDragStart && onDragOver && onDragEnd,
  );

  return (
    <div
      className="ui segment"
      style={{
        opacity: draggedItemIndex === itemIndex ? 0.5 : 1,
        cursor: isDraggable ? "grab" : "default",
        marginBottom: "1em",
      }}
      draggable={isDraggable}
      onDragStart={() => onDragStart && onDragStart(itemIndex)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver && onDragOver(itemIndex);
      }}
      onDragEnd={onDragEnd}
    >
      <div className="ui grid middle aligned">
        {/* Configured Fields */}
        {currentContent.fields?.map((configField, index) => {
          const field = fieldMap.get(configField.name) ||
            { name: configField.name, value: "" };

          let widget = (
            <div className="ui input fluid">
              <input
                type="text"
                value={field.value}
                onChange={(e) => handleUpdateValue(field.name, e.target.value)}
                readOnly={isPrLocked || disableValues}
                disabled={isPrLocked || disableValues}
                placeholder={disableValues
                  ? "Value will be set in editor"
                  : valuePlaceholder || ""}
              />
            </div>
          );

          if (configField.widget === "boolean") {
            widget = (
              <div className="ui toggle checkbox">
                <input
                  type="checkbox"
                  checked={field.value === "true" || field.value === "on" ||
                    (field.value as unknown) === true}
                  onChange={(e) =>
                    handleUpdateValue(
                      field.name,
                      e.target.checked ? "true" : "false",
                    )}
                  disabled={isPrLocked || disableValues}
                />
                <label>{configField.label || configField.name}</label>
              </div>
            );
          } else if (configField.widget === "text") {
            widget = (
              <div className="ui form">
                <textarea
                  rows={3}
                  value={field.value}
                  onChange={(e) =>
                    handleUpdateValue(field.name, e.target.value)}
                  readOnly={isPrLocked || disableValues}
                  disabled={isPrLocked || disableValues}
                />
              </div>
            );
          } else if (
            configField.widget === "select" && configField.options
          ) {
            widget = (
              <select
                className="ui dropdown fluid"
                value={field.value}
                onChange={(e) => handleUpdateValue(field.name, e.target.value)}
                disabled={isPrLocked || disableValues}
              >
                <option value="">Select an option</option>
                {configField.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            );
          } else if (
            configField.widget === "date" || configField.widget === "datetime"
          ) {
            // Simple date input
            widget = (
              <div className="ui input fluid left icon">
                <i className="calendar icon"></i>
                <input
                  type={configField.widget === "datetime"
                    ? "datetime-local"
                    : "date"}
                  value={field.value}
                  onChange={(e) =>
                    handleUpdateValue(field.name, e.target.value)}
                  readOnly={isPrLocked || disableValues}
                  disabled={isPrLocked || disableValues}
                />
              </div>
            );
          }

          return (
            <div
              key={`configured-${itemIndex}-${index}`}
              className="row"
              style={{
                paddingBottom: "0.5em",
                paddingTop: "0.5em",
              }}
            >
              <div className="four wide column">
                <strong>{configField.label || configField.name}</strong>
                {configField.required && (
                  <span style={{ color: "red" }}>*</span>
                )}
              </div>
              <div className="twelve wide column">
                {widget}
              </div>
            </div>
          );
        })}

        {/* Unconfigured Fields */}
        {unconfiguredFields.map((field) => (
          <div
            key={`unconfigured-${itemIndex}-${field.name}`}
            className="row"
            style={{
              paddingBottom: "0.5em",
              paddingTop: "0.5em",
            }}
          >
            <div className="four wide column">
              {editableKeys
                ? (
                  <div className="ui input fluid">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) =>
                        handleRenameField(field.name, e.target.value)}
                      disabled={isPrLocked}
                    />
                  </div>
                )
                : <strong>{field.name}</strong>}
            </div>
            <div className="twelve wide column">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div
                  className={`ui input fluid ${
                    disableValues ? "disabled" : ""
                  }`}
                  style={{ flex: 1 }}
                >
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) =>
                      handleUpdateValue(field.name, e.target.value)}
                    readOnly={isPrLocked || disableValues}
                    disabled={isPrLocked || disableValues}
                    placeholder={disableValues
                      ? "Value will be set in editor"
                      : valuePlaceholder || ""}
                  />
                </div>
                <button
                  type="button"
                  className="ui icon button mini basic"
                  onClick={() => !isPrLocked && handleDeleteField(field.name)}
                  disabled={isPrLocked}
                  title="Delete Field"
                  style={{ marginLeft: "0.5em", boxShadow: "none" }}
                >
                  <i className="trash icon red"></i>
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Field & Delete Item */}
        <div
          className="row"
          style={{
            paddingBottom: "0.5em",
            paddingTop: "0.5em",
          }}
        >
          <div className="four wide column">
            <div className="ui input fluid">
              <input
                type="text"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="New Field Name"
                disabled={isPrLocked}
              />
            </div>
          </div>
          <div className="eight wide column">
            <button
              type="button"
              onClick={handleAddField}
              className="ui button"
              disabled={isPrLocked || !newFieldName.trim()}
            >
              <i className="plus icon"></i>
              Add Field
            </button>
          </div>
          {onDeleteItem && (
            <div className="four wide column right aligned">
              <button
                type="button"
                className="ui button negative mini"
                onClick={() => onDeleteItem(itemIndex)}
                disabled={isPrLocked}
                title="Delete Item"
              >
                <i className="trash icon"></i>
                Delete Item
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
