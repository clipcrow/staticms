import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Content } from "../types.ts";
import { useCollection } from "../hooks/useCollection.ts";
import { ArticleList } from "./ArticleList.tsx";

interface ArticleListWrapperProps {
  content: Content;
}

export const ArticleListWrapper: React.FC<ArticleListWrapperProps> = ({
  content,
}) => {
  const navigate = useNavigate();
  const {
    files,
    loading,
    error,
    fetchFiles,
    createArticle,
    isCreating,
  } = useCollection(content);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleBack = () => {
    navigate(`/${content.owner}/${content.repo}`);
  };

  const handleSelectArticle = (path: string) => {
    // Navigate to article editor
    // We use the full path as the ID, encoded
    // The URL structure: /:owner/:repo/:collectionId/:articleId
    const encodedCollectionId = encodeURIComponent(content.filePath);
    const encodedArticleId = encodeURIComponent(path);
    navigate(
      `/${content.owner}/${content.repo}/${encodedCollectionId}/${encodedArticleId}`,
    );
  };

  return (
    <ArticleList
      contentConfig={content}
      onBack={handleBack}
      onSelectArticle={handleSelectArticle}
      files={files}
      loading={loading}
      error={error}
      createArticle={createArticle}
      isCreating={isCreating}
    />
  );
};
