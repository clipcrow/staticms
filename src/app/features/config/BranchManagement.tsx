import { useEffect, useState } from "react";
import { Config } from "@/app/hooks/useContentConfig.ts";
import { BranchManagementForm } from "@/app/components/config/BranchManagementForm.tsx";
import { useRepository } from "@/app/hooks/useRepositories.ts";
import { useEventSource } from "@/app/hooks/useEventSource.ts";
import {
  BranchServices,
  Commit,
  useBranchServices,
} from "@/app/hooks/useBranchServices.ts";

export interface BranchManagementProps {
  owner: string;
  repo: string;
  initialConfig: Config;
  onCancel: () => void;
  onSave: () => void;
  // DI Props
  useRepositoryHook?: typeof useRepository;
  useEventSourceHook?: typeof useEventSource;
  useServicesHook?: () => BranchServices;
  ViewComponent?: typeof BranchManagementForm;
}

export function BranchManagement({
  owner,
  repo,
  initialConfig,
  onCancel,
  // DI Defaults
  useRepositoryHook = useRepository,
  useEventSourceHook = useEventSource,
  useServicesHook = useBranchServices,
  ViewComponent = BranchManagementForm,
}: BranchManagementProps) {
  const [config, setConfig] = useState<Config>(
    JSON.parse(JSON.stringify(initialConfig)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { repository } = useRepositoryHook(owner, repo);
  const services = useServicesHook();

  const [unmergedCommits, setUnmergedCommits] = useState<Commit[]>([]);
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

    // Default branch is guaranteed string here
    services.getUnmergedCommits(
      owner,
      repo,
      defaultBranch,
      targetBranch as string,
    )
      .then(setUnmergedCommits);
  }, [repository, owner, repo, refreshKey, config.branch, services]);

  // Real-time updates: Refresh unmerged commits when a PR is updated (e.g. merged)
  useEventSourceHook("/api/events", (data) => {
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
        const exists = await services.checkBranchExists(
          owner,
          repo,
          branchName,
        );
        if (!exists) {
          if (
            services.confirm(
              `Branch '${branchName}' does not exist. Do you want to create it?`,
            )
          ) {
            await services.createBranch(owner, repo, branchName);
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

      await services.saveConfig(owner, repo, newConfig);

      services.alert("Target branch switched successfully.");
      setRefreshKey((prev) => prev + 1);
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
      services.alert((e as Error).message);
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

      const pr = await services.createPr(
        owner,
        repo,
        prTitle,
        config.branch,
        defaultBranch,
      );

      services.alert(`Pull Request created successfully!\n${pr.html_url}`);
      services.open(pr.html_url);

      setPrTitle("");
    } catch (e) {
      console.error(e);
      services.alert((e as Error).message);
    } finally {
      setCreatingPr(false);
    }
  };

  return (
    <div className="repo-config-editor">
      {error && <div className="error-message">{error}</div>}
      <ViewComponent
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
