import { useEffect, useState } from "react";
import yaml from "js-yaml";
import { Config } from "@/app/hooks/useContentConfig.ts";
import { BranchManagementForm } from "@/app/components/config/BranchManagementForm.tsx";
import { fetchWithAuth } from "@/app/utils/fetcher.ts";
import { useRepository } from "@/app/hooks/useRepositories.ts";
import { useEventSource } from "@/app/hooks/useEventSource.ts";

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

  const [prTitle, setPrTitle] = useState("");
  const [creatingPr, setCreatingPr] = useState(false);

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

  // Real-time updates: Refresh unmerged commits when a PR is updated (e.g. merged)
  useEventSource("/api/events", (data) => {
    if (data.type === "pr_update") {
      // Optimistically refresh for any PR update, as it might affect the branch diff
      // Ideally we should check if data.owner/repo matches, but payloads might be minimal.
      // Refreshing is cheap enough.
      console.log("Received PR update, refreshing branch status...");
      setRefreshKey((prev) => prev + 1);
    }
  });

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

  const handleCreatePr = async () => {
    if (!prTitle || !repository || !config.branch) return;
    setCreatingPr(true);
    try {
      const defaultBranch = repository.default_branch;
      if (!defaultBranch) throw new Error("Default branch not found");

      const res = await fetchWithAuth(`/api/repo/${owner}/${repo}/pulls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: prTitle,
          head: config.branch,
          base: defaultBranch,
          body: "Created from Staticms Branch Management",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create PR");
      }

      const pr = await res.json();
      alert(`Pull Request created successfully!\n${pr.html_url}`);
      globalThis.open(pr.html_url, "_blank");

      setPrTitle("");
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    } finally {
      setCreatingPr(false);
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
        prTitle={prTitle}
        onPrTitleChange={setPrTitle}
        onCreatePr={handleCreatePr}
        creatingPr={creatingPr}
      />
    </div>
  );
}
