import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useRepositories } from "@/app/hooks/useRepositories.ts";
import { RepositoryList } from "@/app/components/content-browser/RepositoryList.tsx";
import { BranchManagementPage } from "@/app/features/config/BranchManagementPage.tsx";
import { useEventSource } from "@/app/hooks/useEventSource.ts";
import { useLoading } from "@/app/contexts/HeaderContext.tsx";

export function RepositorySelector() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { repos, loading, error, refresh } = useRepositories();

  // Subscribe to realtime repository updates
  useEventSource("/api/events", (event) => {
    if (event.type === "repository_update") {
      console.log("Received repository update event, refreshing list...");
      refresh();
    }
  });

  useLoading(loading);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "public" | "private" | "fork"
  >("all");

  // Query parameter handling for settings
  const settingsParam = searchParams.get("settings");
  const prevSettingsParam = useRef(settingsParam);

  useEffect(() => {
    // If returning from settings page, refresh repositories
    if (prevSettingsParam.current && !settingsParam) {
      refresh();
    }
    prevSettingsParam.current = settingsParam;
  }, [settingsParam, refresh]);

  if (settingsParam) {
    const [owner, repo] = settingsParam.split("/");
    if (owner && repo) {
      return <BranchManagementPage owner={owner} repo={repo} />;
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
      error={error}
      searchQuery={searchQuery}
      filterType={filterType}
      onSearchChange={setSearchQuery}
      onFilterTypeChange={setFilterType}
      onSelect={handleSelect}
      onSettings={handleSettings}
    />
  );
}
