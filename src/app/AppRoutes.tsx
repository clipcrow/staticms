import React from "react";
import { Route, Routes } from "react-router-dom";
import { RepositorySelector } from "@/app/features/content-browser/RepositorySelector.tsx";
import { ContentBrowser } from "@/app/features/content-browser/ContentBrowser.tsx";
import { ContentRoute } from "@/app/features/content-browser/ContentRoute.tsx";
import { ContentEditor } from "@/app/features/editor/ContentEditor.tsx";
import { ConfigPage } from "@/app/features/config/ConfigPage.tsx";
import { RepoConfigPage } from "@/app/features/config/RepoConfigPage.tsx";
import { RequireAuth } from "@/app/features/auth/RequireAuth.tsx";
import { NotFound } from "@/app/components/common/NotFound.tsx";

import { ConfigDebugger } from "@/app/features/debug/ConfigDebugger.tsx";

// Dependency Injection Interface
export interface AppRoutesProps {
  RepositorySelectorComponent?: React.ElementType;
  ContentBrowserComponent?: React.ElementType;
  ContentRouteComponent?: React.ElementType;
  ContentEditorComponent?: React.ElementType;
  ConfigPageComponent?: React.ElementType;
  RepoConfigPageComponent?: React.ElementType;
  ConfigDebuggerComponent?: React.ElementType;
}

export function AppRoutes({
  RepositorySelectorComponent = RepositorySelector,
  ContentBrowserComponent = ContentBrowser,
  ContentRouteComponent = ContentRoute,
  ContentEditorComponent = ContentEditor,
  ConfigPageComponent: _ConfigPageComponent = ConfigPage,
  RepoConfigPageComponent: _RepoConfigPageComponent = RepoConfigPage,
  ConfigDebuggerComponent = ConfigDebugger,
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
        path="/:owner/:repo/debug"
        element={
          <RequireAuth>
            <ConfigDebuggerComponent />
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

      {/* Content Routes (Article List or Singleton Editor) */}
      <Route
        path="/:owner/:repo/:content"
        element={
          <RequireAuth>
            <ContentRouteComponent />
          </RequireAuth>
        }
      />

      {/* Article Editor Route */}
      <Route
        path="/:owner/:repo/:content/:article"
        element={
          <RequireAuth>
            <ContentEditorComponent mode="edit" />
          </RequireAuth>
        }
      />

      {/* Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
