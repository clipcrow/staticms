import React from "react";
import { Route, Routes } from "react-router-dom";
import { RepositorySelector } from "@/app/features/content-browser/RepositorySelector.tsx";
import { ContentBrowser } from "@/app/features/content-browser/ContentBrowser.tsx";
import { ContentRoute } from "@/app/features/content-browser/ContentRoute.tsx";
import { ContentEditor } from "@/app/features/editor/ContentEditor.tsx";
import { ConfigPage } from "@/app/features/config/ConfigPage.tsx";
import { BranchManagementPage } from "@/app/features/config/BranchManagementPage.tsx";
import { RequireAuth } from "@/app/features/auth/RequireAuth.tsx";
import { NotFound } from "@/app/components/common/NotFound.tsx";
import { MainLayout } from "@/app/components/layout/MainLayout.tsx";

import { ConfigDebugger } from "@/app/features/debug/ConfigDebugger.tsx";

// Dependency Injection Interface
export interface AppRoutesProps {
  RepositorySelectorComponent?: React.ElementType;
  ContentBrowserComponent?: React.ElementType;
  ContentRouteComponent?: React.ElementType;
  ContentEditorComponent?: React.ElementType;
  ConfigPageComponent?: React.ElementType;
  BranchManagementPageComponent?: React.ElementType;
  ConfigDebuggerComponent?: React.ElementType;
}

export function AppRoutes({
  RepositorySelectorComponent = RepositorySelector,
  ContentBrowserComponent = ContentBrowser,
  ContentRouteComponent = ContentRoute,
  ContentEditorComponent = ContentEditor,
  ConfigPageComponent: _ConfigPageComponent = ConfigPage,
  BranchManagementPageComponent: _BranchManagementPageComponent =
    BranchManagementPage,
  ConfigDebuggerComponent = ConfigDebugger,
}: AppRoutesProps) {
  return (
    <Routes>
      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route
          path="/"
          element={<RepositorySelectorComponent />}
        />

        <Route
          path="/:owner/:repo/debug"
          element={<ConfigDebuggerComponent />}
        />

        <Route
          path="/:owner/:repo"
          element={<ContentBrowserComponent />}
        />

        {/* Content Routes (Article List or Singleton Editor) */}
        <Route
          path="/:owner/:repo/:content"
          element={<ContentRouteComponent />}
        />

        {/* Article Editor Route */}
        <Route
          path="/:owner/:repo/:content/:article"
          element={<ContentEditorComponent mode="edit" />}
        />
      </Route>

      {/* Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
