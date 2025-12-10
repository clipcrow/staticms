import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useRepoContent } from "@/app/hooks/useRepoContent.ts";
import { FileItem } from "@/shared/types.ts";

interface ContentImagesProps {
  pendingImages: FileItem[];
  onUpload: (files: FileList) => void;
  onRemovePending: (name: string) => void;
  onInsert: (filename: string) => void;
  folderPath: string;
}

export const ContentImages: React.FC<ContentImagesProps> = ({
  pendingImages,
  onUpload,
  onRemovePending,
  onInsert,
  folderPath,
}) => {
  const { owner, repo } = useParams();
  const [activeTab, setActiveTab] = useState<"nearby" | "pending" | "upload">(
    "nearby",
  );

  // Fetch nearby images
  const { files: nearbyFiles, loading, error } = useRepoContent(
    owner,
    repo,
    folderPath,
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
      setActiveTab("pending");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      setActiveTab("pending");
    }
  };

  return (
    <div className="ui card" style={{ width: "100%" }}>
      <div className="content">
        <div className="header">Images</div>
      </div>
      <div className="content">
        <div className="ui secondary pointing menu">
          <a
            className={`item ${activeTab === "nearby" ? "active" : ""}`}
            onClick={() => setActiveTab("nearby")}
          >
            Nearby
          </a>
          <a
            className={`item ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending
            {pendingImages.length > 0 && (
              <div className="ui label small teal left pointing">
                {pendingImages.length}
              </div>
            )}
          </a>
          <a
            className={`item ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            Upload
          </a>
        </div>

        {activeTab === "nearby" && (
          <div className="ui list selection">
            {loading && (
              <div className="ui active centered inline loader"></div>
            )}
            {error && <div className="ui error message">{error.message}</div>}
            {!loading && images.length === 0 && (
              <div className="ui message">No images found in this folder.</div>
            )}
            {images.map((file) => (
              <div
                key={file.path}
                className="item"
                onClick={() => onInsert(file.name)}
                style={{ cursor: "pointer" }}
              >
                <i className="image icon"></i>
                <div className="content">
                  <div className="header">{file.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "pending" && (
          <div className="ui list">
            {pendingImages.length === 0 && (
              <div className="ui message">No pending uploads.</div>
            )}
            {pendingImages.map((file) => (
              <div key={file.name} className="item">
                <div className="right floated content">
                  <div
                    className="ui button tiny basic icon"
                    onClick={() => onRemovePending(file.name)}
                  >
                    <i className="trash icon"></i>
                  </div>
                </div>
                <img
                  className="ui avatar image"
                  src={`data:image/png;base64,${file.content}`}
                  alt={file.name}
                />
                <div className="content">
                  <a onClick={() => onInsert(file.name)}>{file.name}</a>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "upload" && (
          <div
            className="ui placeholder segment"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="ui icon header">
              <i className="upload icon"></i>
              Drop images here
            </div>
            <div className="ui primary button">
              <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
                Add Image
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
        )}
      </div>
    </div>
  );
};
