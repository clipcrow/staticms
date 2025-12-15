import React from "react";
import { useParams } from "react-router-dom";
import { useRepoContent } from "@/app/hooks/useRepoContent.ts";
import { FileItem } from "@/shared/types.ts";

interface ContentImagesProps {
  pendingImages: FileItem[];
  onUpload: (files: FileList) => void;
  onRemovePending: (name: string) => void;

  folderPath: string;
  branch: string;
}

export const ContentImages: React.FC<ContentImagesProps> = ({
  pendingImages,
  onUpload,
  onRemovePending,

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

  const [previewFile, setPreviewFile] = React.useState<
    {
      name: string;
      url: string;
    } | null
  >(null);

  const handleDragStart = (e: React.DragEvent, filename: string) => {
    e.dataTransfer.setData("text/plain", `![${filename}](${filename})`);
    e.dataTransfer.effectAllowed = "copy";
  };

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

  const handleImageClick = (name: string) => {
    if (!owner || !repo) return;
    const path = folderPath ? `${folderPath}/${name}` : name;
    // Construct API URL for image content
    const url = `/api/repo/${owner}/${repo}/contents/${path}?branch=${branch}`;
    setPreviewFile({ name, url });
  };

  const handleClosePreview = () => {
    setPreviewFile(null);
  };

  // Resolve pending image content for preview
  const getPendingImageUrl = (file: FileItem) => {
    if (file.content) {
      return `data:image/png;base64,${file.content}`;
    }
    return "";
  };

  const handlePendingImageClick = (file: FileItem) => {
    const url = getPendingImageUrl(file);
    if (url) {
      setPreviewFile({ name: file.name, url });
    }
  };

  return (
    <>
      <div className="ui fluid" style={{ boxShadow: "none", border: "none" }}>
        <div
          className="content header-segment"
          style={{
            background: "transparent",
            borderBottom: "none",
            paddingLeft: 0,
          }}
        >
          <div className="header" style={{ fontSize: "1em" }}>
            Images Nearby
          </div>
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
                  onClick={() => handleImageClick(file.name)}
                  draggable
                  onDragStart={(e) =>
                    handleDragStart(e, file.name)}
                  style={{
                    cursor: "grab",
                    padding: "0.75em 1em",
                    borderBottom: "none",
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
                  onClick={() => handlePendingImageClick(file)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file.name)}
                  style={{
                    cursor: "grab",
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
                      {file.name}
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
          style={{
            borderTop: "none",
            paddingTop: "1rem",
          }}
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

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="ui dimmer modals page transition visible active"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={handleClosePreview}
        >
          <div
            className="ui modal transition visible active"
            style={{
              top: "auto",
              left: "auto",
              position: "relative",
              width: "auto",
              maxWidth: "60vw",
              maxHeight: "90vh",
              margin: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <i className="close icon" onClick={handleClosePreview}></i>
            <div className="header">{previewFile.name}</div>
            <div
              className="image content"
              style={{ justifyContent: "center", overflow: "hidden" }}
            >
              <img
                src={previewFile.url}
                className="ui image fluid"
                style={{ maxHeight: "60vh", objectFit: "contain" }}
                alt={previewFile.name}
              />
            </div>
            <div className="actions">
              <div className="ui primary button" onClick={handleClosePreview}>
                Close
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
