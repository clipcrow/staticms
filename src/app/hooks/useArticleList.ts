import { useCallback, useState } from "react";
import { Content } from "../types.ts";

export interface FileItem {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
}

export const useArticleList = (contentConfig: Content) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
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

  return { files, loading, error, fetchFiles };
};
