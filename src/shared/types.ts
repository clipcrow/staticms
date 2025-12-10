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
