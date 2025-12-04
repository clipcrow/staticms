import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Content } from "../types.ts";
import { useCollection } from "../hooks/useCollection.ts";
import { ArticleList } from "../components/ArticleList.tsx";

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

  const handleSelectArticle = async (path: string) => {
    // Encode collection and article IDs
    const encodedCollectionId = encodeURIComponent(content.filePath);

    let relativePath = path;
    if (path.startsWith(content.filePath)) {
      relativePath = path.substring(content.filePath.length);
      if (relativePath.startsWith("/")) {
        relativePath = relativePath.substring(1);
      }
    }
    const encodedArticleId = encodeURIComponent(relativePath);
    // Build API request for the article content
    const params = new URLSearchParams({
      owner: content.owner,
      repo: content.repo,
      filePath: path,
      allowMissing: "true",
    });
    if (content.branch) {
      params.append("branch", content.branch);
    }
    try {
      const res = await fetch(`/api/content?${params.toString()}`);
      let data;
      if (res.status === 404) {
        data = { error: "404" };
      } else {
        data = await res.json();
      }
      navigate(
        `/${content.owner}/${content.repo}/${encodedCollectionId}/${encodedArticleId}`,
        { state: { initialData: data } },
      );
    } catch (e) {
      console.error("Error fetching article content:", e);
      alert("Failed to load article. Please try again.");
    }
  };

  return (
    <ArticleList
      contentConfig={content}
      onSelectArticle={handleSelectArticle}
      files={files}
      loading={loading}
      error={error}
      createArticle={createArticle}
      isCreating={isCreating}
    />
  );
};
