import React, { useState } from "react";
import { Content, FileItem } from "../types.ts";

interface ContentImagesProps {
  currentContent: Content;
  isPrLocked: boolean;
  pendingImages: FileItem[];
  images: FileItem[];
  onAddImage: (file: File) => void;
}

export const ContentImages: React.FC<ContentImagesProps> = ({
  currentContent,
  isPrLocked,
  pendingImages,
  images,
  onAddImage,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onAddImage(file);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const getImageUrl = (path: string) => {
    const encodedPath = encodeURIComponent(path);
    const branch = currentContent.branch || "";
    return `/api/content?owner=${currentContent.owner}&repo=${currentContent.repo}&filePath=${encodedPath}&branch=${branch}&media=true`;
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const allImages = [...pendingImages, ...images];

  if (allImages.length === 0) {
    // Show button even if no images
    return (
      <div
        className="ui basic segment"
        style={{ padding: 0, marginBottom: "2em" }}
      >
        <h4 className="ui header">Images Nearby</h4>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5em",
            backgroundColor: "#fafafa",
            borderRadius: "4px",
            color: "#999",
            marginBottom: "1em",
            border: "1px solid #eee",
          }}
        >
          <i
            className="image outline icon"
            style={{ marginRight: "0.5em", fontSize: "1.2em" }}
          >
          </i>
          <span>No images found nearby</span>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="image/*"
          onChange={handleFileChange}
        />
        <button
          type="button"
          className={`ui button mini basic fluid ${
            isPrLocked ? "disabled" : ""
          }`}
          onClick={() => !isPrLocked && fileInputRef.current?.click()}
          disabled={isPrLocked}
        >
          <i className="plus icon"></i>
          Add Image
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className="ui basic segment"
        style={{ padding: 0, marginBottom: "2em" }}
      >
        <h4 className="ui header">Images Nearby</h4>
        <div className="ui relaxed list">
          {allImages.map((img) => {
            const isPending = img.sha.startsWith("pending-");
            return (
              <div
                key={img.sha}
                className="item"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (isPending) {
                    // For pending images, we can preview using data URL
                    // Reconstruct data URL
                    setPreviewImage(`data:image/png;base64,${img.content}`);
                  } else {
                    setPreviewImage(getImageUrl(img.path));
                  }
                }}
              >
                <i className={`image icon ${isPending ? "yellow" : ""}`}></i>
                <div className="content">
                  {img.name}
                  {isPending && (
                    <span
                      className="ui label mini yellow basic"
                      style={{ marginLeft: "0.5em" }}
                    >
                      Pending
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="image/*"
          onChange={handleFileChange}
        />
        <button
          type="button"
          className={`ui button mini basic fluid ${
            isPrLocked ? "disabled" : ""
          }`}
          style={{ marginTop: "1em" }}
          onClick={() => !isPrLocked && fileInputRef.current?.click()}
          disabled={isPrLocked}
        >
          <i className="plus icon"></i>
          Add Image
        </button>
      </div>

      {previewImage && (
        <div
          className="ui dimmer modals page transition visible active staticms-image-preview-dimmer"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="ui modal active staticms-image-preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="image content staticms-image-preview-content">
              <i
                className="close icon staticms-image-preview-close"
                onClick={() => setPreviewImage(null)}
              />
              <img
                src={previewImage}
                alt="Preview"
                className="staticms-image-preview-image"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
