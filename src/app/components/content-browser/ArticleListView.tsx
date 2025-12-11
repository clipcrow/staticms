import React from "react";
import { Header } from "@/app/components/common/Header.tsx";
import { ContentListItem } from "./ContentListItem.tsx";
import { getContentStatus } from "@/app/components/editor/utils.ts";
import { StatusBadge } from "@/app/components/common/StatusBadge.tsx";
import { FileItem } from "@/shared/types.ts";
import type { Collection } from "@/app/hooks/useContentConfig.ts";

export interface ArticleListViewProps {
  owner: string;
  repo: string;
  collectionName: string;
  collectionDef?: Collection;
  files: FileItem[];
  loading: boolean;
  error: Error | null;

  // UI State
  viewMode: "card" | "list";
  searchQuery: string;
  newArticleName: string;
  deleteTarget: FileItem | null;
  page: number;
  totalPages: number;

  // Actions
  onViewModeChange: (mode: "card" | "list") => void;
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
  collectionName,
  collectionDef,
  files,
  loading,
  error,
  viewMode,
  searchQuery,
  newArticleName,
  deleteTarget,
  page,
  totalPages,
  onViewModeChange,
  onSearchChange,
  onNewArticleNameChange,
  onCreate,
  onSelect,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onPageChange,
}) => {
  if (loading) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <Header
          breadcrumbs={[
            { label: `${owner}/${repo}`, to: `/${owner}/${repo}` },
            { label: collectionName || "" },
          ]}
        />
        <div className="ui placeholder segment">
          <div className="ui active inverted dimmer">
            <div className="ui loader"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <div className="ui negative message">
          Error: {error.message}
        </div>
      </div>
    );
  }

  if (!collectionDef) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <div className="ui warning message">
          Collection "{collectionName}" not found.
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        breadcrumbs={[
          { label: `${owner}/${repo}`, to: `/${owner}/${repo}` },
          {
            label: collectionDef.label || collectionDef.path ||
              collectionName || "",
          },
        ]}
        rightContent={
          <div style={{ display: "flex", gap: "0.5em" }}>
            <div className="ui icon buttons basic">
              <button
                type="button"
                className={`ui button ${viewMode === "card" ? "active" : ""}`}
                onClick={() => onViewModeChange("card")}
                title="Card View"
              >
                <i className="th icon"></i>
              </button>
              <button
                type="button"
                className={`ui button ${viewMode === "list" ? "active" : ""}`}
                onClick={() => onViewModeChange("list")}
                title="List View"
              >
                <i className="list icon"></i>
              </button>
            </div>
          </div>
        }
      />
      <div className="staticms-toolbar-container">
        <div className="ui container">
          <div className="ui form">
            <div
              className="fields"
              style={{ display: "flex" }}
            >
              {/* Search */}
              <div className="field" style={{ flex: 1 }}>
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
              {/* Create New */}
              <div
                className="field"
                style={{ width: "350px", flexShrink: 0, marginLeft: "1em" }}
              >
                <div className="ui action input fluid">
                  <input
                    type="text"
                    placeholder="New article name (e.g. my-post)"
                    value={newArticleName}
                    onChange={(e) => onNewArticleNameChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onCreate();
                    }}
                  />
                  <button
                    type="button"
                    className="ui primary button"
                    onClick={onCreate}
                  >
                    <i className="plus icon"></i>
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ui container" style={{ marginTop: "2rem" }}>
        {files.length === 0
          ? (
            <div className="ui placeholder segment">
              <div className="ui icon header">
                <i className="file outline icon"></i>
                No articles found
              </div>
              {searchQuery
                ? <div className="inline">Your search returned no results.</div>
                : (
                  <div className="inline">
                    Create a new article above to get started!
                  </div>
                )}
            </div>
          )
          : (
            <>
              {viewMode === "card" && (
                <div className="ui three stackable cards">
                  {files.map((file) => {
                    const status = getContentStatus(
                      owner || "",
                      repo || "",
                      "main", // Assuming main branch for now
                      file.path || "",
                      false,
                    );
                    return (
                      <div
                        className="card link"
                        key={file.path}
                        onClick={() => onSelect(file.path || "")}
                      >
                        <div className="content">
                          <div
                            className="header"
                            style={{ wordBreak: "break-all" }}
                          >
                            {file.name}
                          </div>
                          <div className="meta">
                            Config: {collectionDef.label}
                          </div>
                        </div>
                        <div className="extra content">
                          <span className="right floated">
                            <button
                              type="button"
                              className="ui icon button mini basic"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteRequest(file);
                              }}
                              title="Delete Article"
                            >
                              <i className="trash icon red"></i>
                            </button>
                          </span>
                          <span>
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
              )}

              {viewMode === "list" && (
                <div className="ui relaxed divided list">
                  {files.map((file) => {
                    const status = getContentStatus(
                      owner || "",
                      repo || "",
                      "main", // Assuming main branch for now
                      file.path || "",
                      false,
                    );
                    return (
                      <ContentListItem
                        key={file.path}
                        icon={<i className="large file outline icon" />}
                        primaryText={file.name}
                        secondaryText={file.path}
                        status={status}
                        actions={
                          <button
                            type="button"
                            className="ui icon button mini basic"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRequest(file);
                            }}
                            title="Delete Article"
                          >
                            <i className="trash icon red"></i>
                          </button>
                        }
                        onClick={() => onSelect(file.path || "")}
                      />
                    );
                  })}
                </div>
              )}

              {totalPages > 1 && (
                <div style={{ marginTop: "1em", textAlign: "center" }}>
                  <div className="ui pagination menu">
                    <button
                      type="button"
                      className={`item ${page === 1 ? "disabled" : ""}`}
                      onClick={() =>
                        onPageChange(Math.max(1, page - 1))}
                    >
                      &lt;
                    </button>
                    <div
                      className="item disabled"
                      style={{ color: "black", opacity: 1 }}
                    >
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
            <div
              className="ui standard test modal transition visible active"
              style={{ display: "block !important", marginTop: "100px" }}
            >
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
