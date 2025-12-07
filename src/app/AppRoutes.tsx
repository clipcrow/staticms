import { Route, Routes } from "react-router-dom";
import { RepositorySelector } from "@/app/features/content-browser/RepositorySelector.tsx";
import { ContentBrowser } from "@/app/features/content-browser/ContentBrowser.tsx";
import { ContentRoute } from "@/app/features/content-browser/ContentRoute.tsx";

// Dependency Injection Interface
export interface AppRoutesProps {
  RepositorySelectorComponent?: React.ComponentType;
  ContentBrowserComponent?: React.ComponentType;
  ContentRouteComponent?: React.ComponentType;
}

export function AppRoutes({
  RepositorySelectorComponent = RepositorySelector,
  ContentBrowserComponent = ContentBrowser,
  ContentRouteComponent = ContentRoute,
}: AppRoutesProps) {
  return (
    <Routes>
      <Route path="/" element={<RepositorySelectorComponent />} />
      <Route
        path="/:owner/:repo"
        element={<ContentBrowserComponent />}
      />
      <Route
        path="/:owner/:repo/:collectionName"
        element={<ContentRouteComponent />}
      />
    </Routes>
  );
}
