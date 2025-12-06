import React from "react";
import { Content } from "../types.ts";
import { Header } from "./Header.tsx";
import { getContentStatus } from "../hooks/utils.ts";
import { ContentListItem } from "./ContentListItem.tsx";
import { useAuth } from "../hooks/useAuth.ts";

interface ContentListProps {
  contents: Content[];
  selectedRepo: string;
  onEditContentConfig: (index: number) => void;
  onSelectContent: (content: Content, index: number) => void;
  onAddNewContentToRepo: (owner: string, repo: string, branch?: string) => void;
  loadingItemIndex: number | null;
}

export const ContentList: React.FC<ContentListProps> = ({
  contents,
  selectedRepo,
  onEditContentConfig,
  onSelectContent,
  onAddNewContentToRepo,
  loadingItemIndex,
}) => {
  const [owner, repo] = selectedRepo.split("/");
  const { username } = useAuth();

  return (
    <div className="ui container">
      <Header
        breadcrumbs={[{ label: selectedRepo }]}
        rightContent={
          <button
            type="button"
            className="ui primary button"
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
                  primaryText={item.filePath}
                  secondaryText={item.name}
                  labels={
                    <>
                      {item.branch && (
                        <span className="ui label mini basic staticms-content-list-branch">
                          <i className="code branch icon"></i>
                          {item.branch}
                        </span>
                      )}
                    </>
                  }
                  status={getContentStatus(
                    item.owner,
                    item.repo,
                    item.branch,
                    item.filePath,
                    !!item.type?.startsWith("collection"),
                    username || undefined,
                  )}
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
                      <i className="file alternate outline icon"></i>
                    </button>
                  }
                  loading={loadingItemIndex === index}
                  disabled={loadingItemIndex !== null &&
                    loadingItemIndex !== index}
                  onClick={() => {
                    if (loadingItemIndex === null) {
                      onSelectContent(item, index);
                    }
                  }}
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
};
