import React, { useEffect, useState } from "react";
import { Content, FileItem } from "../types.ts";

interface ContentImagesProps {
  currentContent: Content;
}

export const ContentImages: React.FC<ContentImagesProps> = ({
  currentContent,
}) => {
  const [images, setImages] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchImages = async () => {
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
        const dirPath = parts.join("/");

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
  }, [currentContent]);

  if (loading) {
    return (
      <div className="ui segment">
        <div className="ui active centered inline loader"></div>
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <div className="ui segment">
      <h4 className="ui header">Images</h4>
      <div className="ui relaxed list">
        {images.map((img) => (
          <div key={img.sha} className="item">
            <i className="image icon"></i>
            <div className="content">
              {img.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
