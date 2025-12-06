import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContentConfig } from "../hooks/useContentConfig.ts";
import { ContentEditorWrapper } from "./ContentEditorWrapper.tsx";

export const SingletonEditorRoute: React.FC = () => {
  const { owner, repo, contentId } = useParams<{
    owner: string;
    repo: string;
    contentId: string;
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

  const contentToRender = useMemo(() => {
    if (!currentContent) return null;
    if (currentContent.type === "singleton-dir") {
      return {
        ...currentContent,
        filePath: `${currentContent.filePath}/index.md`,
      };
    }
    return currentContent;
  }, [currentContent]);

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

  if (!contentToRender) {
    return null; // Should be handled by !currentContent check above, but for type safety
  }

  return <ContentEditorWrapper content={contentToRender} />;
};
