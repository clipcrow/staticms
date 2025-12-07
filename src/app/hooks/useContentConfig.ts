import { useEffect, useState } from "react";
import yaml from "js-yaml";

export interface Field {
  name: string;
  label: string;
  widget: string;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

export interface Collection {
  name: string;
  label: string;
  folder?: string;
  files?: Array<{ name: string; file: string; label: string }>;
  fields?: Field[];
  type?: "collection" | "singleton";
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

export interface Config {
  collections: Collection[];
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

export function useContentConfig(owner?: string, repo?: string) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!owner || !repo) return;

    setLoading(true);
    // Updated to fetch from Deno KV config endpoint
    fetch(`/api/repo/${owner}/${repo}/config`)
      .then(async (res) => {
        if (!res.ok) {
          // For now, if 404, we might want to return default or error
          throw new Error(`Failed to fetch config: ${res.statusText}`);
        }
        const text = await res.text();
        try {
          return yaml.load(text) as Config;
        } catch (_e) {
          throw new Error("Failed to parse YAML config");
        }
      })
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      });
  }, [owner, repo]);

  return { config, loading, error };
}
