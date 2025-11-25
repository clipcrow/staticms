import React from "react";
import ReactMarkdown from "react-markdown";
import { Commit, Content } from "../types.ts";
import { Loading } from "./Loading.tsx";

interface ContentEditorProps {
  currentContent: Content;
  body: string;
  setBody: (body: string) => void;
  frontMatter: Record<string, unknown>;
  setFrontMatter: (fm: Record<string, unknown>) => void;
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
  onSaveCollection: () => void;
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
  onSaveCollection,
  onReset,
  onBack,
  loading,
}) => {
  const [newFieldName, setNewFieldName] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"write" | "preview">(
    "write",
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <div
      className="ui fluid container"
      style={{
        padding: "1em",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="ui secondary menu">
        <div className="item">
          <button
            type="button"
            onClick={onBack}
            className="ui labeled icon button"
          >
            <i className="left arrow icon"></i>
            Back
          </button>
        </div>
        <div className="item">
          <div className="ui label large">
            <i className="file icon"></i>
            {currentContent.filePath}
          </div>
        </div>
        {isPrLocked && (
          <div className="item">
            <div className="ui orange label">
              <i className="lock icon"></i>
              Locked (PR Open)
            </div>
          </div>
        )}
      </div>

      <div
        className="ui grid"
        style={{ flex: 1, overflow: "hidden", height: "100%" }}
      >
        <div
          className="twelve wide column"
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <div
            className="ui segment"
            style={{ overflowY: "auto", flexShrink: 0, maxHeight: "40%" }}
          >
            <h4 className="ui dividing header">Front Matter</h4>
            <div className="ui form">
              <div className="ui grid">
                {/* Configured Fields */}
                {currentContent.fields?.map((field, index) => (
                  <div
                    key={`configured-${index}`}
                    className="eight wide column field"
                  >
                    <label>{field.name}</label>
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
                ))}

                {/* Custom/Extra Fields */}
                {customFields.map((field) => (
                  <div key={field.id} className="eight wide column field">
                    <label>
                      {field.key}
                      <i
                        className="trash icon link"
                        style={{ marginLeft: "0.5em", color: "#db2828" }}
                        onClick={() => {
                          if (isPrLocked) {
                            return;
                          }
                          setCustomFields((prev) =>
                            prev.filter((f) =>
                              f.id !== field.id
                            )
                          );
                          const { [field.key]: _, ...rest } = frontMatter;
                          setFrontMatter(rest);
                        }}
                      >
                      </i>
                    </label>
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
                ))}
              </div>

              {/* Add New Field */}
              <div className="field" style={{ marginTop: "1em" }}>
                <div className="ui action input">
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="New Field Name"
                    disabled={isPrLocked}
                  />
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
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Menu */}
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
                  style={{ overflowY: "auto", height: "100%", padding: "1em" }}
                >
                  <ReactMarkdown>{body}</ReactMarkdown>
                </div>
              )}
          </div>
        </div>

        <div
          className="four wide column"
          style={{ height: "100%", overflowY: "auto" }}
        >
          <div className="ui segment">
            <h3 className="ui header">
              History
              <button
                type="button"
                className="ui mini right floated button basic"
                onClick={onReset}
                disabled={!hasDraft || isPrLocked}
                title="Discard local changes"
              >
                Reset
              </button>
            </h3>

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
                          onClick={onSaveCollection}
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
