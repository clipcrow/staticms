import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Header } from "@/app/components/common/Header.tsx";
import { useRepositories } from "@/app/hooks/useRepositories.ts";
import { getRepoStatus } from "@/app/components/editor/utils.ts";
import { StatusBadge } from "@/app/components/common/StatusBadge.tsx";

export function RepositorySelector() {
  const navigate = useNavigate();
  const { repos, loading, error } = useRepositories();
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "public" | "private" | "fork"
  >("all");

  const handleSelect = (repoFullName: string) => {
    navigate(`/${repoFullName}`);
  };

  const filteredRepos = repos.filter((repo) => {
    const matchesSearch = repo.full_name.toLowerCase().includes(
      searchQuery.toLowerCase(),
    );
    const matchesFilter = filterType === "all" ||
      (filterType === "public" && !repo.private) ||
      (filterType === "private" && repo.private) ||
      (filterType === "fork" && repo.fork);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="ui container" style={{ marginTop: "2rem" }}>
      <Header
        breadcrumbs={[{ label: "Repositories" }]}
        rootLink={false}
        rightContent={
          <div style={{ display: "flex", gap: "0.5em" }}>
            <div className="ui icon buttons basic">
              <button
                type="button"
                className={`ui button ${viewMode === "card" ? "active" : ""}`}
                onClick={() => setViewMode("card")}
                title="Card View"
              >
                <i className="th icon"></i>
              </button>
              <button
                type="button"
                className={`ui button ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <i className="list icon"></i>
              </button>
            </div>
            <a
              href="https://github.com/apps/staticms" // TODO: config
              target="_blank"
              rel="noreferrer"
              className="ui button secondary"
            >
              <i className="plus icon"></i>
              Connect Repository
            </a>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="ui segment secondary form">
        <div className="fields inline" style={{ margin: 0 }}>
          <div className="twelve wide field">
            <div className="ui icon input fluid">
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="search icon"></i>
            </div>
          </div>
          <div className="four wide field">
            <select
              className="ui dropdown fluid"
              value={filterType}
              onChange={(e) =>
                setFilterType(
                  e.target.value as "all" | "public" | "private" | "fork",
                )}
            >
              <option value="all">All Types</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="fork">Forks</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="ui placeholder segment">
          <div className="ui active inverted dimmer">
            <div className="ui loader"></div>
          </div>
        </div>
      )}

      {error && <div className="ui message error">{error}</div>}

      {!loading && !error && filteredRepos.length === 0 && (
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
          {filteredRepos.map((repo) => {
            const status = getRepoStatus(repo.owner.login, repo.name);
            return (
              <div
                className="card link"
                key={repo.id}
                onClick={() => handleSelect(repo.full_name)}
              >
                <div className="content">
                  <i
                    className={`right floated icon ${
                      repo.private ? "lock" : "globe"
                    }`}
                  >
                  </i>
                  <div className="header" style={{ wordBreak: "break-all" }}>
                    {repo.owner.login} / <br />
                    {repo.name}
                  </div>
                  <div className="meta">
                    {repo.updated_at && (
                      <span className="date">
                        Updated {new Date(repo.updated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="description">
                    {repo.description?.substring(0, 100)}
                    {(repo.description?.length || 0) > 100 ? "..." : ""}
                  </div>
                </div>
                <div className="extra content">
                  <span className="right floated">
                    {status.hasDraft && (
                      <StatusBadge status="draft" count={status.draftCount} />
                    )}
                    {status.hasPr && (
                      <StatusBadge status="pr_open" count={status.prCount} />
                    )}
                  </span>
                  <span>
                    <i className="star icon"></i>
                    {repo.stargazers_count || 0}
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
            {filteredRepos.map((repo) => {
              const status = getRepoStatus(repo.owner.login, repo.name);
              return (
                <tr
                  key={repo.id}
                  onClick={() => handleSelect(repo.full_name)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <h4 className="ui image header">
                      <i className="github icon rounded mini image"></i>
                      <div className="content">
                        {repo.full_name}
                        <div className="sub header">{repo.description}</div>
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
  );
}
