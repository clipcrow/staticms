export interface FileItem {
  name: string;
  type: "file" | "dir";
  content?: string; // Base64
  sha?: string;
  path?: string;
}

export interface Draft {
  frontMatter: Record<string, unknown>;
  body: string;
  pendingImages?: FileItem[];
}
