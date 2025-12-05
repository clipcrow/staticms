import React from "react";
import { Content, Field } from "../types.ts";
import { FrontMatterItemPanel } from "./FrontMatterItemPanel.tsx";

interface FrontMatterEditorProps {
  frontMatter: Record<string, unknown>;
  setFrontMatter: (fm: Record<string, unknown>) => void;
  currentContent: Content;
  isPrLocked: boolean;
}

export const FrontMatterItemEditor: React.FC<FrontMatterEditorProps> = ({
  frontMatter,
  setFrontMatter,
  currentContent,
  isPrLocked,
}) => {
  const fields: Field[] = Object.entries(frontMatter).map(([name, value]) => ({
    name,
    value: String(value || ""),
  }));

  const handleUpdateFields = (
    _index: number,
    newFields: Field[],
  ) => {
    const newFrontMatter = newFields.reduce(
      (acc, field) => ({
        ...acc,
        [field.name]: field.value,
      }),
      {} as Record<string, unknown>,
    );
    setFrontMatter(newFrontMatter);
  };

  return (
    <div className="ui form">
      <FrontMatterItemPanel
        fields={fields}
        itemIndex={0}
        currentContent={currentContent}
        isPrLocked={isPrLocked}
        onUpdateFields={handleUpdateFields}
      />
    </div>
  );
};
