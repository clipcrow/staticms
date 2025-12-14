import { useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useRepositories } from "@/app/hooks/useRepositories.ts";
import { RepositoryList } from "@/app/components/content-browser/RepositoryList.tsx";
import { RepoConfigPage } from "@/app/features/config/RepoConfigPage.tsx";

export function RepositorySelector() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { repos, loading, error } = useRepositories();
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "public" | "private" | "fork"
  >("all");

  // Query parameter handling for settings
  const settingsParam = searchParams.get("settings");
  if (settingsParam) {
    const [owner, repo] = settingsParam.split("/");
    if (owner && repo) {
      return <RepoConfigPage owner={owner} repo={repo} />;
    }
  }

  const handleSelect = (repoFullName: string) => {
    navigate(`/${repoFullName}`);
  };

  const handleSettings = (repoFullName: string) => {
    navigate(`/?settings=${repoFullName}`);
  };

  return (
    <RepositoryList
      repos={repos}
      loading={loading}
      error={error}
      viewMode={viewMode}
      searchQuery={searchQuery}
      filterType={filterType}
      onViewModeChange={setViewMode}
      onSearchChange={setSearchQuery}
      onFilterTypeChange={setFilterType}
      onSelect={handleSelect}
      onSettings={handleSettings}
    />
  );
}
