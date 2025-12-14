import React from "react";
import { useSetHeader } from "@/app/contexts/HeaderContext.tsx";
import { getRepoStatus } from "@/app/components/editor/utils.ts";
import { StatusBadge } from "@/app/components/common/StatusBadge.tsx";
import type { Repository } from "@/app/hooks/useRepositories.ts";

export interface RepositoryListProps {
  repos: Repository[];
  loading: boolean;
  error: string | null;
  viewMode: "card" | "list";
  searchQuery: string;
  filterType: "all" | "public" | "private" | "fork";
  onViewModeChange: (mode: "card" | "list") => void;
  onSearchChange: (query: string) => void;
  onFilterTypeChange: (type: "all" | "public" | "private" | "fork") => void;
  onSelect: (repoFullName: string) => void;
  onSettings: (repoFullName: string) => void;
}

export const RepositoryList: React.FC<RepositoryListProps> = ({
  repos,
  loading,
  error,
  viewMode,
  searchQuery,
  filterType,
  onViewModeChange,
  onSearchChange,
  onFilterTypeChange,
  onSelect,
  onSettings,
}) => {
  useSetHeader([], "Repositories");

  return (
    <div>
      <div
        className="ui container"
        style={{ marginTop: "1rem", marginBottom: "1rem" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* 1. View Toggle */}
          <div style={{ flexShrink: 0 }}>
            <div className="ui icon buttons">
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

          {/* 2. Search Input (Variable Width) */}
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div className="ui icon input fluid">
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <i className="search icon"></i>
            </div>
          </div>

          {/* 3. Filter Buttons */}
          <div style={{ flexShrink: 0 }}>
            <div className="ui icon buttons">
              <button
                type="button"
                className={`ui button ${filterType === "all" ? "active" : ""}`}
                onClick={() => onFilterTypeChange("all")}
                title="All Types"
              >
                <i className="list icon"></i>
              </button>
              <button
                type="button"
                className={`ui button ${
                  filterType === "private" ? "active" : ""
                }`}
                onClick={() => onFilterTypeChange("private")}
                title="Private"
              >
                <i className="lock icon"></i>
              </button>
              <button
                type="button"
                className={`ui button ${
                  filterType === "public" ? "active" : ""
                }`}
                onClick={() => onFilterTypeChange("public")}
                title="Public"
              >
                <i className="globe icon"></i>
              </button>
              <button
                type="button"
                className={`ui button ${filterType === "fork" ? "active" : ""}`}
                onClick={() => onFilterTypeChange("fork")}
                title="Forks"
              >
                <i className="code branch icon"></i>
              </button>
            </div>
          </div>

          {/* 4. Connect Repository Button */}
          <div style={{ flexShrink: 0 }}>
            <a
              href="https://github.com/apps/staticms"
              target="_blank"
              rel="noreferrer"
              className="ui button icon action-black"
              title="Connect Repository"
            >
              <i className="plus icon"></i> Connect Repository
            </a>
          </div>
        </div>
      </div>

      <div className="ui container" style={{ marginTop: "2rem" }}>
        {loading && (
          <div className="ui placeholder segment">
            <div className="ui active inverted dimmer">
              <div className="ui loader"></div>
            </div>
          </div>
        )}

        {error && <div className="ui message error">{error}</div>}

        {!loading && !error && repos.length > 0 &&
          repos.filter((repo) => {
              const matchesSearch = repo.full_name.toLowerCase().includes(
                searchQuery.toLowerCase(),
              );
              const matchesFilter = filterType === "all" ||
                (filterType === "public" && !repo.private) ||
                (filterType === "private" && repo.private) ||
                (filterType === "fork" && repo.fork);
              return matchesSearch && matchesFilter;
            }).length === 0 &&
          (
            <div className="ui placeholder segment">
              <div className="ui icon header">
                <i className="github icon"></i>
                No repositories found
              </div>
              {searchQuery
                ? <div className="inline">Your search returned no results.</div>
                : (
                  <div className="inline">
                    <a
                      href="https://github.com/apps/staticms"
                      target="_blank"
                      className="ui primary button"
                    >
                      Connect your first repository
                    </a>
                  </div>
                )}
            </div>
          )}

        {/* Card View */}
        {!loading && !error && viewMode === "card" && (
          <div className="ui three stackable cards">
            {repos.filter((repo) => {
              const matchesSearch = repo.full_name.toLowerCase().includes(
                searchQuery.toLowerCase(),
              );
              const matchesFilter = filterType === "all" ||
                (filterType === "public" && !repo.private) ||
                (filterType === "private" && repo.private) ||
                (filterType === "fork" && repo.fork);
              return matchesSearch && matchesFilter;
            }).map((repo) => {
              const status = getRepoStatus(repo.owner.login, repo.name);
              return (
                <div
                  className="card link"
                  key={repo.id}
                  onClick={() => onSelect(repo.full_name)}
                >
                  <div className="content">
                    {/* Top Row: Visibility Icon + Repo Name (Left) & Star (Right) */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.5em",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5em",
                        }}
                      >
                        <i
                          className={`icon ${repo.private ? "lock" : "globe"}`}
                          style={{
                            opacity: 0.5,
                            margin: 0,
                            lineHeight: 1,
                            height: "auto",
                          }}
                        >
                        </i>
                        <span
                          style={{
                            wordBreak: "break-all",
                            fontWeight: "bold",
                            fontSize: "1.1em",
                            lineHeight: 1,
                            color: "rgba(0,0,0,.85)",
                          }}
                        >
                          {repo.owner.login} / {repo.name}
                        </span>
                      </div>

                      <div
                        style={{
                          color: "#666",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25em",
                          flexShrink: 0,
                          marginLeft: "0.5em",
                        }}
                      >
                        <i
                          className="star icon"
                          style={{ margin: 0, lineHeight: 1, height: "auto" }}
                        >
                        </i>
                        <span style={{ lineHeight: 1 }}>
                          {repo.stargazers_count || 0}
                        </span>
                      </div>
                    </div>

                    <div className="description" style={{ marginTop: "0.5em" }}>
                      {repo.configured_branch &&
                        repo.configured_branch !== repo.default_branch &&
                        (
                          <div style={{ marginBottom: "0.5em" }}>
                            <div className="ui label tiny basic">
                              <i className="code branch icon"></i>
                              {repo.configured_branch}
                            </div>
                          </div>
                        )}
                      {repo.description?.substring(0, 100)}
                      {(repo.description?.length || 0) > 100 ? "..." : ""}
                    </div>
                    <div
                      className="meta"
                      style={{ marginTop: "1em", fontSize: "0.9em" }}
                    >
                      {repo.updated_at && (
                        <span className="date">
                          Updated{" "}
                          {new Date(repo.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="extra content">
                    <span className="right floated">
                      <button
                        type="button"
                        className="ui icon button mini basic"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSettings(repo.full_name);
                        }}
                        title="Repository Settings"
                        style={{ margin: 0 }}
                      >
                        <i className="cog icon"></i>
                      </button>
                    </span>
                    <span
                      style={{
                        display: "flex",
                        gap: "0.5em",
                        flexWrap: "wrap",
                      }}
                    >
                      {status.hasDraft && (
                        <StatusBadge status="draft" count={status.draftCount} />
                      )}
                      {status.hasPr && (
                        <StatusBadge status="pr_open" count={status.prCount} />
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {!loading && !error && viewMode === "list" && (
          <table className="ui celled striped table selectable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Visibility</th>
                <th>Updated</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {repos.filter((repo) => {
                const matchesSearch = repo.full_name.toLowerCase().includes(
                  searchQuery.toLowerCase(),
                );
                const matchesFilter = filterType === "all" ||
                  (filterType === "public" && !repo.private) ||
                  (filterType === "private" && repo.private) ||
                  (filterType === "fork" && repo.fork);
                return matchesSearch && matchesFilter;
              }).map((repo) => {
                const status = getRepoStatus(repo.owner.login, repo.name);
                return (
                  <tr
                    key={repo.id}
                    onClick={() => onSelect(repo.full_name)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <h4 className="ui image header">
                        <i className="github icon rounded mini image"></i>
                        <div className="content">
                          {repo.full_name}
                          <div className="sub header">
                            {repo.configured_branch &&
                              repo.configured_branch !== repo.default_branch &&
                              (
                                <span
                                  className="ui label tiny basic"
                                  style={{
                                    marginRight: "0.5em",
                                    fontWeight: "normal",
                                  }}
                                >
                                  <i className="code branch icon"></i>
                                  {repo.configured_branch}
                                </span>
                              )}
                            {repo.description}
                          </div>
                        </div>
                      </h4>
                    </td>
                    <td>
                      {repo.private
                        ? (
                          <div className="ui label">
                            <i className="lock icon"></i> Private
                          </div>
                        )
                        : (
                          <div className="ui label basic">
                            <i className="globe icon"></i> Public
                          </div>
                        )}
                    </td>
                    <td>
                      {repo.updated_at &&
                        new Date(repo.updated_at).toLocaleDateString()}
                    </td>
                    <td>
                      {status.hasDraft && (
                        <StatusBadge status="draft" count={status.draftCount} />
                      )}
                      {status.hasPr && (
                        <StatusBadge status="pr_open" count={status.prCount} />
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ui icon button basic small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSettings(repo.full_name);
                        }}
                        title="Settings"
                        style={{ marginRight: "0.5em" }}
                      >
                        <i className="cog icon"></i>
                      </button>
                      <button
                        type="button"
                        className="ui button basic small primary"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
