import { useCallback, useState } from "react";
import { Content } from "../types.ts";

export interface FileItem {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
}

export const useArticleList = (contentConfig: Content | null): {
  files: FileItem[];
  loading: boolean;
  error: string | null;
  fetchFiles: () => Promise<void>;
  createArticle: (name: string) => string | undefined;
  isCreating: boolean;
} => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!contentConfig) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        owner: contentConfig.owner,
        repo: contentConfig.repo,
        filePath: contentConfig.filePath,
      });
      if (contentConfig.branch) {
        params.append("branch", contentConfig.branch);
      }

      const res = await fetch(`/api/content?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch files");
      }
      const data = await res.json();

      let fetchedFiles: FileItem[] = [];
      if (data.type === "dir" && Array.isArray(data.files)) {
        fetchedFiles = data.files;
      } else {
        setError("Not a directory or empty");
      }

      // Merge with drafts from localStorage
      const draftPrefix = `draft_${contentConfig.owner}|${contentConfig.repo}|${
        contentConfig.branch || ""
      }|`;
      const draftFiles: FileItem[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(draftPrefix)) {
          const path = key.substring(draftPrefix.length);

          // Check if path belongs to this collection
          if (!path.startsWith(contentConfig.filePath)) continue;

          // Determine if it's a direct child (for collection-files) or a subdir index (for collection-dirs)
          let name = "";
          let type: "file" | "dir" = "file";
          let isValidDraft = false;

          const relativePath = path.substring(contentConfig.filePath.length)
            .replace(/^\//, "");

          if (contentConfig.type === "collection-files") {
            // Expecting "filename.md"
            if (!relativePath.includes("/")) {
              name = relativePath;
              type = "file";
              isValidDraft = true;
            }
          } else if (contentConfig.type === "collection-dirs") {
            // Expecting "dirname/index.md"
            const parts = relativePath.split("/");
            if (parts.length === 2 && parts[1] === "index.md") {
              name = parts[0];
              type = "dir";
              isValidDraft = true;
            }
          }

          if (isValidDraft) {
            // Check if already exists in fetchedFiles
            const exists = fetchedFiles.some((f) => {
              if (contentConfig.type === "collection-files") {
                return f.path === path;
              }
              if (contentConfig.type === "collection-dirs") {
                return f.path === path.replace("/index.md", ""); // API returns dir path for dirs
              }
              return false;
            });

            if (!exists) {
              // Check if we already added this draft (unlikely with unique keys but good practice)
              const alreadyAdded = draftFiles.some((f) => f.name === name);
              if (!alreadyAdded) {
                draftFiles.push({
                  name,
                  path: contentConfig.type === "collection-dirs"
                    ? path.replace("/index.md", "")
                    : path,
                  type,
                  sha: `draft-${path}`,
                });
              }
            }
          }
        }
      }

      setFiles([...fetchedFiles, ...draftFiles]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [contentConfig]);

  const createArticle = useCallback((newArticleName: string) => {
    if (!contentConfig) return;
    if (!newArticleName.trim()) return;

    // Basic validation for file/folder name
    if (!/^[a-zA-Z0-9-_]+$/.test(newArticleName)) {
      throw new Error(
        "Article name can only contain letters, numbers, hyphens, and underscores.",
      );
    }

    // Check for duplicates
    const duplicate = files.some((f) => {
      if (contentConfig.type === "collection-files") {
        return f.name === `${newArticleName}.md`;
      } else if (contentConfig.type === "collection-dirs") {
        return f.name === newArticleName;
      }
      return false;
    });

    if (duplicate) {
      throw new Error("An article with this name already exists.");
    }

    setIsCreating(true);
    try {
      let path = "";
      if (contentConfig.type === "collection-files") {
        path = `${contentConfig.filePath}/${newArticleName}.md`;
      } else if (contentConfig.type === "collection-dirs") {
        path = `${contentConfig.filePath}/${newArticleName}/index.md`;
      } else {
        throw new Error("Invalid content type for article creation");
      }

      // Create draft in localStorage instead of creating file on GitHub
      const draftKey = `draft_${contentConfig.owner}|${contentConfig.repo}|${
        contentConfig.branch || ""
      }|${path}`;

      const draftData = {
        body: "",
        frontMatter: {},
        prDescription: `Create article ${newArticleName}`,
        timestamp: Date.now(),
        type: "created", // Mark as new creation
      };

      localStorage.setItem(draftKey, JSON.stringify(draftData));
      return path;
    } finally {
      setIsCreating(false);
    }
  }, [contentConfig, files]);

  return { files, loading, error, fetchFiles, createArticle, isCreating };
};
