import { useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { ArticleList } from "@/app/features/content-browser/ArticleList.tsx";
import { SingletonEditor } from "@/app/features/editor/SingletonEditor.tsx";

export function ContentRoute() {
  const { owner, repo, collectionName } = useParams();
  // Assume collectionName corresponds to collectionName or singletonName based on config
  const { config, loading, error } = useContentConfig(owner, repo);

  if (loading) {
    return <div className="ui active centered inline loader"></div>;
  }

  if (error) {
    return (
      <div className="ui negative message">
        Error loading config: {error.message}
      </div>
    );
  }

  const def = config?.collections.find((c) => c.name === collectionName);

  if (!def) {
    return (
      <div className="ui warning message">
        Content "{collectionName}" not found in configuration.
      </div>
    );
  }

  if (def.type === "singleton") {
    return <SingletonEditor />;
  } else {
    // Default to Collection (Article List)
    return <ArticleList />;
  }
}
