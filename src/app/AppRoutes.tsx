import React from "react";
import { Route, Routes } from "react-router-dom";
import { RepositorySelector } from "@/app/features/content-browser/RepositorySelector.tsx";
import { ContentBrowser } from "@/app/features/content-browser/ContentBrowser.tsx";
import { ContentRoute } from "@/app/features/content-browser/ContentRoute.tsx";
import { ContentEditor } from "@/app/features/editor/ContentEditor.tsx";
import { ConfigPage } from "@/app/features/config/ConfigPage.tsx";
import { RequireAuth } from "@/app/features/auth/RequireAuth.tsx";
import { NotFound } from "@/app/components/common/NotFound.tsx";

// Dependency Injection Interface
export interface AppRoutesProps {
  RepositorySelectorComponent?: React.ElementType;
  ContentBrowserComponent?: React.ElementType;
  ContentRouteComponent?: React.ElementType;
  ContentEditorComponent?: React.ElementType;
  ConfigPageComponent?: React.ElementType;
}

export function AppRoutes({
  RepositorySelectorComponent = RepositorySelector,
  ContentBrowserComponent = ContentBrowser,
  ContentRouteComponent = ContentRoute,
  ContentEditorComponent = ContentEditor,
  ConfigPageComponent = ConfigPage,
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

      {/* Config Routes */}
      <Route
        path="/:owner/:repo/config/:collectionName"
        element={
          <RequireAuth>
            <ConfigPageComponent />
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

      {/* Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
