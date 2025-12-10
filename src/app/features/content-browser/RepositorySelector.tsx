import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useRepositories } from "@/app/hooks/useRepositories.ts";
import { RepositoryList } from "@/app/components/content-browser/RepositoryList.tsx";

export function RepositorySelector() {
  const navigate = useNavigate();
  const { repos, loading, error } = useRepositories();
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "public" | "private" | "fork"
  >("all");

  const handleSelect = (repoFullName: string) => {
    navigate(`/${repoFullName}`);
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
    />
  );
}
