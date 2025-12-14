import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/app/utils/fetcher.ts";

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  private: boolean;
  description: string | null;
  updated_at?: string;
  stargazers_count?: number;
  fork?: boolean;
  configured_branch?: string;
  default_branch?: string;
}

export function useRepositories() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth("/api/repositories");
      if (!response.ok) throw new Error("Failed to fetch repositories");
      const data = await response.json();
      setRepos(data);
      setError(null);
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  useEffect(() => {
    const eventSource = new EventSource("/api/events");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "repository_update") {
          fetchRepos();
        }
      } catch (e) {
        console.error("Error parsing SSE event", e);
      }
    };
    return () => {
      eventSource.close();
    };
  }, [fetchRepos]);

  return { repos, loading, error, refresh: fetchRepos };
}

export function useRepository(owner?: string, repo?: string) {
  const [repository, setRepository] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!owner || !repo) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    fetchWithAuth(`/api/repo/${owner}/${repo}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch repository");
        return res.json();
      })
      .then((data) => {
        if (mounted) {
          setRepository(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (mounted) {
          console.error(e);
          setError((e as Error).message);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [owner, repo]);

  return { repository, loading, error };
}
