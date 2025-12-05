import React from "react";
import MDEditor from "react-md-editor";
import rehypeHighlight from "rehype-highlight";

import { Content } from "../types.ts";
import { getDraft } from "../hooks/utils.ts";

interface MarkdownEditorProps {
  body: string;
  setBody: (body: string) => void;
  isPrLocked: boolean;
  currentContent: Content;
  height?: number;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  body,
  setBody,
  isPrLocked,
  currentContent,
  height = 600,
}) => {
  const resolveImageSrc = (src: string) => {
    if (!src || src.startsWith("http") || src.startsWith("data:")) {
      return src;
    }

    // Check pending images first
    const draft = getDraft(currentContent);
    if (draft && draft.pendingImages) {
      // Normalize src to filename for comparison if it's a relative path
      const filename = src.split("/").pop();
      const pendingImage = draft.pendingImages.find((img) =>
        img.name === filename
      );
      if (pendingImage && pendingImage.content) {
        return `data:image/png;base64,${pendingImage.content}`;
      }
    }

    // Resolve relative path
    let path = src;
    if (!path.startsWith("/")) {
      // Relative to current file
      const currentDir = currentContent.filePath.split("/").slice(0, -1).join(
        "/",
      );
      // Handle ../ and ./
      const parts = (currentDir + "/" + path).split("/");
      const stack: string[] = [];
      for (const part of parts) {
        if (part === "." || part === "") continue;
        if (part === "..") {
          stack.pop();
        } else {
          stack.push(part);
        }
      }
      path = stack.join("/");
    } else {
      // Absolute path from repo root (remove leading slash)
      path = path.substring(1);
    }

    const encodedPath = encodeURIComponent(path);
    const branch = currentContent.branch || "";
    return `/api/content?owner=${currentContent.owner}&repo=${currentContent.repo}&filePath=${encodedPath}&branch=${branch}&media=true`;
  };

  return (
    <>
      {/* @ts-ignore: MDEditor type compatibility issue with Deno/React 19 */}
      <MDEditor
        data-color-mode="light"
        value={body}
        onChange={(val: string | undefined) =>
          !isPrLocked && setBody(val || "")}
        preview={isPrLocked ? "preview" : "edit"}
        previewOptions={{
          rehypePlugins: [[rehypeHighlight, {
            detect: true,
            ignoreMissing: true,
          }]],
          components: {
            img: (
              { src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>,
            ) => (
              <img
                src={src ? resolveImageSrc(src) : undefined}
                alt={alt}
                {...props}
                style={{ maxWidth: "100%" }}
              />
            ),
          },
        }}
        height={height}
        visibleDragbar={!isPrLocked}
        hideToolbar={isPrLocked}
      />
    </>
  );
};
