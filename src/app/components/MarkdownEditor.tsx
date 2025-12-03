import React from "react";
import MDEditor from "react-md-editor";
import rehypeHighlight from "rehype-highlight";

interface MarkdownEditorProps {
  body: string;
  setBody: (body: string) => void;
  isPrLocked: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  body,
  setBody,
  isPrLocked,
}) => {
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
        }}
        height={600}
        visibleDragbar={!isPrLocked}
        hideToolbar={isPrLocked}
      />
    </>
  );
};
