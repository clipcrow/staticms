import React from "react";
import { Commit, Content } from "../types.ts";

interface ContentHistoryProps {
  commits: Commit[];
  currentContent: Content;
}

export const ContentHistory: React.FC<ContentHistoryProps> = ({
  commits,
  currentContent,
}) => {
  return (
    <div style={{ marginBottom: "2em" }}>
      <h4 className="ui header" style={{ marginTop: 0 }}>History</h4>
      <div className="ui feed">
        {commits.slice(0, 10).map((commit) => (
          <div key={commit.sha} className="event">
            <div className="content">
              <div className="summary">
                <a href={commit.html_url} target="_blank" rel="noreferrer">
                  {commit.message}
                </a>
                <div className="date">
                  {new Date(commit.date).toLocaleDateString()}
                </div>
              </div>
              <div className="meta">
                by {commit.author}
              </div>
            </div>
          </div>
        ))}
        {commits.length > 10 && (
          <div className="event">
            <div className="content">
              <div className="summary">
                <a
                  href={`https://github.com/${currentContent.owner}/${currentContent.repo}/commits/${
                    currentContent.branch || "main"
                  }/${currentContent.filePath}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  More...
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
