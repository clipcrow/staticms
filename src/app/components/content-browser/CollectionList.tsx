import React from "react";
import { useSetHeader } from "@/app/contexts/HeaderContext.tsx";
import { RepoBreadcrumbLabel } from "@/app/components/common/RepoBreadcrumb.tsx";

import { getContentStatus } from "@/app/components/editor/utils.ts";
import { StatusBadge } from "@/app/components/common/StatusBadge.tsx";
import type { Collection } from "@/app/hooks/useContentConfig.ts";

// UI Props Definition
export interface CollectionListProps {
  collections: Collection[];
  owner: string;
  repo: string;
  branch?: string;
  defaultBranch?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (collection: Collection) => void;
  onSettings: (collectionName: string) => void;
  onAdd: () => void;
}

export const CollectionList: React.FC<CollectionListProps> = ({
  collections,
  owner,
  repo,
  branch = "main",
  defaultBranch,
  searchQuery,
  onSearchChange,
  onSelect,
  onSettings,
  onAdd,
}) => {
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
    },
  ];

  useSetHeader(breadcrumbs, "Contents");

  if (!collections || collections.length === 0) {
    return (
      <div className="ui container staticms-collection-list-grid">
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
    <>
      <div className="ui container staticms-collection-list-search-container">
        <div className="staticms-collection-list-toolbar">
          {/* 2. Search Input */}
          <div className="search-wrapper">
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

          {/* 3. Add Content Button */}
          <div className="add-btn-wrapper">
            <button
              type="button"
              className="ui primary button icon"
              onClick={onAdd}
            >
              <i className="plus icon"></i> Add New Content
            </button>
          </div>
        </div>
      </div>

      <div className="ui container staticms-collection-list-grid">
        {/* List Content */}
        {filteredCollections.length === 0
          ? <div className="ui message">No collections match your search.</div>
          : (
            <>
              <div className="ui three stackable cards">
                {filteredCollections.map((c) => {
                  // Support both "singleton" and "singleton-file"/"singleton-dir" types
                  const isSingleton = c.type === "singleton" ||
                    c.type?.startsWith("singleton-");
                  const statusPath = isSingleton
                    ? `${c.name}/singleton`
                    : c.name;
                  const status = getContentStatus(
                    owner,
                    repo,
                    branch,
                    statusPath,
                    !isSingleton,
                  );

                  return (
                    <div
                      className="card link"
                      key={c.name}
                      onClick={() => onSelect(c)}
                    >
                      <div className="content header-segment">
                        <i
                          className={`right floated icon staticms-collection-card-icon ${
                            isSingleton ? "file outline" : "folder outline"
                          }`}
                        >
                        </i>
                        <div className="header staticms-collection-card-header">
                          {getDisplayName(c)}
                        </div>
                      </div>
                      <div className="content">
                        <div className="meta staticms-collection-card-meta">
                          {c.name}
                        </div>
                        <div className="description staticms-collection-card-desc">
                          {isSingleton
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
                          {status.hasDraft && (
                            <StatusBadge
                              status="draft"
                              count={status.draftCount}
                              className="staticms-badge-spacer-right"
                            />
                          )}
                          {status.hasPr && (
                            <StatusBadge
                              status="pr_open"
                              prNumber={status.prNumber}
                              count={status.prCount}
                            />
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
      </div>
    </>
  );
};
