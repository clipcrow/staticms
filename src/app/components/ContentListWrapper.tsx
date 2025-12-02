import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContentConfig } from "../hooks/useContentConfig.ts";
import { ContentList } from "./ContentList.tsx";
import { Content } from "../types.ts";

export const ContentListWrapper: React.FC = () => {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const { contents, configLoading } = useContentConfig();
  const [loadingItemIndex, setLoadingItemIndex] = React.useState<number | null>(
    null,
  );

  const filteredContents = useMemo(() => {
    if (!owner || !repo) return [];
    return contents.filter((c) => c.owner === owner && c.repo === repo);
  }, [contents, owner, repo]);

  const handleEditContentConfig = (index: number) => {
    const content = filteredContents[index];
    if (content) {
      const encodedPath = encodeURIComponent(content.filePath);
      navigate(`/${owner}/${repo}/edit?path=${encodedPath}`);
    }
  };

  const handleSelectContent = async (content: Content, index: number) => {
    setLoadingItemIndex(index);
    try {
      const encodedPath = encodeURIComponent(content.filePath);
      const branch = content.branch || "";

      const res = await fetch(
        `/api/content?owner=${content.owner}&repo=${content.repo}&filePath=${encodedPath}&branch=${branch}`,
      );

      if (!res.ok) {
        throw new Error("Failed to fetch content");
      }

      const data = await res.json();

      if (
        content.type === "collection-files" ||
        content.type === "collection-dirs"
      ) {
        navigate(`/${owner}/${repo}/collection/${encodedPath}`, {
          state: { initialData: data },
        });
      } else {
        navigate(`/${owner}/${repo}/singleton/${encodedPath}`, {
          state: { initialData: data },
        });
      }
    } catch (e) {
      console.error("Error fetching content:", e);
      alert("Failed to load content. Please try again.");
    } finally {
      setLoadingItemIndex(null);
    }
  };

  const handleAddNewContentToRepo = () => {
    navigate(`/${owner}/${repo}/add`);
  };

  const handleChangeRepo = () => {
    navigate("/");
  };

  if (configLoading) {
    return <div className="ui active centered inline loader"></div>;
  }

  if (!owner || !repo) {
    return <div>Invalid Repository</div>;
  }

  return (
    <ContentList
      contents={filteredContents}
      selectedRepo={`${owner}/${repo}`}
      onEditContentConfig={handleEditContentConfig}
      onSelectContent={handleSelectContent}
      onAddNewContentToRepo={handleAddNewContentToRepo}
      loadingItemIndex={loadingItemIndex}
      onChangeRepo={handleChangeRepo}
    />
  );
};
