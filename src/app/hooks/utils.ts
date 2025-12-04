import { Content, Draft } from "../types.ts";

// Retrieve the logged‑in username saved by useAuth (or empty string if not set)
export const getUsername = (): string => {
  return localStorage.getItem("staticms_user") ?? "";
};

export const getDraftKey = (content: Content) => {
  const user = getUsername();
  // Format: draft_<username>|<owner>|<repo>|<branch>|<filePath>
  return `draft_${user}|${content.owner}|${content.repo}|${
    content.branch || ""
  }|${content.filePath}`;
};

export const getDraft = (content: Content): Draft | null => {
  const key = getDraftKey(content);
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as Draft;
  } catch (e) {
    console.error("Failed to parse draft", e);
    return null;
  }
};

export const saveDraft = (content: Content, draft: Draft) => {
  const key = getDraftKey(content);
  localStorage.setItem(key, JSON.stringify(draft));
};
