import React from "react";
import { useSetHeader } from "@/app/contexts/HeaderContext.tsx";
import { RepoBreadcrumbLabel } from "@/app/components/common/RepoBreadcrumb.tsx";

import { getContentStatus } from "@/app/components/editor/utils.ts";
import { StatusBadge } from "@/app/components/common/StatusBadge.tsx";
import { FileItem } from "@/shared/types.ts";
import type { Collection } from "@/app/hooks/useContentConfig.ts";

export interface ArticleListViewProps {
  owner: string;
  repo: string;
  branch?: string;
  defaultBranch?: string;
  collectionName: string;
  collectionDef?: Collection;
  files: FileItem[];
  loading: boolean;
  error: Error | null;

  // UI State
  searchQuery: string;
  newArticleName: string;
  deleteTarget: FileItem | null;
  page: number;
  totalPages: number;

  // Actions
  onSearchChange: (query: string) => void;
  onNewArticleNameChange: (name: string) => void;
  onCreate: () => void;
  onSelect: (path: string) => void;
  onDeleteRequest: (file: FileItem) => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onPageChange: (page: number) => void;
}

export const ArticleListView: React.FC<ArticleListViewProps> = ({
  owner,
  repo,
  branch = "main",
  defaultBranch,
  collectionName,
  collectionDef,
  files,
  loading,
  error,
  searchQuery,
  newArticleName,
  deleteTarget,
  page,
  totalPages,
  onSearchChange,
  onNewArticleNameChange,
  onCreate,
  onSelect,
  onDeleteRequest: _onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onPageChange,
}) => {
  const isDuplicate = files.some((f) =>
    f.name === newArticleName || f.name.replace(/\.md$/, "") === newArticleName
  );
  const hasInvalidChars = /[\\/:*?"<>|]/.test(newArticleName);
  const isCreateDisabled = !newArticleName || isDuplicate || hasInvalidChars;

  const breadcrumbs = [
    {
      label: (
        <RepoBreadcrumbLabel
          owner={owner}
          repo={repo}
          branch={branch}
          defaultBranch={defaultBranch}
        />
      ),
      to: `/${owner}/${repo}`,
    },
  ];

  const displayTitle = collectionDef?.label || collectionDef?.path ||
    collectionName || "Articles";

  const titleNode = displayTitle;

  useSetHeader(breadcrumbs, titleNode);

  if (error) {
    return (
      <div className="ui container staticms-article-list-status-container">
        <div className="ui negative message">
          Error: {error.message}
        </div>
      </div>
    );
  }

  if (!collectionDef) {
    return (
      <div className="ui container staticms-article-list-status-container">
        <div className="ui warning message">
          Collection "{collectionName}" not found.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="ui container staticms-article-list-container staticms-search-create-bar">
        <div className="inner-wrapper">
          {/* 2. Search */}
          <div className="search-box">
            <div className="ui icon input fluid">
              <input
                type="text"
                placeholder="Filter articles..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <i className="search icon"></i>
            </div>
          </div>

          {/* 3. Create New (Combined Input & Button) */}
          <div className="create-box">
            <div
              className={`ui action input fluid ${
                files.some((f) =>
                    f.name === newArticleName ||
                    f.name.replace(/\.md$/, "") === newArticleName
                  )
                  ? "error"
                  : ""
              }`}
            >
              <input
                type="text"
                placeholder="New article name (e.g. my-post)"
                value={newArticleName}
                onChange={(e) => onNewArticleNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    // deno-lint-ignore no-explicit-any
                    e.key === "Enter" && !(e.nativeEvent as any).isComposing
                  ) {
                    if (
                      newArticleName && !isDuplicate && !hasInvalidChars
                    ) onCreate();
                  }
                }}
              />
              <button
                type="button"
                className="ui primary button"
                onClick={onCreate}
                disabled={isCreateDisabled}
                title={isDuplicate
                  ? "Article already exists"
                  : hasInvalidChars
                  ? 'Contains invalid characters (e.g. / : * ? " < > |)'
                  : "Create new article"}
              >
                <i className="plus icon"></i>
                Create
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="ui container staticms-article-list-container">
        {files.length === 0
          ? (
            loading ? null : (
              <div className="ui placeholder segment">
                <div className="ui icon header">
                  <i className="file outline icon"></i>
                  No articles found
                </div>
                {searchQuery
                  ? (
                    <div className="inline">
                      Your search returned no results.
                    </div>
                  )
                  : (
                    <div className="inline">
                      Create a new article above to get started!
                    </div>
                  )}
              </div>
            )
          )
          : (
            <>
              <>
                <div className="ui three stackable cards">
                  {files.map((file) => {
                    // Construct status check key that matches ContentEditor's save format (collectionName/fileName)
                    // If collectionName is missing, fall back to file.path (though shouldn't happen in this view)
                    const statusCheckKey = collectionName
                      ? `${collectionName}/${file.name}`
                      : (file.path || "");

                    const status = getContentStatus(
                      owner || "",
                      repo || "",
                      branch,
                      statusCheckKey,
                      false,
                    );
                    return (
                      <div
                        className="card link"
                        key={file.path}
                        onClick={() => onSelect(file.path || "")}
                      >
                        <div className="content">
                          <div className="header staticms-article-card-header">
                            {file.name}
                          </div>
                          <div className="meta">
                            Config: {collectionDef.label}
                          </div>
                        </div>
                        <div className="extra content">
                          <span className="right floated">
                            {status.hasDraft
                              ? (
                                <StatusBadge
                                  status="draft"
                                  count={status.draftCount}
                                />
                              )
                              : status.hasPr
                              ? (
                                <StatusBadge
                                  status="pr_open"
                                  prNumber={status.prNumber}
                                />
                              )
                              : null}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>

              {totalPages > 1 && (
                <div className="staticms-pagination-wrapper">
                  <div className="ui pagination menu">
                    <button
                      type="button"
                      className={`item ${page === 1 ? "disabled" : ""}`}
                      onClick={() => onPageChange(Math.max(1, page - 1))}
                    >
                      &lt;
                    </button>
                    <div className="item disabled current-page-info">
                      Page {page} of {totalPages}
                    </div>
                    <button
                      type="button"
                      className={`item ${
                        page === totalPages ? "disabled" : ""
                      }`}
                      onClick={() =>
                        onPageChange(Math.min(totalPages, page + 1))}
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="ui dimmer modals page visible active">
            <div className="ui standard test modal transition visible active staticms-delete-modal-override">
              <div className="header">
                Delete Article
              </div>
              <div className="content">
                <p>
                  Are you sure you want to delete <b>{deleteTarget.name}</b>?
                </p>
                <div className="ui warning message">
                  <i className="warning icon"></i>
                  This action will commit a deletion to the repository.
                </div>
              </div>
              <div className="actions">
                <div
                  className="ui black deny button"
                  onClick={onDeleteCancel}
                >
                  Cancel
                </div>
                <div
                  className="ui negative right labeled icon button"
                  onClick={onDeleteConfirm}
                >
                  Delete
                  <i className="trash icon"></i>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
