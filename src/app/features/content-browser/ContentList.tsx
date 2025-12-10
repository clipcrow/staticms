import { useState } from "react";
import type { Collection } from "@/app/hooks/useContentConfig.ts";
import { useNavigate } from "react-router-dom";
import { CollectionList } from "@/app/components/content-browser/CollectionList.tsx";

interface ContentListProps {
  collections: Collection[];
  owner: string;
  repo: string;
}

export function ContentList({ collections, owner, repo }: ContentListProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [searchQuery, setSearchQuery] = useState("");

  const handleAddNewContent = () => {
    navigate(`/${owner}/${repo}/config/new`);
  };

  const handleSelectContent = (collectionName: string) => {
    navigate(`/${owner}/${repo}/${collectionName}`);
  };

  const handleSettingsClick = (collectionName: string) => {
    navigate(`/${owner}/${repo}/config/${collectionName}`);
  };

  return (
    <CollectionList
      collections={collections}
      owner={owner}
      repo={repo}
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
