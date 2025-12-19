import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/app/utils/fetcher.ts";

export interface CommitDateMap {
  [path: string]: { date: string; author: string } | null;
}

export function useCommitDates(
  owner: string,
  repo: string,
  paths: string[],
  branch: string = "main",
) {
  const [dates, setDates] = useState<CommitDateMap>({});
  const [loading, setLoading] = useState(false);

  // Debounce or batch logic could go here, but for now we trust the caller to pass a stable list
  // Actually, ArticleListView passes a paginated list which changes on page turn.
  // We should fetch when paths change.

  useEffect(() => {
    if (!owner || !repo || paths.length === 0) return;

    // Avoid refetching if we already have all paths?
    // Simplified: just fetch.
    let isMounted = true;
    setLoading(true);

    fetchWithAuth(`/api/repo/${owner}/${repo}/commits/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths, branch }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch dates");
        return res.json();
      })
      .then((data: CommitDateMap) => {
        if (isMounted) {
          setDates((prev) => ({ ...prev, ...data }));
          setLoading(false);
        }
      })
      .catch((e) => {
        console.error(e);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [owner, repo, branch, JSON.stringify(paths)]); // Crude equality check for paths array

  return { dates, loading };
}
