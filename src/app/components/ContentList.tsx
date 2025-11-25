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
    <div className="ui container" style={{ marginTop: "2em" }}>
      <h1 className="ui header">
        <i className="cube icon"></i>
        <div className="content">
          Staticms Dashboard
          <div className="sub header">Manage your content configurations</div>
        </div>
      </h1>

      <div className="ui segment">
        <div className="ui grid">
          <div className="two column row">
            <div className="column">
              <h2 className="ui header">Contents</h2>
            </div>
            <div className="column right aligned">
              <button
                type="button"
                onClick={onAddNewContent}
                className="ui primary button"
              >
                <i className="plus icon"></i>
                Add Content
              </button>
            </div>
          </div>
        </div>

        {contents.length === 0
          ? (
            <div className="ui placeholder segment">
              <div className="ui icon header">
                <i className="file outline icon"></i>
                No content configured
              </div>
              <div className="inline">
                <div className="ui primary button" onClick={onAddNewContent}>
                  Add Content
                </div>
              </div>
            </div>
          )
          : (
            <div className="ui relaxed divided list">
              {contents.map((content, index) => (
                <div key={index} className="item" style={{ padding: "1em" }}>
                  <div className="right floated content">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditContentConfig(index);
                      }}
                      className="ui icon button"
                      title="Edit Configuration"
                    >
                      <i className="edit icon"></i>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteContent(index);
                      }}
                      className="ui icon button negative"
                      title="Delete Configuration"
                    >
                      <i className="trash icon"></i>
                    </button>
                  </div>
                  <i className="large file middle aligned icon"></i>
                  <div
                    className="content"
                    onClick={() =>
                      onSelectContent(content)}
                    style={{ cursor: "pointer" }}
                  >
                    <a className="header">
                      {content.owner}/{content.repo}
                    </a>
                    <div className="description">{content.filePath}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};
