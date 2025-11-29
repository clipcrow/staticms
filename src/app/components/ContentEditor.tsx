import React, { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import vscDarkPlus from "prism-style";
import remarkGfm from "remark-gfm";
import { Commit, Content } from "../types.ts";
import { Header } from "./Header.tsx";

interface ContentEditorProps {
  currentContent: Content;
  body: string;
  setBody: (body: string) => void;
  frontMatter: Record<string, unknown> | Record<string, unknown>[];
  setFrontMatter: (
    fm: Record<string, unknown> | Record<string, unknown>[],
  ) => void;
  customFields: { id: string; key: string }[];
  setCustomFields: React.Dispatch<
    React.SetStateAction<{ id: string; key: string }[]>
  >;
  isPrLocked: boolean;
  prStatus: "open" | "merged" | "closed" | null;
  prUrl: string | null;
  hasDraft: boolean;
  draftTimestamp: number | null;
  isPrOpen: boolean;
  setIsPrOpen: (isOpen: boolean) => void;
  prDescription: string;
  setPrDescription: (desc: string) => void;
  isSaving: boolean;
  commits: Commit[];
  onSaveContent: () => void;
  onReset: () => void;
  onBack: () => void;
  loading: boolean;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  currentContent,
  body,
  setBody,
  frontMatter,
  setFrontMatter,
  customFields,
  setCustomFields,
  isPrLocked,
  prStatus,
  prUrl,
  hasDraft,
  draftTimestamp,
  isPrOpen,
  setIsPrOpen,
  prDescription,
  setPrDescription,
  isSaving,
  commits,
  onSaveContent,
  onReset,
  onBack,
  loading,
}) => {
  const [newFieldName, setNewFieldName] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"write" | "preview">(
    "write",
  );
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

  const [newFieldNames, setNewFieldNames] = React.useState<
    Record<number, string>
  >({});

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

  const isYaml = currentContent.filePath.endsWith(".yaml") ||
    currentContent.filePath.endsWith(".yml");

  if (loading) {
    return (
      <div className="ui active dimmer">
        <div className="ui loader"></div>
      </div>
    );
  }

  return (
    <div
      className="ui container"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header
        rightContent={
          <button
            type="button"
            className="ui red button"
            style={{
              background: "transparent",
              border: "none",
              boxShadow: "none",
              color: "#db2828",
            }}
            onClick={onReset}
            disabled={loading || isSaving}
            title="Reset changes"
          >
            <i className="undo icon"></i>
            Reset
          </button>
        }
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            type="button"
            className="ui blue button"
            style={{
              display: "flex",
              alignItems: "center",
              padding: 0,
              border: "none",
              background: "transparent",
              boxShadow: "none",
              cursor: "pointer",
              color: "#4183c4",
              marginRight: "0.5em",
            }}
            onClick={onBack}
          >
            <i
              className="material-icons"
              style={{ marginRight: "0.2em", fontSize: "1.2em" }}
            >
              north_west
            </i>
            <span style={{ fontWeight: "bold" }}>
              {currentContent.owner}/{currentContent.repo}
            </span>
          </button>
          {currentContent.branch && (
            <span
              className="ui label mini basic"
              style={{ marginRight: "0.5em" }}
            >
              <i className="code branch icon"></i>
              {currentContent.branch}
            </span>
          )}
          <span style={{ margin: "0 0.5em", color: "rgba(0,0,0,0.4)" }}>
            /
          </span>
          <span style={{ fontWeight: "bold", fontSize: "1.2em" }}>
            {currentContent.name || currentContent.filePath}
          </span>
          {isPrLocked && (
            <div
              className="ui label orange mini"
              style={{ marginLeft: "1em" }}
            >
              <i className="lock icon"></i>
              PR Open
            </div>
          )}
        </div>
      </Header>

      <div
        className="ui grid"
        style={{ flex: 1, overflow: "hidden", marginTop: "1em" }}
      >
        <div
          className="twelve wide column"
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <div
            className="ui segment"
            style={isYaml
              ? { overflowY: "auto", flex: 1 }
              : { overflowY: "auto", flexShrink: 0, maxHeight: "40%" }}
          >
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
                                  onClick={() =>
                                    handleAddFieldToItem(itemIndex)}
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
          </div>

          {/* Tab Menu */}
          {!isYaml && (
            <div
              className="ui top attached tabular menu"
              style={{ marginTop: "1em" }}
            >
              <a
                className={`item ${activeTab === "write" ? "active" : ""}`}
                onClick={() => setActiveTab("write")}
                style={{ cursor: "pointer" }}
              >
                Write
              </a>
              <a
                className={`item ${activeTab === "preview" ? "active" : ""}`}
                onClick={() => setActiveTab("preview")}
                style={{ cursor: "pointer" }}
              >
                Preview
              </a>
            </div>
          )}

          {!isYaml && (
            <div
              className="ui bottom attached segment"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                marginTop: 0,
                padding: 0,
                overflow: "hidden",
              }}
            >
              {activeTab === "write"
                ? (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    <textarea
                      style={{
                        flex: 1,
                        width: "100%",
                        height: "100%",
                        resize: "none",
                        fontFamily: "monospace",
                        border: "none",
                        outline: "none",
                        borderRadius: 0,
                        padding: "1em",
                      }}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Start editing markdown body..."
                      readOnly={isPrLocked}
                      disabled={isPrLocked}
                    />
                  </div>
                )
                : (
                  <div
                    style={{
                      overflowY: "auto",
                      height: "100%",
                      padding: "1em",
                    }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code(
                          props: ComponentPropsWithoutRef<"code"> & {
                            inline?: boolean;
                            node?: unknown;
                          },
                        ) {
                          const {
                            children,
                            className,
                            inline,
                            node: _node,
                            ...rest
                          } = props;
                          const match = /language-(\w+)/.exec(className || "");
                          return !inline && match
                            ? (
                              <SyntaxHighlighter
                                {...rest}
                                PreTag="div"
                                language={match[1]}
                                style={vscDarkPlus}
                              >
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            )
                            : (
                              <code {...rest} className={className}>
                                {children}
                              </code>
                            );
                        },
                        table(props: ComponentPropsWithoutRef<"table">) {
                          return (
                            <table className="ui celled table" {...props} />
                          );
                        },
                      }}
                    >
                      {body}
                    </ReactMarkdown>
                  </div>
                )}
            </div>
          )}
        </div>

        <div
          className="four wide column"
          style={{ height: "100%", overflowY: "auto" }}
        >
          <div>
            {prUrl && (
              <div
                className={`ui message ${
                  prStatus === "merged"
                    ? "positive"
                    : prStatus === "closed"
                    ? "negative"
                    : "info"
                }`}
              >
                <div className="header">
                  {prStatus === "merged"
                    ? "PR Merged"
                    : prStatus === "closed"
                    ? "PR Closed"
                    : "PR Open"}
                </div>
                <a
                  href={prUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "block", marginTop: "0.5em" }}
                >
                  View Pull Request
                </a>
              </div>
            )}

            {hasDraft && (
              <div className="ui card fluid">
                <div className="content">
                  <div
                    className="header"
                    onClick={() => setIsPrOpen(!isPrOpen)}
                    style={{ cursor: "pointer" }}
                  >
                    <i
                      className={`circle icon ${
                        prStatus === "open" || prUrl ? "green" : "grey"
                      }`}
                    >
                    </i>
                    Draft / PR
                    <i
                      className={`right floated icon ${
                        isPrOpen ? "chevron down" : "chevron right"
                      }`}
                    >
                    </i>
                  </div>
                  <div className="meta">
                    {draftTimestamp
                      ? new Date(draftTimestamp).toLocaleString()
                      : ""}
                  </div>
                  {isPrOpen && (
                    <div className="description" style={{ marginTop: "1em" }}>
                      <div className="ui form">
                        <div className="field">
                          <label>Description</label>
                          <textarea
                            rows={3}
                            value={prDescription}
                            onChange={(e) =>
                              setPrDescription(e.target.value)}
                            placeholder="PR Description..."
                          />
                        </div>
                        <button
                          type="button"
                          className={`ui primary button fluid ${
                            isSaving ? "loading" : ""
                          }`}
                          onClick={onSaveContent}
                          disabled={isSaving}
                        >
                          Create PR
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="ui feed">
              {commits.map((commit) => (
                <div key={commit.sha} className="event">
                  <div className="content">
                    <div className="summary">
                      <a
                        href={commit.html_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {commit.message}
                      </a>
                      <div className="date">
                        {new Date(commit.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="meta">
                      by {commit.author}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
