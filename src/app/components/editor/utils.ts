import yaml from "js-yaml";
import { Content } from "@/shared/types.ts";
import { Draft } from "@/shared/types.ts";

export function parseFrontMatter(text: string) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (match) {
    try {
      // deno-lint-ignore no-explicit-any
      const data = yaml.load(match[1]) as any;
      // Normalize: Remove the first newline (system separator) only.
      // Standard format "\n---\n\nBody" results in match[2] starting with "\n".
      return { data, content: match[2].replace(/^(\r?\n)/, "") };
    } catch (e) {
      console.warn("Failed to parse YAML frontmatter", e);
    }
  }
  if (text.startsWith("---")) {
    const parts = text.split("---");
    if (parts.length >= 3) {
      try {
        // deno-lint-ignore no-explicit-any
        const data = yaml.load(parts[1]) as any;
        const content = parts.slice(2).join("---").replace(/^(\r?\n)/, "");
        return { data, content };
      } catch (e) {
        console.warn(e);
      }
    }
  }
  return { data: {}, content: text };
}

// Retrieve the logged‑in username saved by useAuth
export const getUsername = (): string => {
  return localStorage.getItem("staticms_user") ?? "anonymous";
};

export const getDraftKey = (content: Content, username?: string) => {
  const user = username || getUsername();
  return `staticms_draft_${user}|${content.owner}|${content.repo}|${
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
  prNumber?: number;
}

const scanStorage = (prefix: string): ContentStatus => {
  let draftCount = 0;
  let prCount = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      // deno-lint-ignore no-explicit-any
      const val = JSON.parse(raw) as any;
      if (val.isDirty) draftCount++;
      if (val.pr) prCount++;
    } catch {
      // ignore
    }
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

  const prefix = `staticms_draft_${user}|${owner}|${repo}|`;
  return scanStorage(prefix);
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

  const keyBase = `staticms_draft_${user}|${owner}|${repo}|${
    branch || ""
  }|${path}`;

  if (isCollection) {
    // Collection (directory): check for prefix + "/"
    return scanStorage(keyBase + "/");
  } else {
    // Single file
    const saved = localStorage.getItem(keyBase);
    if (!saved) {
      return { hasDraft: false, hasPr: false, draftCount: 0, prCount: 0 };
    }

    try {
      // deno-lint-ignore no-explicit-any
      const val = JSON.parse(saved) as any;
      const hasDraft = !!val.isDirty;
      const hasPr = !!val.pr;
      return {
        hasDraft,
        hasPr,
        draftCount: hasDraft ? 1 : 0,
        prCount: hasPr ? 1 : 0,
        prNumber: val.pr?.number,
      };
    } catch {
      return { hasDraft: false, hasPr: false, draftCount: 0, prCount: 0 };
    }
  }
};
