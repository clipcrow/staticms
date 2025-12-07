import { Route, Routes } from "react-router-dom";
import { RepositorySelector } from "@/app/features/content-browser/RepositorySelector.tsx";
import { ContentBrowser } from "@/app/features/content-browser/ContentBrowser.tsx";
import { ContentRoute } from "@/app/features/content-browser/ContentRoute.tsx";
import { ContentEditor } from "@/app/features/editor/ContentEditor.tsx";

// Dependency Injection Interface
export interface AppRoutesProps {
  RepositorySelectorComponent?: React.ComponentType;
  ContentBrowserComponent?: React.ComponentType;
  ContentRouteComponent?: React.ComponentType;
  ContentEditorComponent?: React.ComponentType<any>;
}

export function AppRoutes({
  RepositorySelectorComponent = RepositorySelector,
  ContentBrowserComponent = ContentBrowser,
  ContentRouteComponent = ContentRoute,
  ContentEditorComponent = ContentEditor,
}: AppRoutesProps) {
  return (
    <Routes>
      <Route path="/" element={<RepositorySelectorComponent />} />
      <Route
        path="/:owner/:repo"
        element={<ContentBrowserComponent />}
      />

      {/* Content Editor Routes */}
      <Route
        path="/:owner/:repo/:collectionName/new"
        element={<ContentEditorComponent mode="new" />}
      />
      <Route
        path="/:owner/:repo/:collectionName/:articleName"
        element={<ContentEditorComponent mode="edit" />}
      />

      {/* Article List / Singleton Handling */}
      <Route
        path="/:owner/:repo/:collectionName"
        element={<ContentRouteComponent />}
      />
    </Routes>
  );
}
