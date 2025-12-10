import React from "react";
import { BreadcrumbItem, Header } from "@/app/components/layout/Header.tsx";
import { MarkdownEditor } from "@/app/components/editor/MarkdownEditor.tsx";
import { FrontMatterItemEditor } from "@/app/components/editor/FrontMatterItemEditor.tsx";
import { YamlListEditor } from "@/app/components/editor/YamlListEditor.tsx";
import { ContentImages } from "@/app/components/editor/ContentImages.tsx";
import { FrontMatterList, FrontMatterObject } from "@/shared/types.ts";
import { Collection } from "@/app/hooks/useContentConfig.ts";
import {
  Content as V1Content,
  FileItem,
} from "@/app/components/editor/types.ts";

export interface EditorLayoutProps {
  breadcrumbs: BreadcrumbItem[];
  isLocked: boolean;
  isSynced: boolean;
  isSaving: boolean;
  isMerged: boolean;
  isClosed: boolean;
  fromStorage: boolean;
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

  onSave: () => void;
  onReset: () => void;
  onFrontMatterChange: (fm: FrontMatterObject | FrontMatterList) => void;
  onBodyChange: (body: string) => void;
  onImageUpload: (file: File) => Promise<string | null>;
  onPendingImageRemove: (name: string) => void;
  onImageInsert: (name: string) => void;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  breadcrumbs,
  isLocked,
  isSynced,
  isSaving,
  isMerged,
  isClosed,
  fromStorage,
  prInfo,
  draft,
  collection,
  currentContent,
  isYamlMode,
  isListMode,
  folderPath,
  onSave,
  onReset,
  onFrontMatterChange,
  onBodyChange,
  onImageUpload,
  onPendingImageRemove,
  onImageInsert,
}) => {
  return (
    <div className="ui container content-editor" style={{ marginTop: "2rem" }}>
      <Header
        breadcrumbs={breadcrumbs}
        rightContent={
          <div style={{ display: "flex", gap: "0.5em", alignItems: "center" }}>
            {prInfo && (
              <a
                href={prInfo.url}
                target="_blank"
                rel="noreferrer"
                className="ui horizontal label teal"
                title="View Pull Request on GitHub"
              >
                <i className="eye icon"></i>
                In Review (#{prInfo.number})
              </a>
            )}

            {!isSynced && (
              <div
                className="ui horizontal label orange"
                title={fromStorage
                  ? "Restored from local backup"
                  : "Unsaved local changes"}
              >
                <i className="pencil alternate icon"></i>
                {fromStorage ? "Draft Restored" : "Draft"}
              </div>
            )}

            {isMerged && !prInfo && isSynced && (
              <div
                className="ui horizontal label purple"
                title="Pull Request was merged successfully"
              >
                <i className="check circle icon"></i>
                Approved
              </div>
            )}

            {isClosed && !prInfo && isSynced && (
              <div
                className="ui horizontal label red"
                title="Pull Request was closed without merge"
              >
                <i className="times circle icon"></i>
                Declined
              </div>
            )}

            {/* Reset Button: Only show if we have local changes */}
            {!isSynced && (
              <button
                type="button"
                className="ui button negative basic compact"
                onClick={onReset}
                disabled={isSaving}
                title="Discard local draft and reload from server"
              >
                Reset
              </button>
            )}

            <button
              type="button"
              className={`ui primary button ${isSaving ? "loading" : ""}`}
              onClick={onSave}
              disabled={isSaving || isLocked || isSynced}
              title={isLocked
                ? "Editing is locked because a PR is open"
                : isSynced
                ? "No changes to save"
                : "Save changes like a text editor"}
            >
              <i className={prInfo ? "sync icon" : "plus icon"}></i>
              {isLocked
                ? "Locked (PR Open)"
                : prInfo
                ? "Update PR"
                : "Create PR"}
            </button>
          </div>
        }
      />

      <div className="ui stackable grid">
        <div
          className={isListMode ? "sixteen wide column" : "twelve wide column"}
        >
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
                    <p>Please define 'fields' in your content configuration.</p>
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
                  <div className="ui segment">
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
        {!isListMode && (
          <div className="four wide column">
            {/* Future Sidebar (History, Images) */}
            <div className="ui segment">
              <ContentImages
                pendingImages={draft.pendingImages || []}
                onUpload={(files) => Array.from(files).forEach(onImageUpload)}
                onRemovePending={onPendingImageRemove}
                onInsert={onImageInsert}
                folderPath={folderPath}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
