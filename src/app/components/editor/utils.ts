import { Content, Draft } from "./types.ts";

// Retrieve the logged‑in username saved by useAuth
export const getUsername = (): string => {
  return localStorage.getItem("staticms_user") ?? "anonymous";
};

export const getDraftKey = (content: Content, username?: string) => {
  const user = username || getUsername();
  return `draft_${user}|${content.owner}|${content.repo}|${
    content.branch || ""
  }|${content.filePath}`;
};

export const getPrKey = (content: Content, username?: string) => {
  const user = username || getUsername();
  return `pr_${user}|${content.owner}|${content.repo}|${
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

export const savePrStatus = (
  content: Content,
  prNumber: number,
  prUrl: string,
) => {
  const key = getPrKey(content);
  const value = JSON.stringify({ number: prNumber, url: prUrl });
  localStorage.setItem(key, value);
};

export interface ContentStatus {
  hasDraft: boolean;
  hasPr: boolean;
  draftCount: number;
  prCount: number;
  prNumber?: number;
}

const countByPrefix = (
  draftPrefix: string,
  prPrefix: string,
): ContentStatus => {
  let draftCount = 0;
  let prCount = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(draftPrefix)) draftCount++;
    if (key?.startsWith(prPrefix)) prCount++;
  }

  return {
    hasDraft: draftCount > 0,
    hasPr: prCount > 0,
    draftCount,
    prCount,
  };
};

export const getRepoStatus = (
  owner: string,
  repo: string,
  username?: string,
): ContentStatus => {
  const user = username || getUsername();
  if (!user) {
    return { hasDraft: false, hasPr: false, draftCount: 0, prCount: 0 };
  }

  const draftPrefix = `draft_${user}|${owner}|${repo}|`;
  const prPrefix = `pr_${user}|${owner}|${repo}|`;

  return countByPrefix(draftPrefix, prPrefix);
};

export const getContentStatus = (
  owner: string,
  repo: string,
  branch: string | undefined,
  path: string,
  isCollection: boolean,
  username?: string,
): ContentStatus => {
  const user = username || getUsername();
  if (!user) {
    return { hasDraft: false, hasPr: false, draftCount: 0, prCount: 0 };
  }

  const prefixBase = `${owner}|${repo}|${branch || ""}|${path}`;
  const draftPrefix = `draft_${user}|${prefixBase}`;
  const prPrefix = `pr_${user}|${prefixBase}`;

  if (isCollection) {
    // Collection (directory): check for prefix + "/"
    return countByPrefix(`${draftPrefix}/`, `${prPrefix}/`);
  } else {
    // Single file: check exact match
    const hasDraft = !!localStorage.getItem(draftPrefix);
    const prValue = localStorage.getItem(prPrefix);
    const hasPr = !!prValue;

    let prNumber: number | undefined;
    if (prValue) {
      try {
        const parsed = JSON.parse(prValue);
        if (typeof parsed === "object" && parsed.number) {
          prNumber = parsed.number;
        }
      } catch {
        // Ignore parse errors, treat as generic PR existence
      }
    }

    return {
      hasDraft,
      hasPr,
      draftCount: hasDraft ? 1 : 0,
      prCount: hasPr ? 1 : 0,
      prNumber,
    };
  }
};
