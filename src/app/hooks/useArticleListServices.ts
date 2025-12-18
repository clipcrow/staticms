import { useMemo } from "react";
import { FileItem } from "@/shared/types.ts";
import { fetchWithAuth } from "@/app/utils/fetcher.ts";

export interface ArticleListServices {
  getDrafts: (
    user: string,
    owner: string,
    repo: string,
    branch: string,
    content: string,
    binding: string,
    folder: string,
  ) => FileItem[];
  createDraft: (key: string, data: unknown) => void;
  deleteFile: (
    owner: string,
    repo: string,
    path: string,
    sha: string,
    branch: string,
    message: string,
  ) => Promise<void>;
  reloadPage: () => void;
}

export function useArticleListServices(): ArticleListServices {
  const getDrafts = (
    user: string,
    owner: string,
    repo: string,
    branch: string,
    content: string,
    binding: string,
    folder: string,
  ): FileItem[] => {
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
          // Check if extension is already present
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
    return found;
  };

  const createDraft = (key: string, data: unknown) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const deleteFile = async (
    owner: string,
    repo: string,
    path: string,
    sha: string,
    branch: string,
    message: string,
  ) => {
    const res = await fetchWithAuth(
      `/api/repo/${owner}/${repo}/contents/${path}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          sha,
          branch,
        }),
      },
    );

    if (!res.ok) {
      // deno-lint-ignore no-explicit-any
      const err = await res.json() as any;
      throw new Error(err.error || "Delete failed");
    }
  };

  const reloadPage = () => {
    globalThis.location.reload();
  };

  return useMemo(
    () => ({ getDrafts, createDraft, deleteFile, reloadPage }),
    [],
  );
}
