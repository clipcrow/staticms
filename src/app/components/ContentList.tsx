import React from "react";
import { Content } from "../types.ts";

interface ContentListProps {
  contents: Content[];
  onEditContentConfig: (index: number) => void;
  onDeleteContent: (index: number) => void;
  onSelectContent: (content: Content) => void;
  onAddNewContent: () => void;
}

export const ContentList: React.FC<ContentListProps> = ({
  contents,
  onEditContentConfig,
  onDeleteContent,
  onSelectContent,
  onAddNewContent,
}) => {
  return (
    <div className="app-container dashboard">
      <div className="dashboard-content">
        <header className="dashboard-header">
          <h1 className="title gradient-text">Staticms Dashboard</h1>
        </header>

        <div className="card info-card">
          <div className="info-header">
            <h2>Contents</h2>
            <button
              type="button"
              onClick={onAddNewContent}
              className="btn btn-primary btn-sm"
            >
              + Add Content
            </button>
          </div>
          {contents.length === 0
            ? (
              <div className="empty-state">
                No content configured. Click "Add Content" to get started.
              </div>
            )
            : (
              <ul className="content-list">
                {contents.map((content, index) => (
                  <li key={index} className="content-item">
                    <div
                      className="content-info"
                      onClick={() =>
                        onSelectContent(content)}
                    >
                      <span className="repo-name">
                        {content.owner}/{content.repo}
                      </span>
                      <span className="file-path">{content.filePath}</span>
                    </div>
                    <div className="content-actions">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditContentConfig(index);
                        }}
                        className="btn-icon edit-icon"
                        title="Edit Configuration"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteContent(index);
                        }}
                        className="btn-icon delete-icon"
                        title="Delete Configuration"
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>
    </div>
  );
};
