import React from "react";
import { Header } from "@/app/components/common/Header.tsx";
import { ContentListItem } from "./ContentListItem.tsx";
import { getContentStatus } from "@/app/components/editor/utils.ts";
import { StatusBadge } from "@/app/components/common/StatusBadge.tsx";
import type { Collection } from "@/app/hooks/useContentConfig.ts";

// UI Props Definition
export interface CollectionListProps {
  collections: Collection[];
  owner: string;
  repo: string;
  viewMode: "card" | "list";
  searchQuery: string;
  onViewModeChange: (mode: "card" | "list") => void;
  onSearchChange: (query: string) => void;
  onSelect: (collectionName: string) => void;
  onSettings: (collectionName: string) => void;
  onAdd: () => void;
}

export const CollectionList: React.FC<CollectionListProps> = ({
  collections,
  owner,
  repo,
  viewMode,
  searchQuery,
  onViewModeChange,
  onSearchChange,
  onSelect,
  onSettings,
  onAdd,
}) => {
  if (!collections || collections.length === 0) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <Header
          breadcrumbs={[
            { label: `${owner}/${repo}`, to: `/${owner}/${repo}` },
          ]}
        />
        <div className="ui placeholder segment">
          <div className="ui icon header">
            <i className="file alternate outline icon"></i>
            No content definitions found.
          </div>
          <div className="inline">
            <p>Start by adding your first content collection.</p>
            <button
              type="button"
              className="ui primary button"
              onClick={onAdd}
            >
              <i className="plus icon"></i>
              Add New Content
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getDisplayName = (c: Collection) =>
    c.label || c.path || c.folder || c.file || c.name;

  const filteredCollections = collections.filter((c) =>
    getDisplayName(c).toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="ui container" style={{ marginTop: "2rem" }}>
      <Header
        breadcrumbs={[
          { label: `${owner}/${repo}`, to: `/${owner}/${repo}` },
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
            <button
              type="button"
              className="ui primary button"
              onClick={onAdd}
            >
              <i className="plus icon"></i>
              Add New Content
            </button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="ui segment secondary form">
        <div className="fields inline" style={{ margin: 0 }}>
          <div className="sixteen wide field">
            <div className="ui icon input fluid">
              <input
                type="text"
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <i className="search icon"></i>
            </div>
          </div>
        </div>
      </div>

      {/* List Content */}
      {filteredCollections.length === 0
        ? <div className="ui message">No collections match your search.</div>
        : (
          <>
            {viewMode === "card" && (
              <div className="ui three stackable cards">
                {filteredCollections.map((c) => {
                  const isSingleton = c.type === "singleton";
                  const statusPath = isSingleton
                    ? `${c.name}/singleton`
                    : c.name;
                  const status = getContentStatus(
                    owner,
                    repo,
                    "main",
                    statusPath,
                    !isSingleton,
                  );

                  return (
                    <div
                      className="card link"
                      key={c.name}
                      onClick={() => onSelect(c.name)}
                    >
                      <div className="content">
                        <div className="header">
                          <i
                            className={`icon ${
                              c.type === "singleton"
                                ? "file outline"
                                : "folder outline"
                            }`}
                            style={{ marginRight: "0.5em" }}
                          >
                          </i>
                          {getDisplayName(c)}
                        </div>
                        <div className="meta">
                          {c.name}
                        </div>
                        <div className="description">
                          {c.type === "singleton"
                            ? "Singleton Content"
                            : "Collection of entries"}
                        </div>
                      </div>
                      <div className="extra content">
                        <span className="right floated">
                          <button
                            type="button"
                            className="ui icon button basic mini"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSettings(c.name);
                            }}
                            title="Settings"
                          >
                            <i className="cog icon"></i>
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
                {filteredCollections.map((c) => {
                  const isSingleton = c.type === "singleton";
                  const statusPath = isSingleton
                    ? `${c.name}/singleton`
                    : c.name;
                  const status = getContentStatus(
                    owner,
                    repo,
                    "main",
                    statusPath,
                    !isSingleton,
                  );

                  return (
                    <ContentListItem
                      key={c.name}
                      icon={
                        <i
                          className={`large icon ${
                            c.type === "singleton"
                              ? "file outline"
                              : "folder outline"
                          }`}
                        />
                      }
                      primaryText={getDisplayName(c)}
                      secondaryText={c.name}
                      actions={
                        <button
                          type="button"
                          className="ui icon button basic mini"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSettings(c.name);
                          }}
                          title="Settings"
                        >
                          <i className="cog icon"></i>
                        </button>
                      }
                      onClick={() => onSelect(c.name)}
                      status={status}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
    </div>
  );
};
