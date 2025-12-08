import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { useRepoContent } from "@/app/hooks/useRepoContent.ts";
import { FileItem } from "@/app/components/editor/types.ts";
import { Header } from "@/app/components/common/Header.tsx";
import { ContentListItem } from "@/app/components/common/ContentListItem.tsx";
import { getContentStatus } from "@/app/components/editor/utils.ts";
import { StatusBadge } from "@/app/components/common/StatusBadge.tsx";

export function ArticleList() {
  const { owner, repo, collectionName } = useParams();
  const navigate = useNavigate();
  const { config, loading: configLoading, error: configError } =
    useContentConfig(owner, repo);

  // We use collectionName as the key to find definition
  const collectionDef = config?.collections.find((c) =>
    c.name === collectionName
  );
  const folder = collectionDef?.path || collectionDef?.folder;
  const binding = collectionDef?.binding || "file";

  const { files, loading: contentLoading, error: contentError } =
    useRepoContent(
      owner,
      repo,
      folder,
    );

  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [newArticleName, setNewArticleName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  if (configLoading || (folder && contentLoading)) {
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

  if (configError) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <div className="ui negative message">
          Error loading config: {configError.message}
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

  // Filter and map files based on binding
  // deno-lint-ignore no-explicit-any
  const v1Files: FileItem[] = files
    .filter((f: any) => {
      if (binding === "directory") return f.type === "dir";
      // Default/File: Only markdown files
      return f.type === "file" && /\.(md|markdown|mdx)$/i.test(f.name);
    })
    .map((f: any) => ({
      name: f.name,
      path: f.path,
      type: f.type,
      sha: f.sha || "unknown",
      content: undefined,
    }));

  const filteredFiles = v1Files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
  const paginatedFiles = filteredFiles.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handleCreateArticle = () => {
    if (!newArticleName.trim()) return;
    navigate(`/${owner}/${repo}/${collectionName}/new`, {
      state: { initialTitle: newArticleName },
    });
  };

  const handleSelectArticle = (path: string) => {
    // Path is usually full path e.g. "content/posts/foo.md"
    // We need just "foo.md"
    const filename = path.split("/").pop();
    navigate(`/${owner}/${repo}/${collectionName}/${filename}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !deleteTarget.sha || !deleteTarget.path) {
      alert("Cannot delete file: missing SHA or path");
      return;
    }

    try {
      const res = await fetch(
        `/api/repo/${owner}/${repo}/contents/${deleteTarget.path}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Delete ${deleteTarget.name}`,
            sha: deleteTarget.sha,
            branch: "main", // TODO: Configurable
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }

      // Reload to reflect changes
      globalThis.location.reload();
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="ui container" style={{ marginTop: "2rem" }}>
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
          </div>
        }
      />

      {/* Toolbar: Create New & Search */}
      <div className="ui segment secondary form">
        <div className="fields" style={{ margin: 0 }}>
          {/* Search */}
          <div className="eight wide field">
            <div className="ui icon input fluid">
              <input
                type="text"
                placeholder="Filter articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="search icon"></i>
            </div>
          </div>
          {/* Spacer */}
          <div className="two wide field"></div>
          {/* Create New */}
          <div className="six wide field">
            <div className="ui action input fluid">
              <input
                type="text"
                placeholder="New article name (e.g. my-post)"
                value={newArticleName}
                onChange={(e) => setNewArticleName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateArticle();
                }}
              />
              <button
                type="button"
                className="ui primary button"
                onClick={handleCreateArticle}
              >
                <i className="plus icon"></i>
                Create
              </button>
            </div>
          </div>
        </div>
      </div>

      {contentError
        ? <div className="ui message error">{contentError.message}</div>
        : filteredFiles.length === 0
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
                {paginatedFiles.map((file) => {
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
                      onClick={() => handleSelectArticle(file.path || "")}
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
                              setDeleteTarget(file);
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
                {paginatedFiles.map((file) => {
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
                            setDeleteTarget(file);
                          }}
                          title="Delete Article"
                        >
                          <i className="trash icon red"></i>
                        </button>
                      }
                      onClick={() => handleSelectArticle(file.path || "")}
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
                      setPage((p) => Math.max(1, p - 1))}
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
                    className={`item ${page === totalPages ? "disabled" : ""}`}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </div>
              <div
                className="ui negative right labeled icon button"
                onClick={handleDelete}
              >
                Delete
                <i className="trash icon"></i>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
