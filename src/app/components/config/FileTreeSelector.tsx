import React, { useEffect, useState } from "react";
import { useRepoContent } from "@/app/hooks/useRepoContent.ts";

interface FileTreeSelectorProps {
  owner: string;
  repo: string;
  branch?: string;
  mode: "file" | "directory";
  extensions?: string[]; // e.g. ['.md', '.yml']
  onSelect: (path: string) => void;
  selectedPath?: string;
}

interface TreeNodeProps extends FileTreeSelectorProps {
  path: string;
  level: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  owner,
  repo,
  branch,
  path,
  level,
  mode,
  extensions,
  onSelect,
  selectedPath,
}) => {
  const { files, loading, error } = useRepoContent(owner, repo, path, branch);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );

  // Auto-expand folders if they contain the selected path
  useEffect(() => {
    if (!loading && files.length > 0 && selectedPath) {
      const foldersToExpand = new Set<string>();
      files.forEach((file) => {
        if (file.type === "dir") {
          // Check if selectedPath is inside this directory
          // e.g. selected: "foo/bar/baz.md", dir: "foo" -> true
          // e.g. selected: "foo/bar/baz.md", dir: "foo/bar" -> true
          if (selectedPath.startsWith(file.path + "/")) {
            foldersToExpand.add(file.name);
          }
        }
      });

      if (foldersToExpand.size > 0) {
        setExpandedFolders((prev) => {
          const next = new Set(prev);
          foldersToExpand.forEach((f) => next.add(f));
          return next;
        });
      }
    }
  }, [files, loading, selectedPath]);

  // Sort: Directories first, then files
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "dir" ? -1 : 1;
  });

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  };

  if (loading && level === 0) {
    return (
      <div className="ui active centered inline loader small staticms-file-tree-loader">
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui negative message tiny staticms-file-tree-message">
        Error loading {path}
      </div>
    );
  }

  if (!loading && !error && files.length === 0 && level === 0) {
    return (
      <div className="ui message tiny warning staticms-file-tree-message">
        No files found.
        <br />
        <small>Check branch: {branch}</small>
      </div>
    );
  }

  return (
    <div className="staticms-file-tree-root">
      {sortedFiles.map((file) => {
        const isDir = file.type === "dir";
        const isExpanded = expandedFolders.has(file.name);
        const isSelected = file.path === selectedPath;

        // Filter files based on extensions
        if (!isDir && extensions && extensions.length > 0) {
          const ext = file.name.slice(file.name.lastIndexOf("."));
          if (!extensions.includes(ext.toLowerCase())) return null;
        }

        const isSelectable = (mode === "directory" && isDir) ||
          (mode === "file" && !isDir);

        return (
          <div key={file.path} style={{ display: "block" }}>
            <div
              className={`staticms-file-tree-row ${
                isSelected ? "selected" : ""
              }`}
              style={{
                paddingLeft: `${(level * 20) + 8}px`,
                cursor: isSelectable || isDir ? "pointer" : "default",
                userSelect: "none",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isSelectable) {
                  onSelect(file.path);
                } else if (isDir) {
                  toggleFolder(file.name);
                }
              }}
            >
              {/* Chevron */}
              <div
                className="staticms-file-tree-chevron"
                style={{
                  visibility: isDir ? "visible" : "hidden",
                }}
                onClick={(e) => {
                  if (isDir) {
                    e.stopPropagation();
                    toggleFolder(file.name);
                  }
                }}
              >
                <i
                  className={`icon chevron ${
                    isExpanded ? "down" : "right"
                  } grey small`}
                >
                </i>
              </div>

              {/* Icon */}
              <div className="staticms-file-tree-icon">
                <i
                  className={`icon ${isDir ? "folder" : "file"}`}
                  style={{ color: isDir ? "#79b8ff" : "#959da5" }}
                >
                </i>
              </div>

              <span
                className={`staticms-file-tree-text ${
                  isSelectable ? "selectable" : "default"
                }`}
              >
                {file.name}
              </span>
            </div>

            {isDir && isExpanded && (
              <TreeNode
                owner={owner}
                repo={repo}
                branch={branch}
                path={file.path}
                level={level + 1}
                mode={mode}
                extensions={extensions}
                onSelect={onSelect}
                selectedPath={selectedPath}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const FileTreeSelector: React.FC<FileTreeSelectorProps> = (props) => {
  return (
    <div className="ui segments staticms-file-tree-container">
      <div className="ui segment">
        <TreeNode {...props} path="" level={0} />
      </div>
    </div>
  );
};
