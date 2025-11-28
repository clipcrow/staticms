import React from "react";
import { Content } from "../types.ts";
import { Header } from "./Header.tsx";

interface ContentListProps {
  contents: Content[];
  selectedRepo: string;
  onEditContentConfig: (index: number) => void;
  onSelectContent: (content: Content, index: number) => void;
  onAddNewContentToRepo: (owner: string, repo: string, branch?: string) => void;
  loadingItemIndex: number | null;
  onLogout: () => void;
}

export const ContentList: React.FC<ContentListProps> = ({
  contents,
  selectedRepo,
  onEditContentConfig,
  onSelectContent,
  onAddNewContentToRepo,
  loadingItemIndex,
  onLogout,
}) => {
  const [owner, repo] = selectedRepo.split("/");

  return (
    <div className="ui container">
      <Header onLogout={onLogout} />

      <div className="ui card fluid" style={{ marginTop: "2em" }}>
        <div className="content">
          <div className="header">
            <i className="github icon"></i>
            {selectedRepo}
            <button
              type="button"
              className="ui mini button primary icon right floated"
              onClick={() => onAddNewContentToRepo(owner, repo)}
              title="Add Content"
            >
              <i className="plus icon"></i>
            </button>
          </div>
        </div>
        <div className="content">
          {contents.length === 0
            ? (
              <div className="ui message info">
                No contents configured. Click the + button to add content.
              </div>
            )
            : (
              <div className="ui relaxed divided list">
                {contents.map((item, index) => (
                  <div
                    key={index}
                    className="item"
                    style={{ padding: "0.5em 0" }}
                  >
                    <div className="right floated content">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditContentConfig(index);
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
                          onSelectContent(item, index);
                        }
                      }}
                      style={{
                        cursor: loadingItemIndex === null
                          ? "pointer"
                          : "default",
                        display: "flex",
                        alignItems: "center",
                        opacity: loadingItemIndex !== null &&
                            loadingItemIndex !== index
                          ? 0.5
                          : 1,
                      }}
                    >
                      {loadingItemIndex === index
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
                      {item.branch && (
                        <span
                          className="ui label mini basic"
                          style={{
                            marginLeft: "0.5em",
                            verticalAlign: "middle",
                          }}
                        >
                          <i className="code branch icon"></i>
                          {item.branch}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
