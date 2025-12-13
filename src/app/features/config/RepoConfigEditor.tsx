import { useState } from "react";
import yaml from "js-yaml";
import { Config } from "@/app/hooks/useContentConfig.ts";
import { RepoConfigForm } from "@/app/components/config/RepoConfigForm.tsx";

interface RepoConfigEditorProps {
  owner: string;
  repo: string;
  initialConfig: Config;
  onCancel: () => void;
  onSave: () => void;
}

export function RepoConfigEditor({
  owner,
  repo,
  initialConfig,
  onCancel,
  onSave,
}: RepoConfigEditorProps) {
  const [config, setConfig] = useState<Config>(
    JSON.parse(JSON.stringify(initialConfig)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Clean up config before saving
      const newConfig: Config = { ...config };
      if (!newConfig.branch) delete newConfig.branch;
      // Ensure collections exists
      if (!newConfig.collections) newConfig.collections = [];

      const res = await fetch(`/api/repo/${owner}/${repo}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "text/yaml",
        },
        body: yaml.dump(newConfig),
      });

      if (!res.ok) {
        throw new Error("Failed to save repository config");
      }

      onSave();
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
      <RepoConfigForm
        config={config}
        setConfig={setConfig}
        onSave={handleSubmit}
        onCancel={onCancel}
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Repositories", to: "/repositories" },
          { label: `${owner}/${repo}`, to: `/${owner}/${repo}` },
          { label: "Settings", to: `/${owner}/${repo}/settings` },
        ]}
        loading={saving}
      />
    </div>
  );
}
