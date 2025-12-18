import { fetchWithAuth } from "@/app/utils/fetcher.ts";
import { Config } from "@/app/hooks/useContentConfig.ts";
import yaml from "js-yaml";

export interface PathValidationResult {
  exists: boolean;
  isDirectory: boolean;
  error?: string;
}

export function useContentConfigApi() {
  const validatePath = async (
    owner: string,
    repo: string,
    path: string,
    branch?: string,
  ): Promise<PathValidationResult> => {
    const branchParam = branch ? `?branch=${encodeURIComponent(branch)}` : "";
    // Ensure path doesn't have double slashes if path is empty/root (though typically not empty here)
    // The component logic constructed path as `${validatePath}${branchParam}`
    // We should replicate exact URL construction or cleaner.

    // Note: The original code handled singleton/directory logic before calling API.
    // Here we strictly check the PATH passed to us.
    const url = `/api/repo/${owner}/${repo}/contents/${path}${branchParam}`;

    const res = await fetchWithAuth(url);

    if (res.status === 404) {
      return { exists: false, isDirectory: false };
    }
    if (!res.ok) {
      // Return low-level error? or throw?
      // Original code threw error on !ok (except 404).
      throw new Error(`Failed to validate path: ${path}`);
    }

    const contentType = res.headers.get("content-type") || "";
    let isDirectory = false;

    if (contentType.includes("application/json")) {
      const valData = await res.json();
      if (Array.isArray(valData)) {
        isDirectory = true;
      }
    } else {
      await res.text(); // Consume body
    }

    return { exists: true, isDirectory };
  };

  const saveConfig = async (
    owner: string,
    repo: string,
    config: Config,
  ): Promise<void> => {
    const res = await fetchWithAuth(`/api/repo/${owner}/${repo}/config`, {
      method: "POST",
      headers: {
        "Content-Type": "text/yaml",
      },
      body: yaml.dump(config),
    });

    if (!res.ok) {
      throw new Error("Failed to save config");
    }
  };

  return { validatePath, saveConfig };
}
