import React from "react";
import { Content } from "../types.ts";
import { FrontMatterItemPanel } from "./FrontMatterItemPanel.tsx";

interface FrontMatterEditorProps {
  frontMatter: Record<string, unknown>;
  setFrontMatter: (fm: Record<string, unknown>) => void;
  currentContent: Content;
  isPrLocked: boolean;
  customFields: { id: string; key: string }[];
  setCustomFields: React.Dispatch<
    React.SetStateAction<{ id: string; key: string }[]>
  >;
}

export const FrontMatterItemEditor: React.FC<FrontMatterEditorProps> = ({
  frontMatter,
  setFrontMatter,
  currentContent,
  isPrLocked,
}) => {
  const handleUpdateItem = (
    _index: number,
    newItem: Record<string, unknown>,
  ) => {
    setFrontMatter(newItem);
  };

  return (
    <div className="ui form">
      <FrontMatterItemPanel
        item={frontMatter}
        itemIndex={0}
        currentContent={currentContent}
        isPrLocked={isPrLocked}
        onUpdateItem={handleUpdateItem}
      />
    </div>
  );
};
