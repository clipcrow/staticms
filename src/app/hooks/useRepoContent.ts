import { useEffect, useState } from "react";

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  download_url: string | null;
}

export function useRepoContent(owner?: string, repo?: string, path?: string) {
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!owner || !repo || !path) return;

    setLoading(true);
    // Use the catch-all content API
    fetch(`/api/repo/${owner}/${repo}/contents/${path}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch content: ${res.statusText}`);
        }
        return await res.json() as GitHubFile[];
      })
      .then((data) => {
        setFiles(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      });
  }, [owner, repo, path]);

  return { files, loading, error };
}
