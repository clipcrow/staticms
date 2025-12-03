import React from "react";
import { Content } from "../types.ts";
import { Header } from "./Header.tsx";
import { getDraftKey, getPrKey } from "../hooks/utils.ts";
import { ContentListItem } from "./ContentListItem.tsx";

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
  onChangeRepo: _onChangeRepo,
}) => {
  const [owner, repo] = selectedRepo.split("/");

  return (
    <div className="ui container">
      <Header
        breadcrumbs={[{ label: selectedRepo }]}
        rightContent={
          <button
            type="button"
            className="ui green button"
            onClick={() => onAddNewContentToRepo(owner, repo)}
          >
            <i className="plus icon"></i>
            Add New Content
          </button>
        }
      />

      <div className="ui segment">
        {contents.length === 0
          ? (
            <div className="ui message info">
              No contents configured. Click the + button to add content.
            </div>
          )
          : (
            <div className="ui relaxed divided list">
              {contents.map((item, index) => (
                <ContentListItem
                  key={index}
                  title={item.name || item.filePath}
                  icon={
                    <i
                      className={`${
                        item.type?.startsWith("collection")
                          ? "folder"
                          : "file outline"
                      } icon`}
                    >
                    </i>
                  }
                  loading={loadingItemIndex === index}
                  disabled={loadingItemIndex !== null &&
                    loadingItemIndex !== index}
                  onClick={() => {
                    if (loadingItemIndex === null) {
                      onSelectContent(item, index);
                    }
                  }}
                  actions={
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
                  }
                  labels={
                    <>
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
                    </>
                  }
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
};
