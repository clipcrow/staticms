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

export function ArticleList() {
  const { owner, repo, content } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { config, loading: configLoading, error: configError } =
    useContentConfig(owner, repo);
  const { repository, loading: repoLoading } = useRepository(owner, repo);

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
    useRepoContent(
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
    const draftPrefix =
      `staticms_draft_${user}|${owner}|${repo}|${branch}|${content}/`;

    const found: FileItem[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(draftPrefix)) {
        const articleName = key.substring(draftPrefix.length);
        if (!articleName || articleName === "__new__") continue;

        // Construct path based on binding
        let path = "";
        if (binding === "directory") {
          path = folder
            ? `${folder}/${articleName}/index.md`
            : `${articleName}/index.md`;
        } else {
          // Check if extension is already present (ContentEditor saves with extension for file binding)
          const fileName = articleName.toLowerCase().endsWith(".md")
            ? articleName
            : `${articleName}.md`;
          path = folder ? `${folder}/${fileName}` : fileName;
        }
        path = path.replace("//", "/");
        if (path.startsWith("/")) {
          path = path.substring(1);
        }

        found.push({
          name: articleName,
          path: path,
          type: binding === "directory" ? "dir" : "file",
          sha: "draft",
          content: undefined,
        });
      }
    }
    setLocalDrafts(found);
  }, [owner, repo, branch, content, binding, folder]);

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
    // For file binding, ensure extension or leave as is?
    // ContentEditor usually works with the filename.
    // If user typed "hello", we treat it as slug "hello".
    // If they typed "hello.md", we treat "hello.md".
    // Let's rely on ContentEditor-like logic here or just pass the slug.
    // Actually, to make a draft, we need a key.

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

    localStorage.setItem(draftKey, JSON.stringify(initialDraft));

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
      const res = await fetch(
        `/api/repo/${owner}/${repo}/contents/${deleteTarget.path}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Delete ${deleteTarget.name}`,
            sha: deleteTarget.sha,
            branch,
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
      branch={branch}
      defaultBranch={repository?.default_branch}
      collectionName={content!}
      collectionDef={collectionDef}
      files={paginatedFiles}
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
