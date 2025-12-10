import { useNavigate, useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { ContentConfigEditor } from "./ContentConfigEditor.tsx";
import { Header } from "@/app/components/layout/Header.tsx";

export function ConfigPage() {
  const { owner, repo, collectionName } = useParams();
  const navigate = useNavigate();
  const { config, loading, error } = useContentConfig(owner, repo);

  if (loading) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <Header
          breadcrumbs={[{ label: `${owner}/${repo}`, to: `/${owner}/${repo}` }]}
        />
        <div className="ui active centered inline loader"></div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <div className="ui negative message">
          <div className="header">Error loading configuration</div>
          <p>{error?.message || "Configuration not found"}</p>
        </div>
      </div>
    );
  }

  const isNew = collectionName === "new";
  const initialData = !isNew
    ? config.collections.find((c) => c.name === collectionName)
    : undefined;

  if (!isNew && !initialData) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <div className="ui warning message">
          Collection "{collectionName}" not found.
        </div>
      </div>
    );
  }

  const handleFinish = () => {
    // Navigate back to the content list
    navigate(`/${owner}/${repo}`);
  };

  return (
    <div className="ui container" style={{ marginTop: "2rem" }}>
      <Header
        breadcrumbs={[
          { label: `${owner}/${repo}`, to: `/${owner}/${repo}` },
          {
            label: isNew
              ? "New Content Type"
              : `Config: ${initialData?.label || collectionName}`,
          },
        ]}
      />
      <div className="ui segment">
        <ContentConfigEditor
          owner={owner!}
          repo={repo!}
          config={config}
          initialData={initialData}
          mode={isNew ? "add" : "edit"}
          onCancel={handleFinish}
          onSave={handleFinish}
        />
      </div>
    </div>
  );
}
