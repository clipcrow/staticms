import { useLayoutEffect, useState } from "react";
import { fetchWithAuth } from "@/app/utils/fetcher.ts";

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  download_url: string | null;
}

export function useRepoContent(
  owner?: string,
  repo?: string,
  path?: string,
  branch: string = "main",
) {
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [loading, setLoading] = useState(!!(owner && repo && path));
  const [error, setError] = useState<Error | null>(null);

  useLayoutEffect(() => {
    if (!owner || !repo || !path) return;

    const controller = new AbortController();
    const signal = controller.signal;

    setLoading(true);
    setFiles([]); // Clear old content
    // Use the catch-all content API
    fetchWithAuth(
      `/api/repo/${owner}/${repo}/contents/${path}?branch=${
        encodeURIComponent(branch)
      }`,
      { signal },
    )
      .then(async (res) => {
        if (res.status === 404) {
          return []; // Treat 404 as empty directory/no files, suppressing error for new content
        }
        if (!res.ok) {
          throw new Error(
            `Failed to fetch content at '${path}': ${res.statusText}`,
          );
        }

        const contentType = res.headers.get("content-type");
        if (contentType && !contentType.includes("application/json")) {
          console.warn(
            `[useRepoContent] Expected JSON but got ${contentType} for path '${path}'`,
          );
          return [];
        }

        return await res.json() as GitHubFile[];
      })
      .then((data) => {
        if (!signal.aborted) {
          setFiles(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (signal.aborted) return;
        console.error(e);
        setError(e);
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [owner, repo, path, branch]);

  return { files, loading, error };
}
