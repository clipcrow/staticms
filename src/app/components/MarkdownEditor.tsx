import React from "react";
import MDEditor from "@uiw/react-md-editor";

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
    <div className="staticms-md-editor-root" data-color-mode="light">
      {/* @ts-ignore: MDEditor type compatibility issue with Deno/React 19 */}
      <MDEditor
        value={body}
        onChange={(val: string | undefined) =>
          !isPrLocked && setBody(val || "")}
        preview={isPrLocked ? "preview" : "edit"}
        height={600}
        visibleDragbar={!isPrLocked}
        hideToolbar={isPrLocked}
      />
    </div>
  );
};
