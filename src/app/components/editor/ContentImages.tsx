import React from "react";
import { useParams } from "react-router-dom";
import { useRepoContent } from "@/app/hooks/useRepoContent.ts";
import { FileItem } from "@/shared/types.ts";

interface ContentImagesProps {
  pendingImages: FileItem[];
  onUpload: (files: FileList) => void;
  onRemovePending: (name: string) => void;
  onInsert: (filename: string) => void;
  folderPath: string;
  branch: string;
}

export const ContentImages: React.FC<ContentImagesProps> = ({
  pendingImages,
  onUpload,
  onRemovePending,
  onInsert,
  folderPath,
  branch,
}) => {
  const { owner, repo } = useParams();
  // Fetch nearby images
  const { files: nearbyFiles, loading, error } = useRepoContent(
    owner,
    repo,
    folderPath,
    branch,
  );

  const images = nearbyFiles.filter((f) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext || "");
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  return (
    <div className="ui card fluid" style={{ boxShadow: "none" }}>
      <div className="content header-segment">
        <div className="header">Images</div>
      </div>

      <div className="content" style={{ padding: 0 }}>
        {/* Nearby Images Section */}
        {(loading || error || images.length > 0) && (
          <div className="ui list selection" style={{ margin: 0 }}>
            {loading && (
              <div className="item">
                <div className="ui active centered inline loader mini"></div>
              </div>
            )}
            {error && (
              <div className="item">
                <div className="ui error message mini">{error.message}</div>
              </div>
            )}
            {images.map((file) => (
              <div
                key={file.path}
                className="item"
                onClick={() => onInsert(file.name)}
                style={{
                  cursor: "pointer",
                  padding: "0.75em 1em",
                  borderBottom: "1px solid var(--color-border-muted)",
                }}
              >
                <i className="image icon"></i>
                <div className="content">
                  <div className="header" style={{ fontSize: "0.9em" }}>
                    {file.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending Images Section */}
        {pendingImages.length > 0 && (
          <div
            className="ui list selection"
            style={{
              margin: 0,
              borderTop: images.length > 0
                ? "1px solid var(--color-border-default)"
                : "none",
            }}
          >
            {pendingImages.map((file) => (
              <div
                key={file.name}
                className="item"
                onClick={() => onInsert(file.name)}
                style={{
                  cursor: "pointer",
                  padding: "0.75em 1em",
                  borderBottom: "1px solid var(--color-border-muted)",
                  backgroundColor: "#fff8c5",
                }}
              >
                <div className="right floated content">
                  <i
                    className="trash icon link"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemovePending(file.name);
                    }}
                  >
                  </i>
                </div>
                <i className="image icon orange"></i>
                <div className="content">
                  <div className="header" style={{ fontSize: "0.9em" }}>
                    {file.name} (Pending)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && images.length === 0 && pendingImages.length === 0 && (
          <div
            style={{
              padding: "2em 1em",
              textAlign: "center",
              color: "var(--color-fg-muted)",
            }}
          >
            No images found.
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div
        className="extra content"
        style={{ borderTop: "1px solid var(--color-border-default)" }}
      >
        <div
          className="ui placeholder segment"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            minHeight: "80px",
            margin: 0,
            boxShadow: "none",
            border: "1px dashed var(--color-border-default)",
          }}
        >
          <div
            className="ui icon header"
            style={{ fontSize: "0.85rem", margin: 0 }}
          >
            <i
              className="upload icon"
              style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}
            >
            </i>
            Drop images here
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <label
              htmlFor="file-upload"
              className="ui tiny button basic primary"
            >
              Select File
            </label>
            <input
              id="file-upload"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
