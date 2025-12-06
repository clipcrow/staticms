import { Route, Routes } from "react-router-dom";
import { RepositorySelector } from "@/app/features/content-browser/RepositorySelector.tsx";
import { ContentBrowser } from "@/app/features/content-browser/ContentBrowser.tsx";

// Dependency Injection Interface
export interface AppRoutesProps {
  RepositorySelectorComponent?: React.ComponentType;
  ContentBrowserComponent?: React.ComponentType;
}

export function AppRoutes({
  RepositorySelectorComponent = RepositorySelector,
  ContentBrowserComponent = ContentBrowser,
}: AppRoutesProps) {
  return (
    <Routes>
      <Route path="/" element={<RepositorySelectorComponent />} />
      <Route
        path="/repo/:owner/:repo/*"
        element={<ContentBrowserComponent />}
      />
    </Routes>
  );
}
