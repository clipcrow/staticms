import React from "react";
import MDEditor from "react-md-editor";
import rehypeHighlight from "rehype-highlight";

import { Content } from "../types.ts";

interface MarkdownEditorProps {
  body: string;
  setBody: (body: string) => void;
  isPrLocked: boolean;
  currentContent: Content;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  body,
  setBody,
  isPrLocked,
  currentContent,
}) => {
  const resolveImageSrc = (src: string) => {
    if (!src || src.startsWith("http") || src.startsWith("data:")) {
      return src;
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
        height={600}
        visibleDragbar={!isPrLocked}
        hideToolbar={isPrLocked}
      />
    </>
  );
};
