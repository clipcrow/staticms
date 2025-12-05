import React, { useEffect, useState } from "react";
import { Content, FileItem } from "../types.ts";

interface ContentImagesProps {
  currentContent: Content;
  setHasDraft: (has: boolean) => void;
  setDraftTimestamp: (ts: number | null) => void;
  hasDraft: boolean;
  isPrLocked: boolean;
  pendingImages: FileItem[];
  setPendingImages: (images: FileItem[]) => void;
}

export const ContentImages: React.FC<ContentImagesProps> = ({
  currentContent,
  setHasDraft,
  setDraftTimestamp,
  hasDraft,
  isPrLocked,
  pendingImages,
  setPendingImages,
}) => {
  const [images, setImages] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Check for duplicates
      const isDuplicate = [...images, ...pendingImages].some(
        (img) => img.name === file.name,
      );

      if (isDuplicate) {
        alert("An image with this name already exists.");
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        // Extract base64 content (remove data:image/png;base64, prefix)
        const content = result.split(",")[1];

        const parts = currentContent.filePath.split("/");
        if (parts.length > 0) parts.pop();
        const dirPath = parts.join("/");
        const fullPath = dirPath ? `${dirPath}/${file.name}` : file.name;

        const newImage: FileItem = {
          name: file.name,
          path: fullPath,
          type: "file",
          sha: "pending-" + Date.now(), // Temporary SHA
          content: content, // Store content for upload
        };

        const updatedPending = [...pendingImages, newImage];
        setPendingImages(updatedPending);
        // Note: We no longer save to localStorage here.
        // The parent component (via useDraft) will save pendingImages to the single draft object.

        // Trigger draft state
        setHasDraft(true);
        setDraftTimestamp(Date.now());
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const fetchImages = async () => {
      // If we just cleared a draft (hasDraft became false), we should re-fetch to see if new images were merged
      setLoading(true);
      try {
        console.log(
          `[ContentImages] currentContent.filePath: ${currentContent.filePath}`,
        );
        console.log(
          `[ContentImages] currentContent.type: ${currentContent.type}`,
        );

        // Determine directory path
        const parts = currentContent.filePath.split("/");
        if (parts.length > 0) {
          parts.pop(); // Remove filename
        }
        const dirPath = parts.join("/") || "."; // Use "." for root directory

        console.log(`[ContentImages] Fetching images from: ${dirPath}`);

        const params = new URLSearchParams({
          owner: currentContent.owner,
          repo: currentContent.repo,
          filePath: dirPath,
        });
        if (currentContent.branch) {
          params.append("branch", currentContent.branch);
        }

        const res = await fetch(`/api/content?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.type === "dir" && Array.isArray(data.files)) {
            const imageFiles = data.files.filter((f: FileItem) => {
              if (f.type !== "file") return false;
              const ext = f.name.split(".").pop()?.toLowerCase();
              return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(
                ext || "",
              );
            });
            setImages(imageFiles);
          }
        } else {
          console.error(
            `[ContentImages] Failed to fetch images: ${res.status} ${res.statusText}`,
          );
        }
      } catch (e) {
        console.error("Failed to fetch images", e);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [currentContent, hasDraft]); // Re-fetch when hasDraft changes (e.g. after PR merge/close)

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const getImageUrl = (path: string) => {
    const encodedPath = encodeURIComponent(path);
    const branch = currentContent.branch || "";
    return `/api/content?owner=${currentContent.owner}&repo=${currentContent.repo}&filePath=${encodedPath}&branch=${branch}&media=true`;
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (loading) {
    return (
      <div className="ui basic segment" style={{ marginBottom: "2em" }}>
        <div className="ui active centered inline loader"></div>
      </div>
    );
  }

  const allImages = [...pendingImages, ...images];

  if (allImages.length === 0 && !loading) {
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
