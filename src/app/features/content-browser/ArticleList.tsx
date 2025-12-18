import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useRepository } from "@/app/hooks/useRepositories.ts";
import {
  type Collection,
  useContentConfig,
} from "@/app/hooks/useContentConfig.ts";
import { useLoading } from "@/app/contexts/HeaderContext.tsx";
import { type GitHubFile, useRepoContent } from "@/app/hooks/useRepoContent.ts";
import { FileItem } from "@/shared/types.ts";
import { ArticleListView } from "@/app/components/content-browser/ArticleListView.tsx";
import { useArticleListServices } from "@/app/hooks/useArticleListServices.ts";

interface ArticleListProps {
  useRepositoryHook?: typeof useRepository;
  useContentConfigHook?: typeof useContentConfig;
  useRepoContentHook?: typeof useRepoContent;
  useServicesHook?: typeof useArticleListServices;
  // deno-lint-ignore no-explicit-any
  ViewComponent?: React.ComponentType<any>;
}

export function ArticleList({
  useRepositoryHook = useRepository,
  useContentConfigHook = useContentConfig,
  useRepoContentHook = useRepoContent,
  useServicesHook = useArticleListServices,
  ViewComponent = ArticleListView,
}: ArticleListProps = {}) {
  const { owner, repo, content } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const services = useServicesHook();

  const { config, loading: configLoading, error: configError } =
    useContentConfigHook(owner!, repo!);
  const { repository, loading: repoLoading } = useRepositoryHook(owner!, repo!);

  const branchConfigured = !!config?.branch;
  const branchReady = !configLoading && (branchConfigured || !repoLoading);

  const branch = config?.branch || repository?.default_branch || "main";

  // We use content as the key to find definition
  // Check valid config first, then fall back to passed state if config is loading
  const configDef = config?.collections.find((c) => c.name === content);
  const stateDef = location.state?.collectionDef as Collection | undefined;
  const collectionDef = configDef || stateDef;

  // Normalize folder path to ensure consistent matching with GitHub API paths
  let folder = collectionDef?.path || collectionDef?.folder || "";
  if (folder.startsWith("./")) folder = folder.substring(2);
  if (folder.startsWith("/")) folder = folder.substring(1);
  if (folder.endsWith("/")) folder = folder.slice(0, -1);

  const binding = collectionDef?.binding || "file";

  const { files, loading: contentLoading, error: contentError } =
    useRepoContentHook(
      branchReady ? owner : undefined,
      branchReady ? repo : undefined,
      folder,
      branch,
    );

  const [searchQuery, setSearchQuery] = useState("");
  const [newArticleName, setNewArticleName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const [localDrafts, setLocalDrafts] = useState<FileItem[]>([]);

  // Scan for local drafts
  useEffect(() => {
    if (!content) return;
    const user = localStorage.getItem("staticms_user") || "anonymous";
    const found = services.getDrafts(
      user,
      owner!,
      repo!,
      branch,
      content,
      binding,
      folder,
    );
    setLocalDrafts(found);
  }, [owner, repo, branch, content, binding, folder, services]);

  // Pagination
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Combine loading/error states for simpler prop passing
  // Ideally handled better, but for now:
  const isLoading = configLoading || !branchReady ||
    (!!folder && contentLoading);

  useLoading(isLoading);

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
      sha: "unknown",
      content: undefined,
    }));

  // Merge drafts
  // Deduplicate based on file name to be robust against path mismatches (GitHub API vs Local Config)
  // Since we are listing a specific folder, file names must be unique within this list.
  const remoteFileNames = new Set(v1Files.map((f) => f.name.toLowerCase()));

  const newDrafts = localDrafts.filter((d) =>
    !remoteFileNames.has(d.name.toLowerCase())
  );

  const allFiles = [...newDrafts, ...v1Files].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const filteredFiles = allFiles.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
  const paginatedFiles = filteredFiles.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handleCreateArticle = () => {
    if (!newArticleName.trim()) return;

    // 1. Normalize name and create slug
    let slug = newArticleName.trim();

    // Normalize slug similar to ContentEditor saves (remove illegal chars?)
    // Basic normalization:
    slug = slug.replace(/[^a-z0-9\._\-]/gi, "-").replace(/-+/g, "-");

    // Ensure extension for file binding if missing
    let fileName = slug;
    if (binding !== "directory" && !slug.toLowerCase().endsWith(".md")) {
      fileName = `${slug}.md`;
    }

    // 2. Generate Draft Key
    const user = localStorage.getItem("staticms_user") || "anonymous";
    const draftKey =
      `staticms_draft_${user}|${owner}|${repo}|${branch}|${content}/${fileName}`;

    // 3. Create Initial Draft State
    // Apply Field Defaults
    // deno-lint-ignore no-explicit-any
    const initialFrontMatter: any = { title: newArticleName };
    if (collectionDef?.fields) {
      for (const f of collectionDef.fields) {
        if (f.default !== undefined) {
          initialFrontMatter[f.name] = f.default;
        }
      }
    }

    // Apply Archetype Body
    const initialBody = collectionDef?.archetype || "";

    const initialDraft = {
      frontMatter: initialFrontMatter,
      body: initialBody,
      isDirty: true,
      updatedAt: Date.now(),
    };

    services.createDraft(draftKey, initialDraft);

    // 4. Navigate directly to edit page
    navigate(`/${owner}/${repo}/${content}/${fileName}`, {
      replace: true,
      state: { collectionDef },
    });
  };

  const handleSelectArticle = (path: string) => {
    let target = "";
    if (binding === "directory") {
      // path: content/posts/my-slug/index.md -> my-slug
      const parts = path.split("/");
      if (parts[parts.length - 1] === "index.md") {
        parts.pop();
      }
      target = parts.pop() || "";
    } else {
      // path: content/posts/foo.md -> foo.md
      target = path.split("/").pop() || "";
    }
    navigate(`/${owner}/${repo}/${content}/${target}`, {
      state: { collectionDef },
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget || !deleteTarget.sha || !deleteTarget.path) {
      alert("Cannot delete file: missing SHA or path");
      return;
    }

    try {
      await services.deleteFile(
        owner!,
        repo!,
        deleteTarget.path,
        deleteTarget.sha,
        branch,
        `Delete ${deleteTarget.name}`,
      );

      // Reload to reflect changes
      services.reloadPage();
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <ViewComponent
      owner={owner!}
      repo={repo!}
      branch={branch}
      defaultBranch={repository?.default_branch}
      collectionName={content!}
      collectionDef={collectionDef}
      files={paginatedFiles}
      loading={isLoading}
      error={combinedError}
      searchQuery={searchQuery}
      newArticleName={newArticleName}
      deleteTarget={deleteTarget}
      page={page}
      totalPages={totalPages}
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
