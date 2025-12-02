import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContentConfig } from "../hooks/useContentConfig.ts";
import { ContentList } from "./ContentList.tsx";
import { Content } from "../types.ts";

export const ContentListWrapper: React.FC = () => {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const { contents, configLoading } = useContentConfig();

  const filteredContents = useMemo(() => {
    if (!owner || !repo) return [];
    return contents.filter((c) => c.owner === owner && c.repo === repo);
  }, [contents, owner, repo]);

  const handleEditContentConfig = (index: number) => {
    const content = filteredContents[index];
    if (content) {
      const encodedPath = encodeURIComponent(content.filePath);
      navigate(`/${owner}/${repo}/settings?filePath=${encodedPath}`);
    }
  };

  const handleSelectContent = (content: Content) => {
    const encodedPath = encodeURIComponent(content.filePath);
    navigate(`/${owner}/${repo}/${encodedPath}`);
  };

  const handleAddNewContentToRepo = () => {
    navigate(`/${owner}/${repo}/settings`);
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
      loadingItemIndex={null} // We don't track loading index here anymore, or we could add local state
      onChangeRepo={handleChangeRepo}
    />
  );
};
