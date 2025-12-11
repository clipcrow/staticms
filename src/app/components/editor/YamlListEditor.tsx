import React, { useState } from "react";
import { FrontMatterItemEditor } from "@/app/components/editor/FrontMatterItemEditor.tsx";
import { Content } from "@/shared/types.ts";
import { Field } from "@/app/hooks/useContentConfig.ts";
import {
  FrontMatterList,
  FrontMatterObject,
  FrontMatterValue,
} from "@/shared/types.ts";

interface YamlListEditorProps {
  items: FrontMatterList;
  onChange: (newItems: FrontMatterList) => void;
  fields: Field[];
  currentContent: Content;
  isLocked?: boolean;
}

export function YamlListEditor({
  items,
  onChange,
  fields,
  currentContent,
  isLocked,
}: YamlListEditorProps) {
  // Ensure we work with an array
  const safeItems: FrontMatterList = Array.isArray(items) ? items : [];

  const handleAddItem = (index: number) => {
    const newItem: FrontMatterObject = {};
    fields.forEach((f) => {
      newItem[f.name] = (f.default ?? "") as FrontMatterValue;
    });

    const newItems = [...safeItems];
    newItems.splice(index, 0, newItem);
    onChange(newItems);
  };

  const handleRemoveItem = (index: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    const newItems = safeItems.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleChangeItem = (index: number, val: FrontMatterObject) => {
    const newItems = [...safeItems];
    newItems[index] = val;
    onChange(newItems);
  };

  // Drag & Drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // For Firefox
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    // Optional: Visual indicator could go here
  };

  const onDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...safeItems];
    const [moved] = newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, moved);

    onChange(newItems);
    setDraggedIndex(null);
  };

  return (
    <div className="yaml-list-editor">
      {/* Top Add Button */}
      <div style={{ marginBottom: "1rem", textAlign: "center" }}>
        <button
          type="button"
          className="ui button basic dashed fluid"
          onClick={() => handleAddItem(0)}
          disabled={isLocked}
        >
          <i className="plus icon"></i> Add Item (Top)
        </button>
      </div>

      <div
        className="ui list"
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        {safeItems.map((item, index) => (
          <div
            key={index}
            className="ui segment"
            draggable={!isLocked}
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDrop={(e) => onDrop(e, index)}
            style={{
              display: "flex",
              gap: "1rem",
              opacity: draggedIndex === index ? 0.5 : 1,
              cursor: isLocked ? "default" : "move",
            }}
          >
            {/* Drag Handle */}
            <div
              className="drag-handle"
              style={{ display: "flex", alignItems: "center", color: "#ccc" }}
            >
              <i className="bars icon"></i>
            </div>

            {/* Content */}
            <div
              style={{ flex: 1, cursor: "default" }}
              onDragStart={(e) => e.stopPropagation()}
              draggable={false}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <div className="ui label">Item #{index + 1}</div>
                <i
                  className="trash alternate outline icon"
                  style={{
                    cursor: isLocked ? "default" : "pointer",
                    color: isLocked ? undefined : "#db2828",
                    opacity: isLocked ? 0.5 : 1,
                    margin: 0,
                  }}
                  onClick={() => !isLocked && handleRemoveItem(index)}
                  title="Remove Item"
                >
                </i>
              </div>

              {/* Reuse FrontMatterItemEditor logic by tricking it into treating this item as frontMatter */}
              {
                /* Note: FrontMatterItemEditor expects 'frontMatter' prop.
                  We pass individual item as frontMatter.
                  However, FrontMatterItemEditor renders ALL fields.
                  If 'fields' prop is missing from currentContent, it fails.
                  We need to craft a mock Content object with fields.
               */
              }
              <FrontMatterItemEditor
                frontMatter={item}
                setFrontMatter={(val) => handleChangeItem(index, val)}
                currentContent={{
                  ...currentContent,
                  fields: fields.map((f) => ({
                    ...f,
                    value: "",
                    defaultValue: "",
                  })), // Adapt Config Field to Editor Field
                }}
                isPrLocked={!!isLocked}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Add Button */}
      <div style={{ marginTop: "1rem", textAlign: "center" }}>
        <button
          type="button"
          className="ui button basic dashed fluid"
          onClick={() => handleAddItem(safeItems.length)}
          disabled={isLocked}
        >
          <i className="plus icon"></i> Add Item (Bottom)
        </button>
      </div>
    </div>
  );
}
