import { useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { ArticleList } from "@/app/features/content-browser/ArticleList.tsx";
import { ContentEditor } from "@/app/features/editor/ContentEditor.tsx";
import {
  ErrorCallout,
  WarningCallout,
} from "@/app/components/common/Feedback.tsx";
import { useLoading } from "@/app/contexts/HeaderContext.tsx";

export function ContentRoute() {
  const { owner, repo, content } = useParams();
  // Assume content corresponds to collectionName or singletonName based on config
  const { config, loading, error } = useContentConfig(owner, repo);

  useLoading(loading);

  if (loading) return null;

  if (error) {
    return (
      <ErrorCallout title="Error loading config">
        {error.message}
      </ErrorCallout>
    );
  }

  const def = config?.collections.find((c) => c.name === content);

  if (!def) {
    return (
      <WarningCallout>
        Content "{content}" not found in configuration.
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
