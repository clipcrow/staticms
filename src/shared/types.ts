export interface FileItem {
  name: string;
  type: "file" | "dir";
  content?: string; // Base64
  sha?: string;
  path?: string;
}

// Basic types allowable in FrontMatter
export type FrontMatterPrimitive =
  | string
  | number
  | boolean
  | null
  | Date
  | undefined;

// Recursive definition for FrontMatter values
export type FrontMatterValue =
  | FrontMatterPrimitive
  | FrontMatterValue[]
  | { [key: string]: FrontMatterValue };

// Standard Map structure for FrontMatter
export type FrontMatterObject = { [key: string]: FrontMatterValue };

// Array root structure for YAML List
export type FrontMatterList = FrontMatterObject[];

export type FrontMatterContent = FrontMatterObject | FrontMatterList;

export interface Draft {
  frontMatter: FrontMatterContent;
  body: string;
  pendingImages?: FileItem[];
  pr?: {
    number: number;
    url: string;
    state?: string;
  };
  updatedAt?: number;
  isDirty?: boolean;
}

// === Moved from app/components/editor/types.ts ===

export interface Field {
  name: string;
  value: string;
  defaultValue?: string;
}

export interface Content {
  owner: string;
  repo: string;
  branch?: string;
  filePath: string;
  name?: string;
  type?:
    | "singleton-file"
    | "singleton-dir"
    | "collection-files"
    | "collection-dirs";
  fields: Field[];
  collectionName?: string;
  collectionPath?: string;
  archetype?: string;
}

export interface Config {
  contents: Content[];
}

export interface Commit {
  message: string;
  author: string;
  date: string;
  sha: string;
  html_url: string;
  added: string[];
  modified: string[];
  removed: string[];
}

export interface PrDetails {
  state: string;
  merged: boolean;
  number: number;
  title: string;
  body: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  html_url: string;
}
