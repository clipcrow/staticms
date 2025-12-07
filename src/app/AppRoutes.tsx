import { Route, Routes } from "react-router-dom";
import { RepositorySelector } from "@/app/features/content-browser/RepositorySelector.tsx";
import { ContentBrowser } from "@/app/features/content-browser/ContentBrowser.tsx";
import { ContentRoute } from "@/app/features/content-browser/ContentRoute.tsx";
import { ContentEditor } from "@/app/features/editor/ContentEditor.tsx";
import { RequireAuth } from "@/app/features/auth/RequireAuth.tsx";

// Dependency Injection Interface
export interface AppRoutesProps {
  RepositorySelectorComponent?: React.ComponentType;
  ContentBrowserComponent?: React.ComponentType;
  ContentRouteComponent?: React.ComponentType;
  ContentEditorComponent?: React.ComponentType<{ mode?: "new" | "edit" }>;
}

export function AppRoutes({
  RepositorySelectorComponent = RepositorySelector,
  ContentBrowserComponent = ContentBrowser,
  ContentRouteComponent = ContentRoute,
  ContentEditorComponent = ContentEditor,
}: AppRoutesProps) {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuth>
            <RepositorySelectorComponent />
          </RequireAuth>
        }
      />
      <Route
        path="/:owner/:repo"
        element={
          <RequireAuth>
            <ContentBrowserComponent />
          </RequireAuth>
        }
      />

      {/* Content Editor Routes */}
      <Route
        path="/:owner/:repo/:collectionName/new"
        element={
          <RequireAuth>
            <ContentEditorComponent mode="new" />
          </RequireAuth>
        }
      />
      <Route
        path="/:owner/:repo/:collectionName/:articleName"
        element={
          <RequireAuth>
            <ContentEditorComponent mode="edit" />
          </RequireAuth>
        }
      />

      {/* Article List / Singleton Handling */}
      <Route
        path="/:owner/:repo/:collectionName"
        element={
          <RequireAuth>
            <ContentRouteComponent />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
