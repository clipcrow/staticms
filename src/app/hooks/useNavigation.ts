import { useState } from "react";
import { Content, ViewState } from "../types.ts";

export const useNavigation = () => {
  const [view, setView] = useState<ViewState>("content-list");
  const [currentContent, setCurrentContent] = useState<Content | null>(null);
  const [loadingContentIndex, setLoadingContentIndex] = useState<number | null>(
    null,
  );

  return {
    view,
    setView,
    currentContent,
    setCurrentContent,
    loadingContentIndex,
    setLoadingContentIndex,
  };
};
