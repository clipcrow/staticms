import { Content, Draft } from "./types.ts";

// Retrieve the logged‑in username saved by useAuth
export const getUsername = (): string => {
  return localStorage.getItem("staticms_user") ?? "";
};

export const getDraftKey = (content: Content, username?: string) => {
  const user = username || getUsername();
  return `draft_${user}|${content.owner}|${content.repo}|${
    content.branch || ""
  }|${content.filePath}`;
};

export const getDraft = (content: Content, username?: string): Draft | null => {
  const key = getDraftKey(content, username);
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as Draft;
  } catch (e) {
    console.error("Failed to parse draft", e);
    return null;
  }
};

export interface ContentStatus {
  hasDraft: boolean;
  hasPr: boolean;
  draftCount: number;
  prCount: number;
}
