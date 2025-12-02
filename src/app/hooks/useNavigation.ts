import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Content, ViewState } from "../types.ts";

export const useNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingContentIndex, setLoadingContentIndex] = useState<number | null>(
    null,
  );

  const currentContent = (location.state as { currentContent?: Content })
    ?.currentContent || null;

  const setCurrentContent = (content: Content | null) => {
    navigate(location.pathname, {
      state: { ...location.state, currentContent: content },
      replace: true,
    });
  };

  const setView = (view: ViewState) => {
    let path = "/";
    switch (view) {
      case "content-settings":
        path = "/settings";
        break;
      case "article-list":
        path = "/articles";
        break;
      case "content-editor":
        path = "/editor";
        break;
      case "content-list":
      default:
        path = "/";
        break;
    }
    navigate(path, { state: { currentContent } });
  };

  let view: ViewState = "content-list";
  if (location.pathname.startsWith("/settings")) view = "content-settings";
  else if (location.pathname.startsWith("/articles")) view = "article-list";
  else if (location.pathname.startsWith("/editor")) view = "content-editor";

  return {
    view,
    setView,
    currentContent,
    setCurrentContent,
    loadingContentIndex,
    setLoadingContentIndex,
  };
};
