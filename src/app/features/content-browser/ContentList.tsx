import { useState } from "react";
import type { Collection } from "@/app/hooks/useContentConfig.ts";
import { useNavigate } from "react-router-dom";
import { CollectionList } from "@/app/components/content-browser/CollectionList.tsx";
import { useRepository } from "@/app/hooks/useRepositories.ts";

interface ContentListProps {
  collections: Collection[];
  owner: string;
  repo: string;
  branch?: string;
}

export function ContentList(
  { collections, owner, repo, branch }: ContentListProps,
) {
  const navigate = useNavigate();
  const { repository } = useRepository(owner, repo);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [searchQuery, setSearchQuery] = useState("");

  const handleAddNewContent = () => {
    navigate("?settings");
  };

  const handleSelectContent = (collection: Collection) => {
    navigate(collection.name, { state: { collectionDef: collection } });
  };

  const handleSettingsClick = (collectionName: string) => {
    navigate(`?settings=${collectionName}`);
  };

  return (
    <CollectionList
      collections={collections}
      owner={owner}
      repo={repo}
      branch={branch}
      defaultBranch={repository?.default_branch}
      viewMode={viewMode}
      searchQuery={searchQuery}
      onViewModeChange={setViewMode}
      onSearchChange={setSearchQuery}
      onSelect={handleSelectContent}
      onSettings={handleSettingsClick}
      onAdd={handleAddNewContent}
    />
  );
}
