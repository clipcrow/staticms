import React from "react";
import { Content } from "../types.ts";
import { Header } from "./Header.tsx";
import { getDraftKey, getPrKey } from "../hooks/utils.ts";

interface ContentListProps {
  contents: Content[];
  selectedRepo: string;
  onEditContentConfig: (index: number) => void;
  onSelectContent: (content: Content, index: number) => void;
  onAddNewContentToRepo: (owner: string, repo: string, branch?: string) => void;
  loadingItemIndex: number | null;
  onChangeRepo: () => void;
}

export const ContentList: React.FC<ContentListProps> = ({
  contents,
  selectedRepo,
  onEditContentConfig,
  onSelectContent,
  onAddNewContentToRepo,
  loadingItemIndex,
  onChangeRepo,
}) => {
  const [owner, repo] = selectedRepo.split("/");

  return (
    <div className="ui container">
      <Header
        rightContent={
          <button type="button" className="ui button" onClick={onChangeRepo}>
            <i className="exchange icon"></i>
            Change Repo
          </button>
        }
      />

      <div className="ui card fluid">
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
                    className="item staticms-content-list-item"
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
                      className="content staticms-content-list-clickable"
                      onClick={() => {
                        if (loadingItemIndex === null) {
                          onSelectContent(item, index);
                        }
                      }}
                      style={{
                        cursor: loadingItemIndex === null
                          ? "pointer"
                          : "default",
                        opacity: loadingItemIndex !== null &&
                            loadingItemIndex !== index
                          ? 0.5
                          : 1,
                      }}
                    >
                      {loadingItemIndex === index
                        ? (
                          <div className="ui active mini inline loader staticms-content-list-loader">
                          </div>
                        )
                        : (
                          <i className="file outline icon staticms-content-list-icon">
                          </i>
                        )}
                      <span className="header staticms-content-list-header">
                        {item.name || item.filePath}
                      </span>
                      {item.branch && (
                        <span className="ui label mini basic staticms-content-list-branch">
                          <i className="code branch icon"></i>
                          {item.branch}
                        </span>
                      )}
                      {(() => {
                        const prKey = getPrKey(item);
                        const draftKey = getDraftKey(item);
                        const hasPr = localStorage.getItem(prKey);
                        const hasDraft = localStorage.getItem(draftKey);

                        if (hasPr) {
                          return (
                            <span
                              className="ui label orange mini basic"
                              style={{ marginLeft: "0.5em" }}
                            >
                              <i className="lock icon"></i>
                              PR Open
                            </span>
                          );
                        }
                        if (hasDraft) {
                          return (
                            <span
                              className="ui label gray mini basic"
                              style={{ marginLeft: "0.5em" }}
                            >
                              <i className="edit icon"></i>
                              Draft / PR
                            </span>
                          );
                        }
                        return null;
                      })()}
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
