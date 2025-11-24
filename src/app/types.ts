export interface Field {
  name: string;
}

export interface Content {
  owner: string;
  repo: string;
  filePath: string;
  fields: Field[];
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
