import React from "react";
import { Commit, Content, PrDetails } from "../types.ts";
import { Header } from "./Header.tsx";
import { ContentHistory } from "./ContentHistory.tsx";
import { FrontMatterItemEditor } from "./FrontMatterItemEditor.tsx";
import { FrontMatterListEditor } from "./FrontMatterListEditor.tsx";
import { MarkdownEditor } from "./MarkdownEditor.tsx";

interface ContentEditorProps {
  currentContent: Content;
  body: string;
  setBody: (body: string) => void;
  frontMatter: Record<string, unknown> | Record<string, unknown>[];
  setFrontMatter: (
    fm: Record<string, unknown> | Record<string, unknown>[],
  ) => void;
  isPrLocked: boolean;
  prUrl: string | null;
  hasDraft: boolean;
  draftTimestamp: number | null;
  prDescription: string;
  setPrDescription: (desc: string) => void;
  isSaving: boolean;
  commits: Commit[];
  onSaveContent: () => void;
  onReset: () => void;
  onBack: () => void;
  loading: boolean;
  prDetails: PrDetails | null;
  isResetting?: boolean;
  onBackToCollection?: () => void;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  currentContent,
  body,
  setBody,
  frontMatter,
  setFrontMatter,
  isPrLocked,
  prUrl,
  hasDraft,
  draftTimestamp,
  prDescription,
  setPrDescription,
  isSaving,
  commits,
  onSaveContent,
  onReset,
  onBack,
  loading,
  prDetails,
  isResetting = false,
  onBackToCollection,
}) => {
  const [isPrOpen, setIsPrOpen] = React.useState(false);
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
    <div className="ui container staticms-editor-container">
      <Header>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            type="button"
            className="ui blue button staticms-editor-back-button"
            onClick={onBack}
          >
            <i className="github icon"></i>
            <span className="staticms-editor-repo-name">
              {currentContent.owner}/{currentContent.repo}
            </span>
          </button>
          {currentContent.branch && (
            <span className="ui label mini basic staticms-editor-branch-label">
              <i className="code branch icon"></i>
              {currentContent.branch}
            </span>
          )}
          <span className="staticms-editor-separator">
            /
          </span>
          {currentContent.collectionName
            ? (
              <>
                <button
                  type="button"
                  className="ui blue button staticms-editor-collection-button"
                  onClick={onBackToCollection || onBack}
                >
                  <i className="folder open icon"></i>
                  {currentContent.collectionName}
                </button>
                <span className="staticms-editor-separator">
                  /
                </span>
                <span className="staticms-editor-file-name">
                  {currentContent.name ||
                    currentContent.filePath.split("/").pop()}
                </span>
              </>
            )
            : (
              <span className="staticms-editor-file-name">
                {currentContent.name || currentContent.filePath}
              </span>
            )}
          {isPrLocked && (
            <div className="ui label orange mini staticms-editor-pr-label">
              <i className="lock icon"></i>
              PR Open
            </div>
          )}
        </div>
      </Header>

      <div className="ui grid staticms-editor-grid">
        <div className="twelve wide column staticms-editor-main-column">
          <div
            className={`staticms-editor-fm-segment ${
              isYaml
                ? "staticms-editor-fm-segment-yaml"
                : "staticms-editor-fm-segment-md"
            }`}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
              }}
            >
              {Array.isArray(frontMatter)
                ? (
                  <FrontMatterListEditor
                    frontMatter={frontMatter}
                    setFrontMatter={setFrontMatter as (
                      fm: Record<string, unknown>[],
                    ) => void}
                    currentContent={currentContent}
                    isPrLocked={isPrLocked}
                  />
                )
                : (
                  <FrontMatterItemEditor
                    frontMatter={frontMatter as Record<string, unknown>}
                    setFrontMatter={setFrontMatter as (
                      fm: Record<string, unknown>,
                    ) => void}
                    currentContent={currentContent}
                    isPrLocked={isPrLocked}
                  />
                )}
            </div>
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

        <div className="four wide column staticms-editor-sidebar-column">
          <div>
            {prUrl && (
              <div className="ui message orange">
                <div className="header">
                  <i className="circle icon orange"></i>
                  PR Open
                  {prDetails && (
                    <span className="staticms-editor-pr-number">
                      #{prDetails.number}
                    </span>
                  )}
                </div>
                {prDetails?.body && (
                  <div className="staticms-editor-pr-body">
                    {prDetails.body}
                  </div>
                )}
                <a
                  href={prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="staticms-editor-view-pr-link"
                >
                  View Pull Request
                </a>
              </div>
            )}

            {hasDraft && (
              <div className="ui message gray">
                <div className="content">
                  <div
                    className="header staticms-editor-draft-header"
                    onClick={() => setIsPrOpen(!isPrOpen)}
                  >
                    <i className="circle icon gray"></i>
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
                    <div className="description staticms-editor-draft-description">
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
                      <div className="staticms-editor-reset-container">
                        <button
                          type="button"
                          className={`ui red button staticms-editor-reset-button ${
                            isResetting ? "loading" : ""
                          }`}
                          onClick={onReset}
                          disabled={loading || isSaving || isResetting}
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
