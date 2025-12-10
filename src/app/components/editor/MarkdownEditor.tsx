import React from "react";
// import MDEditor from "react-md-editor";
const MDEditor = React.lazy(() =>
  import("react-md-editor") as unknown as Promise<
    // deno-lint-ignore no-explicit-any
    { default: React.ComponentType<any> }
  >
);
import rehypeHighlight from "rehype-highlight";

import { Content } from "@/shared/types.ts";
import { getDraft } from "./utils.ts";

interface MarkdownEditorProps {
  body: string;
  setBody: (body: string) => void;
  isPrLocked: boolean;
  currentContent: Content;
  height?: number;
  onImageUpload?: (file: File) => Promise<string | null> | null;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  body,
  setBody,
  isPrLocked,
  currentContent,
  height = 600,
  onImageUpload,
}) => {
  const insertTextAtCursor = (text: string, target: HTMLTextAreaElement) => {
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const value = target.value;
    const newValue = value.substring(0, start) + text + value.substring(end);
    setBody(newValue);
  };

  const handlePaste = async (
    event: React.ClipboardEvent<HTMLTextAreaElement>,
  ) => {
    if (!onImageUpload) return;
    const items = event.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          const fileName = await onImageUpload(file);
          if (fileName) {
            const imageMarkdown = `![${fileName}](${fileName})`;
            insertTextAtCursor(imageMarkdown, event.currentTarget);
          }
        }
      }
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    if (!onImageUpload) return;
    const files = event.dataTransfer.files;
    let hasImage = false;
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        hasImage = true;
        break;
      }
    }
    if (!hasImage) return;

    event.preventDefault();
    event.stopPropagation();

    const textarea = event.currentTarget.querySelector("textarea");

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const fileName = await onImageUpload(file);
        if (fileName) {
          const imageMarkdown = `![${fileName}](${fileName})`;
          if (textarea) {
            insertTextAtCursor(imageMarkdown, textarea);
          } else {
            // deno-lint-ignore no-explicit-any
            (setBody as any)((prev: string) => prev + "\n" + imageMarkdown);
          }
        }
      }
    }
  };

  const resolveImageSrc = (src: string) => {
    if (!src || src.startsWith("http") || src.startsWith("data:")) {
      return src;
    }

    const draft = getDraft(currentContent);
    if (draft && draft.pendingImages) {
      const filename = src.split("/").pop();
      const pendingImage = draft.pendingImages.find((img) =>
        img.name === filename
      );
      if (pendingImage && pendingImage.content) {
        return `data:image/png;base64,${pendingImage.content}`;
      }
    }

    let path = src;
    if (!path.startsWith("/")) {
      const currentDir = currentContent.filePath.split("/").slice(0, -1).join(
        "/",
      );
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
      path = path.substring(1);
    }

    const encodedPath = encodeURIComponent(path);
    const branch = currentContent.branch || "";
    return `/api/content?owner=${currentContent.owner}&repo=${currentContent.repo}&filePath=${encodedPath}&branch=${branch}&media=true`;
  };

  return (
    <>
      <React.Suspense fallback={<div className="ui active loader"></div>}>
        {/* @ts-ignore: MDEditor type compatibility issue */}
        <MDEditor
          data-color-mode="light"
          value={body}
          onChange={(val: string | undefined) =>
            !isPrLocked && setBody(val || "")}
          preview={isPrLocked ? "preview" : "edit"}
          onPaste={handlePaste}
          onDrop={handleDrop}
          previewOptions={{
            rehypePlugins: [[rehypeHighlight, {
              detect: true,
              ignoreMissing: true,
            }]],
            components: {
              img: (
                { src, alt, ...props }: React.ImgHTMLAttributes<
                  HTMLImageElement
                >,
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
      </React.Suspense>
    </>
  );
};
