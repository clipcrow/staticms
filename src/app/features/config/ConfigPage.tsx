import { useNavigate, useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { ContentConfigEditor } from "./ContentConfigEditor.tsx";
import { ConfigLayout } from "@/app/components/config/ConfigLayout.tsx";
import { BreadcrumbItem } from "@/app/components/common/Header.tsx";

export function ConfigPage() {
  const { owner, repo, collectionName } = useParams();
  const navigate = useNavigate();
  const { config, loading, error } = useContentConfig(owner, repo);

  const isNew = collectionName === "new";
  const initialData = (!isNew && config)
    ? config.collections.find((c) => c.name === collectionName)
    : undefined;

  const notFound = !isNew && !initialData && !loading && !error;

  const handleFinish = () => {
    // Navigate back to the content list
    navigate(`/${owner}/${repo}`);
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { label: `${owner}/${repo}`, to: `/${owner}/${repo}` },
  ];

  if (!loading && !error) {
    breadcrumbs.push({
      label: isNew
        ? "New Content Type"
        : `Config: ${initialData?.label || collectionName}`,
    });
  }

  return (
    <ConfigLayout
      breadcrumbs={breadcrumbs}
      loading={loading}
      error={error}
      notFound={notFound}
      notFoundMessage={`Collection "${collectionName}" not found.`}
    >
      {config && (
        <ContentConfigEditor
          owner={owner!}
          repo={repo!}
          config={config}
          initialData={initialData}
          mode={isNew ? "add" : "edit"}
          onCancel={handleFinish}
          onSave={handleFinish}
        />
      )}
    </ConfigLayout>
  );
}
