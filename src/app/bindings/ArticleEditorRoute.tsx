import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContentConfig } from "../hooks/useContentConfig.ts";
import { ContentEditorWrapper } from "./ContentEditorWrapper.tsx";
import { Content } from "../types.ts";

export const ArticleEditorRoute: React.FC = () => {
  const { owner, repo, contentId, articleId } = useParams<{
    owner: string;
    repo: string;
    contentId: string;
    articleId: string;
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

  if (!articleId) {
    return <div>Invalid Article ID</div>;
  }

  const decodedArticlePath = decodeURIComponent(articleId);

  // Reconstruct full path
  let fullPath = decodedArticlePath;
  if (decodedPath) {
    const prefix = decodedPath.endsWith("/") ? decodedPath : `${decodedPath}/`;
    fullPath = `${prefix}${decodedArticlePath}`;
  }

  // Construct a virtual content object for the article
  const articleContent: Content = {
    ...currentContent,
    filePath: fullPath,
    name: undefined, // Let the editor figure out the name from path
    type: currentContent.type === "collection-dirs"
      ? "singleton-dir"
      : "singleton-file",
    collectionName: currentContent.name || currentContent.filePath,
    collectionPath: currentContent.filePath,
    // Fields are inherited from the collection config
    fields: currentContent.fields,
  };

  return <ContentEditorWrapper content={articleContent} />;
};
