import React from "react";
import { MarkdownEditor } from "@/app/components/editor/MarkdownEditor.tsx";
import { FrontMatterItemEditor } from "@/app/components/editor/FrontMatterItemEditor.tsx";
import { YamlListEditor } from "@/app/components/editor/YamlListEditor.tsx";
import { ContentImages } from "@/app/components/editor/ContentImages.tsx";
import { FrontMatterList, FrontMatterObject } from "@/shared/types.ts";
import { Collection } from "@/app/hooks/useContentConfig.ts";
import { Content as V1Content, FileItem } from "@/shared/types.ts";

export interface EditorLayoutProps {
  isLocked: boolean;
  isSynced: boolean;
  isSaving: boolean;
  prInfo?: { url: string; number: number; state: string } | null;

  draft: {
    frontMatter: FrontMatterObject | FrontMatterList;
    body: string;
    pendingImages?: FileItem[];
  };

  collection: Collection;
  currentContent: V1Content;
  isYamlMode: boolean;
  isListMode: boolean;
  folderPath: string;
  branch: string;

  onSave: () => void;
  onReset: () => void;
  onFrontMatterChange: (fm: FrontMatterObject | FrontMatterList) => void;
  onBodyChange: (body: string) => void;
  onImageUpload: (file: File) => Promise<string | null>;
  onPendingImageRemove: (name: string) => void;
  onDelete?: () => void;
  commitMessage?: string;
  onCommitMessageChange?: (message: string) => void;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  isLocked,
  isSynced,
  isSaving,
  prInfo,
  draft,
  collection,
  currentContent,
  isYamlMode,
  isListMode,
  folderPath,
  branch,
  commitMessage,
  onCommitMessageChange,
  onSave,
  onReset,
  onFrontMatterChange,
  onBodyChange,
  onImageUpload,
  onPendingImageRemove,

  onDelete,
}) => {
  return (
    <>
      <div
        className="ui container content-editor"
        style={{ marginTop: "2rem", paddingBottom: "80px" }}
      >
        <div className="ui stackable grid">
          <div className="twelve wide column">
            {isListMode
              ? (
                <YamlListEditor
                  items={draft.frontMatter as FrontMatterList}
                  onChange={onFrontMatterChange}
                  fields={collection.fields || []}
                  currentContent={currentContent}
                  isLocked={isLocked}
                />
              )
              : (
                <>
                  {/* FrontMatter Editor */}
                  {(!collection.fields || collection.fields.length === 0) && (
                    <div className="ui warning message">
                      <div className="header">No Fields Defined</div>
                      <p>
                        Please define 'fields' in your content configuration.
                      </p>
                    </div>
                  )}

                  <FrontMatterItemEditor
                    frontMatter={draft.frontMatter as FrontMatterObject}
                    setFrontMatter={onFrontMatterChange}
                    currentContent={currentContent}
                    isPrLocked={isLocked}
                  />

                  {/* Markdown Editor */}
                  {!isYamlMode && (
                    <div style={{ marginTop: "1rem" }}>
                      <MarkdownEditor
                        body={draft.body}
                        setBody={onBodyChange}
                        isPrLocked={isLocked}
                        currentContent={currentContent}
                        height={600}
                        onImageUpload={onImageUpload}
                      />
                    </div>
                  )}
                </>
              )}
          </div>
          <div className="four wide column">
            {/* Future Sidebar (History, Images) */}
            {!isYamlMode && (
              <ContentImages
                pendingImages={draft.pendingImages || []}
                onUpload={(files) => Array.from(files).forEach(onImageUpload)}
                onRemovePending={onPendingImageRemove}
                folderPath={folderPath}
                branch={branch}
              />
            )}
          </div>
        </div>
      </div>
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          backgroundColor: "var(--color-canvas-default, #fff)", // Use variable if available
          borderTop: "1px solid var(--color-border-muted, #d0d7de)",
          padding: "1rem 2rem",
          zIndex: 100,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          boxShadow: "0 -1px 3px rgba(0,0,0,0.05)",
        }}
        className="staticms-editor-footer"
      >
        {/* Actions (Left) */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button
            type="button"
            className="ui button"
            onClick={onReset}
            disabled={isSaving || isLocked || isSynced}
            title={isSynced
              ? "No changes to reset"
              : "Discard local draft and reload from server"}
          >
            Reset
          </button>

          {onCommitMessageChange !== undefined
            ? (
              <div
                className={`ui action input ${
                  commitMessage === "" ? "error" : ""
                }`}
                style={{ width: "400px" }}
              >
                <input
                  type="text"
                  placeholder="Commit message (required)"
                  value={commitMessage || ""}
                  onChange={(e) => onCommitMessageChange(e.target.value)}
                  disabled={isLocked || isSaving || isSynced}
                />
                <button
                  type="button"
                  className={`ui primary button ${isSaving ? "loading" : ""}`}
                  onClick={onSave}
                  disabled={isSaving || isLocked || !commitMessage || isSynced}
                  title={isLocked
                    ? "Editing is locked because a PR is open"
                    : isSynced
                    ? "No changes to commit"
                    : !commitMessage
                    ? "Commit message is required"
                    : "Save changes and commit"}
                >
                  <i className={prInfo ? "sync icon" : "plus icon"}></i>
                  {isLocked
                    ? "Locked (PR Open)"
                    : prInfo
                    ? "Update PR"
                    : "Create PR"}
                </button>
              </div>
            )
            : (
              <button
                type="button"
                className={`ui primary button ${isSaving ? "loading" : ""}`}
                onClick={onSave}
                disabled={isSaving || isLocked || isSynced}
                title={isLocked
                  ? "Editing is locked because a PR is open"
                  : isSynced
                  ? "No changes detected"
                  : "Save changes like a text editor"}
              >
                <i className={prInfo ? "sync icon" : "plus icon"}></i>
                {isLocked
                  ? "Locked (PR Open)"
                  : prInfo
                  ? "Update PR"
                  : "Create PR"}
              </button>
            )}
        </div>

        {/* Delete Action (Right) */}
        <div>
          {onDelete && (
            <button
              type="button"
              className={`ui button negative server-delete ${
                isSaving ? "loading" : ""
              }`}
              onClick={onDelete}
              disabled={isSaving || isLocked}
              title="Delete this article permanently"
            >
              <i className="trash icon"></i>
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  );
};
