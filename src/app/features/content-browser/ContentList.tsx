import type { Collection } from "@/app/hooks/useContentConfig.ts";
import { Link, useNavigate } from "react-router-dom";
import { ContentList as V1ContentList } from "@/app/components/common/ContentList.tsx";
import { Content as V1Content } from "@/app/components/editor/types.ts";

interface ContentListProps {
  collections: Collection[];
  owner: string;
  repo: string;
}

export function ContentList({ collections, owner, repo }: ContentListProps) {
  const navigate = useNavigate();

  if (!collections || collections.length === 0) {
    return (
      <div className="ui message">
        No content definitions found in configuration.
      </div>
    );
  }

  // Adapter
  const v1Contents: V1Content[] = collections.map((c) => ({
    owner,
    repo,
    filePath: c.folder || c.file || "",
    name: c.label,
    type: c.type === "singleton" ? "singleton-file" : "collection-files", // approximation
    fields: c.fields?.map((f) => ({ name: f.name, value: "" })) || [],
    collectionName: c.name,
    collectionPath: c.folder,
    branch: "main",
  }));

  const handleSelectContent = (content: V1Content, index: number) => {
    // Navigate to /:owner/:repo/:collectionName
    navigate(`/${owner}/${repo}/${content.collectionName}`);
  };

  const handleAddNewContentToRepo = () => {
    // Navigate to Config editor to add new collection
    navigate(`/${owner}/${repo}?action=add`);
  };

  const handleEditConfig = (index: number) => {
    const col = collections[index];
    navigate(`/${owner}/${repo}?action=edit&target=${col.name}`);
  };

  return (
    <V1ContentList
      contents={v1Contents}
      selectedRepo={`${owner}/${repo}`}
      onEditContentConfig={handleEditConfig}
      onSelectContent={handleSelectContent}
      onAddNewContentToRepo={handleAddNewContentToRepo}
      loadingItemIndex={null}
    />
  );
}
