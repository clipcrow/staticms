import { useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { ArticleList } from "@/app/features/content-browser/ArticleList.tsx";
import { ContentEditor } from "@/app/features/editor/ContentEditor.tsx";
import {
  ErrorCallout,
  LoadingSpinner,
  WarningCallout,
} from "@/app/components/common/Feedback.tsx";

export function ContentRoute() {
  const { owner, repo, collectionName } = useParams();
  // Assume collectionName corresponds to collectionName or singletonName based on config
  const { config, loading, error } = useContentConfig(owner, repo);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorCallout title="Error loading config">
        {error.message}
      </ErrorCallout>
    );
  }

  const def = config?.collections.find((c) => c.name === collectionName);

  if (!def) {
    return (
      <WarningCallout>
        Content "{collectionName}" not found in configuration.
      </WarningCallout>
    );
  }

  if (def.type === "singleton" || def.type?.startsWith("singleton-")) {
    // Singleton directly renders the editor
    return <ContentEditor mode="edit" />;
  } else {
    // Default to Collection (Article List)
    return <ArticleList />;
  }
}
