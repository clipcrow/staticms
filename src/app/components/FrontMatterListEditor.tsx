import React from "react";
import { Content } from "../types.ts";
import { FrontMatterItemPanel } from "./FrontMatterItemPanel.tsx";

interface FrontMatterListEditorProps {
  frontMatter: Record<string, unknown>[];
  setFrontMatter: (fm: Record<string, unknown>[]) => void;
  currentContent: Content;
  isPrLocked: boolean;
}

export const FrontMatterListEditor: React.FC<FrontMatterListEditorProps> = ({
  frontMatter,
  setFrontMatter,
  currentContent,
  isPrLocked,
}) => {
  const [draggedItemIndex, setDraggedItemIndex] = React.useState<number | null>(
    null,
  );

  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (index: number) => {
    if (draggedItemIndex === null || draggedItemIndex === index) {
      return;
    }

    const newFrontMatter = [...frontMatter];
    const draggedItem = newFrontMatter[draggedItemIndex];
    newFrontMatter.splice(draggedItemIndex, 1);
    newFrontMatter.splice(index, 0, draggedItem);

    setFrontMatter(newFrontMatter);
    setDraggedItemIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  const handleUpdateItem = (
    index: number,
    newItem: Record<string, unknown>,
  ) => {
    const newFrontMatter = [...frontMatter];
    newFrontMatter[index] = newItem;
    setFrontMatter(newFrontMatter);
  };

  const handleAddItem = (position: "top" | "bottom") => {
    const newItem: Record<string, unknown> = {};
    // Initialize with configured fields
    currentContent.fields?.forEach((field) => {
      newItem[field.name] = "";
    });

    const newFrontMatter = position === "top"
      ? [newItem, ...frontMatter]
      : [...frontMatter, newItem];

    setFrontMatter(newFrontMatter);
  };

  const handleDeleteItem = (index: number) => {
    const newFrontMatter = frontMatter.filter((_, i) => i !== index);
    setFrontMatter(newFrontMatter);
  };

  return (
    <div className="ui form">
      <div>
        <div className="staticms-fm-add-top-container">
          <button
            type="button"
            className="ui icon button primary circular"
            onClick={() => handleAddItem("top")}
            disabled={isPrLocked}
            title="Add Item to Top"
          >
            <i className="plus icon"></i>
          </button>
        </div>
        {frontMatter.map((item, itemIndex) => (
          <FrontMatterItemPanel
            key={itemIndex}
            item={item}
            itemIndex={itemIndex}
            currentContent={currentContent}
            isPrLocked={isPrLocked}
            draggedItemIndex={draggedItemIndex}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
          />
        ))}
        <div className="staticms-fm-add-bottom-container">
          <button
            type="button"
            className="ui icon button primary circular"
            onClick={() => handleAddItem("bottom")}
            disabled={isPrLocked}
            title="Add Item to Bottom"
          >
            <i className="plus icon"></i>
          </button>
        </div>
      </div>
    </div>
  );
};
