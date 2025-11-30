import { Content } from "../types.ts";

export const getPrKey = (content: Content) => {
  return `pr_${content.owner}|${content.repo}|${
    content.branch || ""
  }|${content.filePath}`;
};

export const getDraftKey = (content: Content) => {
  return `draft_${content.owner}|${content.repo}|${
    content.branch || ""
  }|${content.filePath}`;
};
