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
  // Allow empty string as valid path (root)
  const isReady = owner && repo && path !== undefined;
  const [loading, setLoading] = useState(!!isReady);
  const [error, setError] = useState<Error | null>(null);

  useLayoutEffect(() => {
    if (!owner || !repo || path === undefined) return;

    const controller = new AbortController();
    const signal = controller.signal;

    setLoading(true);
    setFiles([]); // Clear old content
    // Use the catch-all content API
    const endpoint = path
      ? `/api/repo/${owner}/${repo}/contents/${path}?branch=${
        encodeURIComponent(branch)
      }`
      : `/api/repo/${owner}/${repo}/contents?branch=${
        encodeURIComponent(branch)
      }`;

    fetchWithAuth(
      endpoint,
      { signal },
    )
      .then(async (res) => {
        if (res.status === 404) {
          return []; // Treat 404 as empty directory/no files
        }
        if (!res.ok) {
          throw new Error(
            `Failed to fetch content at '${path}': ${res.statusText}`,
          );
        }

        const contentType = res.headers.get("content-type");
        if (contentType && !contentType.includes("application/json")) {
          // It might be a file content if path points to file, but we usually list dirs here
          console.warn(
            `[useRepoContent] Expected JSON but got ${contentType} for path '${path}'`,
          );
          return [];
        }

        return await res.json() as GitHubFile[];
      })
      .then((data) => {
        if (!signal.aborted) {
          // If it's a single file, the API returns an object, not array.
          // We need array.
          if (!Array.isArray(data)) {
            // If we fetched a specific file, wrap it?
            // But for Tree, we usually fetch directories.
            // If path is a file, we might get object.
            setFiles([data]);
          } else {
            setFiles(data);
          }
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
