import { useNavigate, useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { RepoConfigEditor } from "./RepoConfigEditor.tsx";
import { Header } from "@/app/components/common/Header.tsx";

export function RepoConfigPage() {
  const { owner, repo } = useParams();
  const navigate = useNavigate();
  const { config, loading, error } = useContentConfig(owner, repo);

  if (loading) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <Header
          breadcrumbs={[
            { label: `${owner}/${repo}`, to: `/${owner}/${repo}` },
            { label: "Settings" },
          ]}
        />
        <div className="ui placeholder segment">
          <div className="ui active inverted dimmer">
            <div className="ui loader"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <div className="ui negative message">
          Error loading configuration: {error?.message || "Unknown error"}
        </div>
      </div>
    );
  }

  const handleCancel = () => {
    navigate(`/${owner}/${repo}`);
  };

  const handleSave = () => {
    navigate(`/${owner}/${repo}`);
  };

  return (
    <RepoConfigEditor
      owner={owner!}
      repo={repo!}
      initialConfig={config}
      onCancel={handleCancel}
      onSave={handleSave}
    />
  );
}
