import React from "react";
import { Content } from "../types.ts";
import { FrontMatterItemPanel } from "./FrontMatterItemPanel.tsx";

interface FrontMatterEditorProps {
  frontMatter: Record<string, unknown> | Record<string, unknown>[];
  setFrontMatter: (
    fm: Record<string, unknown> | Record<string, unknown>[],
  ) => void;
  currentContent: Content;
  isPrLocked: boolean;
  customFields: { id: string; key: string }[];
  setCustomFields: React.Dispatch<
    React.SetStateAction<{ id: string; key: string }[]>
  >;
}

export const FrontMatterEditor: React.FC<FrontMatterEditorProps> = ({
  frontMatter,
  setFrontMatter,
  currentContent,
  isPrLocked,
  customFields,
  setCustomFields,
}) => {
  const [newFieldName, setNewFieldName] = React.useState("");
  const [draggedItemIndex, setDraggedItemIndex] = React.useState<number | null>(
    null,
  );
  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (index: number) => {
    if (
      draggedItemIndex === null || draggedItemIndex === index ||
      !Array.isArray(frontMatter)
    ) {
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
    if (Array.isArray(frontMatter)) {
      const newFrontMatter = [...frontMatter];
      newFrontMatter[index] = newItem;
      setFrontMatter(newFrontMatter);
    }
  };

  const handleAddItem = (position: "top" | "bottom") => {
    if (!Array.isArray(frontMatter)) return;

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
    if (!Array.isArray(frontMatter)) return;

    const newFrontMatter = frontMatter.filter((_, i) => i !== index);
    setFrontMatter(newFrontMatter);
  };

  return (
    <div className="ui form">
      {Array.isArray(frontMatter)
        ? (
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
        )
        : (
          <div className="ui grid middle aligned">
            {/* Configured Fields */}
            {currentContent.fields?.map((field, index) => (
              <div
                key={`configured-${index}`}
                className="row staticms-fm-row"
              >
                <div className="four wide column">
                  <strong>{field.name}</strong>
                </div>
                <div className="twelve wide column">
                  <div className="ui input fluid">
                    <input
                      type="text"
                      value={(frontMatter[field.name] as string) || ""}
                      onChange={(e) =>
                        setFrontMatter({
                          ...frontMatter,
                          [field.name]: e.target.value,
                        })}
                      readOnly={isPrLocked}
                      disabled={isPrLocked}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Custom/Extra Fields */}
            {customFields.map((field) => (
              <div
                key={field.id}
                className="row staticms-fm-row"
              >
                <div className="four wide column">
                  <strong>{field.key}</strong>
                </div>
                <div className="eleven wide column">
                  <div className="ui input fluid">
                    <input
                      type="text"
                      value={(frontMatter[field.key] as string) || ""}
                      onChange={(e) =>
                        setFrontMatter({
                          ...frontMatter,
                          [field.key]: e.target.value,
                        })}
                      readOnly={isPrLocked}
                      disabled={isPrLocked}
                    />
                  </div>
                </div>
                <div className="one wide column staticms-fm-delete-container">
                  <button
                    type="button"
                    className="ui red icon button staticms-fm-delete-button"
                    onClick={() => {
                      if (isPrLocked) {
                        return;
                      }
                      setCustomFields((prev) =>
                        prev.filter((f) => f.id !== field.id)
                      );
                      const { [field.key]: _, ...rest } = frontMatter;
                      setFrontMatter(rest);
                    }}
                    disabled={isPrLocked}
                    title="Delete Field"
                  >
                    <i className="trash icon staticms-fm-trash-icon"></i>
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
                    disabled={isPrLocked}
                  />
                </div>
              </div>
              <div className="twelve wide column">
                <button
                  type="button"
                  onClick={() => {
                    const newId = crypto.randomUUID();
                    setCustomFields([
                      ...customFields,
                      { id: newId, key: newFieldName },
                    ]);

                    setFrontMatter({
                      ...frontMatter,
                      [newFieldName]: "",
                    });
                    setNewFieldName("");
                  }}
                  className="ui button"
                  disabled={isPrLocked ||
                    !newFieldName.trim() ||
                    Object.keys(frontMatter).includes(newFieldName)}
                >
                  <i className="plus icon"></i>
                  Add Field
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
