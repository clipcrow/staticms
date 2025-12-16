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
      className={`ui segment staticms-frontmatter-panel ${
        draggedItemIndex === itemIndex ? "dragging" : ""
      } ${isDraggable ? "draggable" : "static"}`}
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

          const widget = (
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

          return (
            <div
              key={`configured-${itemIndex}-${index}`}
              className="row staticms-frontmatter-row"
            >
              <div className="four wide column">
                <strong>{configField.label || configField.name}</strong>
                {configField.required && (
                  <span className="staticms-required-star">*</span>
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
            className="row staticms-frontmatter-row"
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
              <div className="staticms-frontmatter-action-wrapper">
                <div
                  className={`ui input fluid staticms-frontmatter-input-wrapper ${
                    disableValues ? "disabled" : ""
                  }`}
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
                  className="ui icon button mini basic staticms-frontmatter-delete-btn"
                  onClick={() => !isPrLocked && handleDeleteField(field.name)}
                  disabled={isPrLocked}
                  title="Delete Field"
                >
                  <i className="trash icon red"></i>
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Field & Delete Item */}
        <div className="row staticms-frontmatter-row">
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
