import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { type GitHubFile, useRepoContent } from "@/app/hooks/useRepoContent.ts";
import { FileItem } from "@/shared/types.ts";
import { ArticleListView } from "@/app/components/content-browser/ArticleListView.tsx";

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

  // Combine loading/error states for simpler prop passing
  // Ideally handled better, but for now:
  const isLoading = configLoading || (!!folder && contentLoading);
  const combinedError = configError || contentError;

  // Filter and map files based on binding
  const v1Files: FileItem[] = files
    .filter((f: GitHubFile) => {
      if (binding === "directory") return f.type === "dir";
      // Default/File: Only markdown files
      return f.type === "file" && /\.(md|markdown|mdx)$/i.test(f.name);
    })
    .map((f: GitHubFile) => ({
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
    <ArticleListView
      owner={owner!}
      repo={repo!}
      collectionName={collectionName!}
      collectionDef={collectionDef}
      files={paginatedFiles}
      loading={isLoading}
      error={combinedError}
      viewMode={viewMode}
      searchQuery={searchQuery}
      newArticleName={newArticleName}
      deleteTarget={deleteTarget}
      page={page}
      totalPages={totalPages}
      onViewModeChange={setViewMode}
      onSearchChange={setSearchQuery}
      onNewArticleNameChange={setNewArticleName}
      onCreate={handleCreateArticle}
      onSelect={handleSelectArticle}
      onDeleteRequest={setDeleteTarget}
      onDeleteConfirm={handleDelete}
      onDeleteCancel={() => setDeleteTarget(null)}
      onPageChange={setPage}
    />
  );
}
