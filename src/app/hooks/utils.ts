import { Content } from "../types.ts";

// Retrieve the logged‑in username saved by useAuth (or empty string if not set)
export const getUsername = (): string => {
  return localStorage.getItem("staticms_user") ?? "";
};

export const getPrKey = (content: Content) => {
  const user = getUsername();
  // Format: pr_<username>|<owner>|<repo>|<branch>|<filePath>
  return `pr_${user}|${content.owner}|${content.repo}|${
    content.branch || ""
  }|${content.filePath}`;
};

export const getDraftKey = (content: Content) => {
  const user = getUsername();
  // Format: draft_<username>|<owner>|<repo>|<branch>|<filePath>
  return `draft_${user}|${content.owner}|${content.repo}|${
    content.branch || ""
  }|${content.filePath}`;
};
