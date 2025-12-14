import { useEffect, useState } from "react";
import yaml from "js-yaml";
import { Config } from "@/app/hooks/useContentConfig.ts";
import { BranchManagementForm } from "@/app/components/config/BranchManagementForm.tsx";
import { fetchWithAuth } from "@/app/utils/fetcher.ts";
import { useRepository } from "@/app/hooks/useRepositories.ts";

interface BranchManagementProps {
  owner: string;
  repo: string;
  initialConfig: Config;
  onCancel: () => void;
  onSave: () => void;
}

export function BranchManagement({
  owner,
  repo,
  initialConfig,
  onCancel,
  onSave: _onSave,
}: BranchManagementProps) {
  const [config, setConfig] = useState<Config>(
    JSON.parse(JSON.stringify(initialConfig)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { repository } = useRepository(owner, repo);
  // deno-lint-ignore no-explicit-any
  const [unmergedCommits, setUnmergedCommits] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!repository) return;
    const defaultBranch = repository.default_branch;
    const targetBranch = config.branch || defaultBranch;

    if (!defaultBranch || defaultBranch === targetBranch) {
      setUnmergedCommits([]);
      return;
    }

    fetchWithAuth(
      `/api/repo/${owner}/${repo}/compare?base=${defaultBranch}&head=${targetBranch}`,
    )
      .then((res) => {
        if (res.ok) return res.json();
        return { commits: [] };
      })
      .then((data) => {
        setUnmergedCommits(data.commits || []);
      })
      .catch(console.error);
  }, [repository, owner, repo, refreshKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // 0. Check Branch Existence if updated
      const branchName = config.branch?.trim();
      if (branchName && branchName !== initialConfig.branch) {
        const checkRes = await fetchWithAuth(
          `/api/repo/${owner}/${repo}/branches/${branchName}`,
        );
        if (checkRes.status === 404) {
          if (
            confirm(
              `Branch '${branchName}' does not exist. Do you want to create it?`,
            )
          ) {
            const createRes = await fetchWithAuth(
              `/api/repo/${owner}/${repo}/branches`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ branchName }),
              },
            );

            if (!createRes.ok) {
              const err = await createRes.json();
              throw new Error(err.error || "Failed to create branch");
            }
          } else {
            setSaving(false);
            return;
          }
        }
      }

      // Clean up config before saving
      const newConfig: Config = { ...config };
      if (!newConfig.branch) delete newConfig.branch;
      // Ensure collections exists
      if (!newConfig.collections) newConfig.collections = [];

      const res = await fetchWithAuth(`/api/repo/${owner}/${repo}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "text/yaml",
        },
        body: yaml.dump(newConfig),
      });

      if (!res.ok) {
        throw new Error("Failed to save repository config");
      }

      alert("Target branch switched successfully.");
      setRefreshKey((prev) => prev + 1);
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="repo-config-editor">
      {error && <div className="error-message">{error}</div>}
      <BranchManagementForm
        config={config}
        setConfig={setConfig}
        onSave={handleSubmit}
        onCancel={onCancel}
        breadcrumbs={[]}
        title={`${owner}/${repo}`}
        loading={saving}
        unmergedCommits={unmergedCommits}
      />
    </div>
  );
}
