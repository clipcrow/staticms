import React, { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContentConfig } from "../hooks/useContentConfig.ts";
import { ContentEditorWrapper } from "./ContentEditorWrapper.tsx";
import { ArticleListWrapper } from "./ArticleListWrapper.tsx";
import { Content } from "../types.ts";

export const ContentDispatcher: React.FC = () => {
  const { owner, repo, contentId, articleId } = useParams<{
    owner: string;
    repo: string;
    contentId: string;
    articleId?: string;
  }>();
  const navigate = useNavigate();
  const { contents, configLoading } = useContentConfig();

  // Decode contentId (filePath)
  const decodedPath = useMemo(() => {
    return contentId ? decodeURIComponent(contentId) : "";
  }, [contentId]);

  const currentContent = useMemo(() => {
    if (!contents.length || !owner || !repo || !decodedPath) return null;
    return contents.find(
      (c) => c.owner === owner && c.repo === repo && c.filePath === decodedPath,
    ) || null;
  }, [contents, owner, repo, decodedPath]);

  useEffect(() => {
    if (!configLoading && !currentContent && contents.length > 0) {
      // Content not found
      // Maybe show 404 or redirect?
    }
  }, [configLoading, currentContent, contents]);

  if (configLoading) {
    return <div className="ui active centered inline loader"></div>;
  }

  if (!currentContent) {
    return (
      <div className="ui container">
        <div className="ui negative message">
          <div className="header">Content Not Found</div>
          <p>
            The content at <code>{decodedPath}</code>{" "}
            could not be found in the configuration.
          </p>
          <button
            type="button"
            className="ui button"
            onClick={() => navigate(`/${owner}/${repo}`)}
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  // If articleId is present, we are editing an article in a collection
  if (articleId) {
    const decodedArticlePath = decodeURIComponent(articleId);

    // Construct a virtual content object for the article
    const articleContent: Content = {
      ...currentContent,
      filePath: decodedArticlePath,
      name: undefined, // Let the editor figure out the name from path
      type: "singleton", // It's a single file now
      collectionName: currentContent.name || currentContent.filePath,
      collectionPath: currentContent.filePath,
      collectionType: currentContent.type,
      // Fields are inherited from the collection config
      fields: currentContent.fields,
    };

    return <ContentEditorWrapper content={articleContent} />;
  }

  // If it's a collection and no articleId, show Article List
  if (
    currentContent.type === "collection-files" ||
    currentContent.type === "collection-dirs"
  ) {
    return <ArticleListWrapper content={currentContent} />;
  }

  // If it's a singleton, show Editor
  return <ContentEditorWrapper content={currentContent} />;
};
