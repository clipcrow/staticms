export interface Field {
  name: string;
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

export interface FileItem {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
  content?: string;
}

export interface Draft {
  body?: string;
  frontMatter?: Record<string, unknown> | Record<string, unknown>[];
  prDescription?: string;
  pendingImages?: FileItem[];
  timestamp?: number;
  prUrl?: string | null;
  type?: string;
}
