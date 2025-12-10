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
}

export const ContentImages: React.FC<ContentImagesProps> = ({
  pendingImages,
  onUpload,
  onRemovePending,
  onInsert,
  folderPath,
}) => {
  const { owner, repo } = useParams();
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
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  return (
    <div>
      {/* Nearby Images Section */}
      <h4 className="ui header">Images Nearby</h4>
      <div className="ui list selection">
        {loading && <div className="ui active centered inline loader"></div>}
        {error && <div className="ui error message">{error.message}</div>}
        {!loading && images.length === 0 && (
          <div className="ui mini message">No images found.</div>
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

      {/* Pending Images Section */}
      {pendingImages.map((file) => (
        <div
          key={file.name}
          className="item"
          onClick={() => onInsert(file.name)}
          style={{ cursor: "pointer" }}
        >
          <div className="right floated content">
            <div
              className="ui button tiny basic icon"
              onClick={(e) => {
                e.stopPropagation();
                onRemovePending(file.name);
              }}
            >
              <i className="trash icon"></i>
            </div>
          </div>
          <i className="image icon orange"></i>
          <div className="content">
            <div className="header">{file.name}</div>
          </div>
        </div>
      ))}

      {/* Upload Section */}
      <div
        className="ui placeholder segment"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ minHeight: "100px", marginTop: "1em" }}
      >
        <div className="ui icon header" style={{ fontSize: "0.9rem" }}>
          <i className="upload icon" style={{ fontSize: "1.5rem" }}></i>
          Drop images here
        </div>
        <div className="ui primary tiny button">
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
    </div>
  );
};
