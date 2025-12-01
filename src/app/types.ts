export interface Field {
  name: string;
}

export interface Content {
  owner: string;
  repo: string;
  branch?: string;
  filePath: string;
  name?: string;
  type?: "singleton" | "collection-files" | "collection-dirs";
  fields: Field[];
  collectionName?: string;
  collectionPath?: string;
  collectionType?: "singleton" | "collection-files" | "collection-dirs";
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

export type ViewState =
  | "content-list"
  | "content-editor"
  | "content-settings"
  | "repository-settings"
  | "article-list";
