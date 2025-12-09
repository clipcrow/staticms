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
  pr?: {
    number: number;
    url: string;
    state?: string;
  };
  updatedAt?: number;
  isDirty?: boolean;
}
