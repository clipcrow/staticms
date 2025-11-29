import React from "react";
import { Commit, Content, PrDetails } from "../types.ts";
import { Header } from "./Header.tsx";
import { ContentHistory } from "./ContentHistory.tsx";
import { FrontMatterEditor } from "./FrontMatterEditor.tsx";
import { MarkdownEditor } from "./MarkdownEditor.tsx";

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
  prDetails: PrDetails | null;
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
  prDetails,
}) => {
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
      <Header>
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
            <i className="reply icon"></i>
            <i className="github icon"></i>
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
            <FrontMatterEditor
              frontMatter={frontMatter}
              setFrontMatter={setFrontMatter}
              currentContent={currentContent}
              isPrLocked={isPrLocked}
              customFields={customFields}
              setCustomFields={setCustomFields}
            />
          </div>

          {/* Tab Menu */}
          {!isYaml && (
            <MarkdownEditor
              body={body}
              setBody={setBody}
              isPrLocked={isPrLocked}
            />
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
                  {prStatus === "open" && prDetails && (
                    <span style={{ fontWeight: "normal", marginLeft: "0.5em" }}>
                      #{prDetails.number}
                    </span>
                  )}
                </div>
                {prStatus === "open" && prDetails?.body && (
                  <div style={{ marginTop: "0.5em", fontStyle: "italic" }}>
                    {prDetails.body}
                  </div>
                )}
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
                      {isPrLocked && prDetails
                        ? (
                          <div className="ui feed">
                            <div className="event">
                              <div className="content">
                                <div className="summary">
                                  <a
                                    href={prDetails.html_url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    PR #{prDetails.number}: {prDetails.title}
                                  </a>
                                  <div className="date">
                                    {new Date(prDetails.created_at)
                                      .toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="extra text">
                                  {prDetails.body}
                                </div>
                                <div className="meta">
                                  by {prDetails.user.login}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                        : (
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
                        )}
                      <div style={{ marginTop: "0.5em", textAlign: "center" }}>
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
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ContentHistory
              commits={commits}
              currentContent={currentContent}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
