import React from "react";
import { Content } from "../types.ts";

interface ContentListProps {
  contents: Content[];
  onEditContentConfig: (index: number) => void;
  onSelectContent: (content: Content, index: number) => void;
  onAddNewContent: () => void;
  onAddNewContentToRepo: (owner: string, repo: string, branch?: string) => void;
  loadingItemIndex: number | null;
}

export const ContentList: React.FC<ContentListProps> = ({
  contents,
  onEditContentConfig,
  onSelectContent,
  onAddNewContent,
  onAddNewContentToRepo,
  loadingItemIndex,
}) => {
  // Group contents by repository (owner + repo + branch)
  const groupedContents = contents.reduce(
    (acc, content, index) => {
      const key = `${content.owner}/${content.repo}:${content.branch || ""}`;
      if (!acc[key]) {
        acc[key] = {
          owner: content.owner,
          repo: content.repo,
          branch: content.branch,
          items: [],
        };
      }
      acc[key].items.push({ ...content, originalIndex: index });
      return acc;
    },
    {} as Record<
      string,
      {
        owner: string;
        repo: string;
        branch?: string;
        items: (Content & { originalIndex: number })[];
      }
    >,
  );

  return (
    <div className="ui container" style={{ marginTop: "2em" }}>
      <h1 className="ui header">
        <i className="edit icon"></i>
        <div className="content">
          Staticms
          <div className="sub header">Manage headless contents with GitHub</div>
        </div>
      </h1>

      <div className="ui segment" style={{ marginTop: "2em" }}>
        <div className="ui grid">
          <div className="two column row">
            <div className="column">
              <h2 className="ui header">Repositories</h2>
            </div>
            <div className="column right aligned">
              <button
                type="button"
                onClick={onAddNewContent}
                className="ui primary button icon"
                title="Add Repository"
              >
                <i className="plus icon"></i>
              </button>
            </div>
          </div>
        </div>

        {Object.keys(groupedContents).length === 0
          ? (
            <div className="ui placeholder segment">
              <div className="ui icon header">
                <i className="github icon"></i>
                No repositories configured
              </div>
              <div className="inline">
                <div className="ui primary button" onClick={onAddNewContent}>
                  Add Repository
                </div>
              </div>
            </div>
          )
          : (
            <div style={{ marginTop: "2em" }}>
              {Object.values(groupedContents).map((group, groupIndex) => (
                <div
                  key={groupIndex}
                  className="ui card fluid"
                  style={{ marginBottom: "2em" }}
                >
                  <div className="content">
                    <div className="header">
                      <i className="github icon"></i>
                      {group.owner}/{group.repo}
                      {group.branch && (
                        <span
                          className="ui label mini basic"
                          style={{
                            marginLeft: "0.5em",
                            verticalAlign: "middle",
                          }}
                        >
                          <i className="code branch icon"></i>
                          {group.branch}
                        </span>
                      )}
                      <button
                        type="button"
                        className="ui mini button primary icon right floated"
                        onClick={() =>
                          onAddNewContentToRepo(
                            group.owner,
                            group.repo,
                            group.branch,
                          )}
                        title="Add Content"
                      >
                        <i className="plus icon"></i>
                      </button>
                    </div>
                  </div>
                  <div className="content">
                    <div className="ui relaxed divided list">
                      {group.items.map((item) => (
                        <div
                          key={item.originalIndex}
                          className="item"
                          style={{ padding: "0.5em 0" }}
                        >
                          <div className="right floated content">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditContentConfig(item.originalIndex);
                              }}
                              className="ui icon button mini"
                              title="Edit Configuration"
                              disabled={loadingItemIndex !== null}
                            >
                              <i className="edit icon"></i>
                            </button>
                          </div>
                          <div
                            className="content"
                            onClick={() => {
                              if (loadingItemIndex === null) {
                                onSelectContent(item, item.originalIndex);
                              }
                            }}
                            style={{
                              cursor: loadingItemIndex === null
                                ? "pointer"
                                : "default",
                              display: "flex",
                              alignItems: "center",
                              opacity: loadingItemIndex !== null &&
                                  loadingItemIndex !== item.originalIndex
                                ? 0.5
                                : 1,
                            }}
                          >
                            {loadingItemIndex === item.originalIndex
                              ? (
                                <div
                                  className="ui active mini inline loader"
                                  style={{ marginRight: "0.5em" }}
                                >
                                </div>
                              )
                              : (
                                <i
                                  className="file outline icon"
                                  style={{ marginRight: "0.5em" }}
                                >
                                </i>
                              )}
                            <span
                              className="header"
                              style={{ fontSize: "1em" }}
                            >
                              {item.filePath}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};
