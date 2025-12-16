import { useState } from "react";
import type { Collection } from "@/app/hooks/useContentConfig.ts";
import { useNavigate } from "react-router-dom";
import { CollectionList } from "@/app/components/content-browser/CollectionList.tsx";

interface ContentListProps {
  collections: Collection[];
  owner: string;
  repo: string;
  branch?: string;
  defaultBranch?: string;
}

export function ContentList(
  { collections, owner, repo, branch, defaultBranch }: ContentListProps,
) {
  const navigate = useNavigate();

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
      defaultBranch={defaultBranch}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSelect={handleSelectContent}
      onSettings={handleSettingsClick}
      onAdd={handleAddNewContent}
    />
  );
}
