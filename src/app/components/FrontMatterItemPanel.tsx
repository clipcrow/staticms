import React, { useState } from "react";
import { Content } from "../types.ts";

interface FrontMatterItemPanelProps {
  item: Record<string, unknown>;
  itemIndex: number;
  currentContent: Content;
  isPrLocked: boolean;
  draggedItemIndex?: number | null;
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDragEnd?: () => void;
  onUpdateItem: (index: number, newItem: Record<string, unknown>) => void;
  onDeleteItem?: (index: number) => void;
  editableKeys?: boolean;
  disableValues?: boolean;
  valuePlaceholder?: string;
}

export const FrontMatterItemPanel: React.FC<FrontMatterItemPanelProps> = ({
  item,
  itemIndex,
  currentContent,
  isPrLocked,
  draggedItemIndex,
  onDragStart,
  onDragOver,
  onDragEnd,
  onUpdateItem,
  onDeleteItem,
  editableKeys = false,
  disableValues = false,
  valuePlaceholder,
}) => {
  const [newFieldName, setNewFieldName] = useState("");

  const configuredKeys = currentContent.fields?.map((f) => f.name) || [];
  const itemKeys = Object.keys(item);
  const unconfiguredKeys = itemKeys.filter((k) => !configuredKeys.includes(k));

  const handleAddField = () => {
    if (!newFieldName || !newFieldName.trim()) return;
    const newItem = {
      ...item,
      [newFieldName]: "",
    };
    onUpdateItem(itemIndex, newItem);
    setNewFieldName("");
  };

  const handleDeleteField = (key: string) => {
    const newItem = { ...item };
    delete newItem[key];
    onUpdateItem(itemIndex, newItem);
  };

  const handleRenameField = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    const newItem: Record<string, unknown> = {};
    Object.keys(item).forEach((key) => {
      if (key === oldKey) {
        newItem[newKey] = item[oldKey];
      } else {
        newItem[key] = item[key];
      }
    });
    onUpdateItem(itemIndex, newItem);
  };

  const isDraggable = Boolean(
    !isPrLocked && onDragStart && onDragOver && onDragEnd,
  );

  return (
    <div
      className="ui segment staticms-fm-item-segment"
      style={{
        opacity: draggedItemIndex === itemIndex ? 0.5 : 1,
        cursor: isDraggable ? "grab" : "default",
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
        {currentContent.fields?.map((field, index) => (
          <div
            key={`configured-${itemIndex}-${index}`}
            className="row staticms-fm-row"
          >
            <div className="four wide column">
              <strong>{field.name}</strong>
            </div>
            <div className="twelve wide column">
              <div className="ui input fluid">
                <input
                  type="text"
                  value={(item[field.name] as string) || ""}
                  onChange={(e) => {
                    const newItem = {
                      ...item,
                      [field.name]: e.target.value,
                    };
                    onUpdateItem(itemIndex, newItem);
                  }}
                  readOnly={isPrLocked || disableValues}
                  disabled={isPrLocked || disableValues}
                  placeholder={disableValues
                    ? "Value will be set in editor"
                    : valuePlaceholder || ""}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Unconfigured Fields */}
        {unconfiguredKeys.map((key) => (
          <div
            key={`unconfigured-${itemIndex}-${key}`}
            className="row staticms-fm-row"
          >
            <div className="four wide column">
              {editableKeys
                ? (
                  <div className="ui input fluid">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => handleRenameField(key, e.target.value)}
                      disabled={isPrLocked}
                    />
                  </div>
                )
                : <strong>{key}</strong>}
            </div>
            <div className="twelve wide column">
              <div className="staticms-fm-value-wrapper">
                <div
                  className={`ui input fluid ${
                    disableValues ? "disabled" : ""
                  }`}
                >
                  <input
                    type="text"
                    value={(item[key] as string) || ""}
                    onChange={(e) => {
                      const newItem = {
                        ...item,
                        [key]: e.target.value,
                      };
                      onUpdateItem(itemIndex, newItem);
                    }}
                    readOnly={isPrLocked || disableValues}
                    disabled={isPrLocked || disableValues}
                    placeholder={disableValues
                      ? "Value will be set in editor"
                      : valuePlaceholder || ""}
                  />
                </div>
                <button
                  type="button"
                  className="ui red icon button staticms-fm-delete-button-inline"
                  onClick={() => handleDeleteField(key)}
                  disabled={isPrLocked}
                  title="Delete Field"
                >
                  <i className="trash icon staticms-fm-trash-icon"></i>
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Field & Delete Item */}
        <div className="row staticms-fm-row">
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
