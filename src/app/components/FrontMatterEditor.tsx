import React from "react";
import { Content } from "../types.ts";

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
  const [newFieldNames, setNewFieldNames] = React.useState<
    Record<number, string>
  >({});

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

  const handleAddFieldToItem = (index: number) => {
    const fieldName = newFieldNames[index];
    if (!fieldName || !fieldName.trim()) return;

    if (Array.isArray(frontMatter)) {
      const newFrontMatter = [...frontMatter];
      newFrontMatter[index] = {
        ...newFrontMatter[index],
        [fieldName]: "",
      };
      setFrontMatter(newFrontMatter);
      setNewFieldNames({ ...newFieldNames, [index]: "" });
    }
  };

  const handleDeleteFieldFromItem = (index: number, key: string) => {
    if (Array.isArray(frontMatter)) {
      const newFrontMatter = [...frontMatter];
      const newItem = { ...newFrontMatter[index] };
      delete newItem[key];
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
            <div style={{ textAlign: "right", marginBottom: "1em" }}>
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
            {frontMatter.map((item, itemIndex) => {
              const configuredKeys = currentContent.fields?.map((f) =>
                f.name
              ) || [];
              const itemKeys = Object.keys(item);
              const unconfiguredKeys = itemKeys.filter((k) =>
                !configuredKeys.includes(k)
              );

              return (
                <div
                  key={itemIndex}
                  className="ui segment"
                  style={{
                    marginBottom: "1em",
                    opacity: draggedItemIndex === itemIndex ? 0.5 : 1,
                    cursor: isPrLocked ? "default" : "grab",
                  }}
                  draggable={!isPrLocked}
                  onDragStart={() => handleDragStart(itemIndex)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    handleDragOver(itemIndex);
                  }}
                  onDragEnd={handleDragEnd}
                >
                  <div className="ui grid middle aligned">
                    {/* Configured Fields */}
                    {currentContent.fields?.map((field, index) => (
                      <div
                        key={`configured-${itemIndex}-${index}`}
                        className="row"
                        style={{
                          paddingBottom: "0.5em",
                          paddingTop: "0.5em",
                        }}
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
                                const newFrontMatter = [...frontMatter];
                                newFrontMatter[itemIndex] = {
                                  ...item,
                                  [field.name]: e.target.value,
                                };
                                setFrontMatter(newFrontMatter);
                              }}
                              readOnly={isPrLocked}
                              disabled={isPrLocked}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Unconfigured Fields */}
                    {unconfiguredKeys.map((key) => (
                      <div
                        key={`unconfigured-${itemIndex}-${key}`}
                        className="row"
                        style={{
                          paddingBottom: "0.5em",
                          paddingTop: "0.5em",
                        }}
                      >
                        <div className="four wide column">
                          <strong>{key}</strong>
                        </div>
                        <div className="eleven wide column">
                          <div className="ui input fluid">
                            <input
                              type="text"
                              value={(item[key] as string) || ""}
                              onChange={(e) => {
                                const newFrontMatter = [...frontMatter];
                                newFrontMatter[itemIndex] = {
                                  ...item,
                                  [key]: e.target.value,
                                };
                                setFrontMatter(newFrontMatter);
                              }}
                              readOnly={isPrLocked}
                              disabled={isPrLocked}
                            />
                          </div>
                        </div>
                        <div
                          className="one wide column"
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <button
                            type="button"
                            className="ui red icon button"
                            style={{
                              background: "transparent",
                              border: "none",
                              boxShadow: "none",
                              color: "#db2828",
                              padding: 0,
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              width: "100%",
                              height: "100%",
                            }}
                            onClick={() =>
                              handleDeleteFieldFromItem(itemIndex, key)}
                            disabled={isPrLocked}
                            title="Delete Field"
                          >
                            <i
                              className="trash icon"
                              style={{ margin: 0 }}
                            >
                            </i>
                          </button>
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
                            value={newFieldNames[itemIndex] || ""}
                            onChange={(e) =>
                              setNewFieldNames({
                                ...newFieldNames,
                                [itemIndex]: e.target.value,
                              })}
                            placeholder="New Field Name"
                            disabled={isPrLocked}
                          />
                        </div>
                      </div>
                      <div className="eight wide column">
                        <button
                          type="button"
                          onClick={() => handleAddFieldToItem(itemIndex)}
                          className="ui button"
                          disabled={isPrLocked ||
                            !newFieldNames[itemIndex]?.trim()}
                        >
                          <i className="plus icon"></i>
                          Add Field
                        </button>
                      </div>
                      <div className="four wide column right aligned">
                        <button
                          type="button"
                          className="ui button negative mini"
                          onClick={() => handleDeleteItem(itemIndex)}
                          disabled={isPrLocked}
                          title="Delete Item"
                        >
                          <i className="trash icon"></i>
                          Delete Item
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ textAlign: "right", marginTop: "1em" }}>
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
                className="row"
                style={{ paddingBottom: "0.5em", paddingTop: "0.5em" }}
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
                className="row"
                style={{ paddingBottom: "0.5em", paddingTop: "0.5em" }}
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
                <div
                  className="one wide column"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    className="ui red icon button"
                    style={{
                      background: "transparent",
                      border: "none",
                      boxShadow: "none",
                      color: "#db2828",
                      padding: 0,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      width: "100%",
                      height: "100%",
                    }}
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
                    <i className="trash icon" style={{ margin: 0 }}></i>
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
