import { useCallback, useState } from "react";
import { Content } from "../types.ts";

export interface FileItem {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
}

export const useArticleList = (contentConfig: Content | null) => {
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

      if (data.type === "dir" && Array.isArray(data.files)) {
        setFiles(data.files);
      } else {
        setError("Not a directory or empty");
      }
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
