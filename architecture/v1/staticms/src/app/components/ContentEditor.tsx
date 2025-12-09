import React from "react";
import { Commit, Content, FileItem, PrDetails } from "../types.ts";
import { BreadcrumbItem, Header } from "./Header.tsx";
import { ContentHistory } from "./ContentHistory.tsx";
import { ContentImages } from "./ContentImages.tsx";
import { FrontMatterItemEditor } from "./FrontMatterItemEditor.tsx";
import { FrontMatterListEditor } from "./FrontMatterListEditor.tsx";
import { MarkdownEditor } from "./MarkdownEditor.tsx";

interface ContentEditorProps {
  currentContent: Content;
  body: string;
  setBody: (body: string) => void;
  frontMatter: Record<string, unknown> | Record<string, unknown>[];
  setFrontMatter: (
    fm: Record<string, unknown> | Record<string, unknown>[],
  ) => void;
  isPrLocked: boolean;
  prUrl: string | null;
  hasDraft: boolean;
  setHasDraft: (has: boolean) => void;
  draftTimestamp: number | null;
  setDraftTimestamp: (ts: number | null) => void;
  prDescription: string;
  setPrDescription: (desc: string) => void;
  pendingImages: FileItem[];
  setPendingImages: (images: FileItem[]) => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  commits: Commit[];
  onSaveContent: () => void;
  onReset: () => void;
  onBack?: () => void;
  loading: boolean;
  prDetails: PrDetails | null;
  isResetting?: boolean;
  onBackToCollection?: () => void;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  currentContent,
  body,
  setBody,
  frontMatter,
  setFrontMatter,
  isPrLocked,
  prUrl,
  hasDraft,
  setHasDraft,
  draftTimestamp,
  setDraftTimestamp,
  prDescription,
  setPrDescription,
  pendingImages,
  setPendingImages,
  hasUnsavedChanges,
  isSaving,
  commits,
  onSaveContent,
  onReset,
  onBack: _onBack,
  loading,
  prDetails,
  isResetting = false,
  onBackToCollection: _onBackToCollection,
}) => {
  const isYaml = currentContent.filePath.endsWith(".yaml") ||
    currentContent.filePath.endsWith(".yml");

  const [nearbyImages, setNearbyImages] = React.useState<FileItem[]>([]);

  const handleAddImage = (file: File) => {
    // Check for duplicates
    const isDuplicate = [...nearbyImages, ...pendingImages].some(
      (img) => img.name === file.name,
    );

    if (isDuplicate) {
      alert("An image with this name already exists.");
      return null;
    }

    const reader = new FileReader();
    return new Promise<string | null>((resolve) => {
      reader.onload = (event) => {
        const result = event.target?.result as string;
        // Extract base64 content
        const content = result.split(",")[1];

        const parts = currentContent.filePath.split("/");
        if (parts.length > 0) parts.pop();
        const dirPath = parts.join("/");
        const fullPath = dirPath ? `${dirPath}/${file.name}` : file.name;

        const newImage: FileItem = {
          name: file.name,
          path: fullPath,
          type: "file",
          sha: "pending-" + Date.now(),
          content: content,
        };

        setPendingImages([...pendingImages, newImage]);
        setHasDraft(true);
        setDraftTimestamp(Date.now());
        resolve(file.name);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  React.useEffect(() => {
    const fetchImages = async () => {
      try {
        const parts = currentContent.filePath.split("/");
        if (parts.length > 0) {
          parts.pop();
        }
        const dirPath = parts.join("/") || ".";

        const params = new URLSearchParams({
          owner: currentContent.owner,
          repo: currentContent.repo,
          filePath: dirPath,
        });
        if (currentContent.branch) {
          params.append("branch", currentContent.branch);
        }

        const res = await fetch(`/api/content?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.type === "dir" && Array.isArray(data.files)) {
            const imageFiles = data.files.filter((f: FileItem) => {
              if (f.type !== "file") return false;
              const ext = f.name.split(".").pop()?.toLowerCase();
              return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(
                ext || "",
              );
            });
            setNearbyImages(imageFiles);
          }
        }
      } catch (e) {
        console.error("Failed to fetch images", e);
      }
    };

    fetchImages();
  }, [currentContent, hasDraft]);

  const handleReset = () => {
    if (
      globalThis.confirm(
        "Are you sure you want to discard your local changes and reset to the remote content?",
      )
    ) {
      onReset();
    }
  };

  if (loading) {
    return (
      <div className="ui active dimmer">
        <div className="ui loader"></div>
      </div>
    );
  }

  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: `${currentContent.owner}/${currentContent.repo}`,
      to: `/${currentContent.owner}/${currentContent.repo}`,
    },
  ];

  if (currentContent.collectionName) {
    breadcrumbs.push({
      label: currentContent.collectionName,
      to: `/${currentContent.owner}/${currentContent.repo}/${
        encodeURIComponent(currentContent.collectionPath || "")
      }`,
    });
    let label = currentContent.name;
    if (!label) {
      const parts = currentContent.filePath.split("/");
      const fileName = parts.pop() || "";

      if (currentContent.type === "singleton-dir" && fileName === "index.md") {
        label = decodeURIComponent(parts.pop() || "");
      } else {
        label = decodeURIComponent(fileName);
        if (label.endsWith(".md")) {
          label = label.slice(0, -3);
        }
      }
    }
    breadcrumbs.push({
      label,
    });
  } else {
    let label = currentContent.name;
    if (!label) {
      label = currentContent.filePath;
      if (
        currentContent.type === "singleton-dir" && label.endsWith("/index.md")
      ) {
        label = label.slice(0, -8);
      }
    }
    breadcrumbs.push({
      label,
    });
  }

  return (
    <div className="ui container">
      <Header
        breadcrumbs={breadcrumbs}
        rightContent={
          <div style={{ display: "flex", alignItems: "center" }}>
            {isPrLocked && (
              <div
                className="ui label orange mini staticms-editor-pr-label"
                style={{ marginRight: "1em" }}
              >
                <i className="lock icon"></i>
                Local changes locked
              </div>
            )}
            <button
              type="button"
              className={`ui button tiny ${hasUnsavedChanges ? "red" : ""} ${
                isResetting ? "loading" : ""
              }`}
              onClick={handleReset}
              disabled={(!hasUnsavedChanges && !hasDraft) || loading ||
                isSaving ||
                isResetting || !!prUrl}
              title="Discard local draft"
            >
              <i className="undo icon"></i>
              Reset Draft
            </button>
          </div>
        }
      />

      <div className="ui stackable tablet reversed computer reversed grid">
        <div className="four wide column">
          {hasDraft && (
            <>
              {prUrl
                ? (
                  <div
                    className="ui message orange"
                    style={{ marginBottom: "2em" }}
                  >
                    <div className="header">
                      <i className="circle icon orange"></i>
                      PR Open
                      {prDetails && (
                        <span className="staticms-editor-pr-number">
                          #{prDetails.number}
                        </span>
                      )}
                    </div>
                    {prDetails?.body && (
                      <div className="staticms-editor-pr-body">
                        {prDetails.body}
                      </div>
                    )}
                    <a
                      href={prUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="staticms-editor-view-pr-link"
                    >
                      View Pull Request
                    </a>
                  </div>
                )
                : (
                  <div
                    className="ui message gray"
                    style={{ marginBottom: "2em" }}
                  >
                    <div className="content">
                      <div className="header staticms-editor-draft-header">
                        <i className="circle icon gray"></i>
                        Draft / PR
                      </div>
                      <div className="meta">
                        {draftTimestamp
                          ? new Date(draftTimestamp).toLocaleString()
                          : ""}
                      </div>
                      <div className="description staticms-editor-draft-description">
                        {isPrLocked && prDetails
                          ? (
                            <div className="ui feed">
                              <div className="event">
                                <div className="content">
                                  <div className="summary">
                                    <a
                                      href={prDetails.html_url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      PR #{prDetails.number}: {prDetails.title}
                                    </a>
                                    <div className="date">
                                      {new Date(prDetails.created_at)
                                        .toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div className="extra text">
                                    {prDetails.body}
                                  </div>
                                  <div className="meta">
                                    by {prDetails.user.login}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                          : (
                            <div className="ui form">
                              <div className="field">
                                <label>Description</label>
                                <textarea
                                  rows={3}
                                  value={prDescription}
                                  onChange={(e) =>
                                    setPrDescription(e.target.value)}
                                  placeholder="PR Description..."
                                />
                              </div>
                              <button
                                type="button"
                                className={`ui primary button fluid ${
                                  isSaving ? "loading" : ""
                                }`}
                                onClick={onSaveContent}
                                disabled={isSaving}
                              >
                                Create PR
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}
            </>
          )}

          <ContentImages
            currentContent={currentContent}
            isPrLocked={isPrLocked}
            pendingImages={pendingImages}
            images={nearbyImages}
            onAddImage={handleAddImage}
          />

          <div className="staticms-hide-mobile">
            <ContentHistory
              commits={commits}
              currentContent={currentContent}
            />
          </div>
        </div>

        <div className="twelve wide column">
          {Array.isArray(frontMatter)
            ? (
              <FrontMatterListEditor
                frontMatter={frontMatter}
                setFrontMatter={setFrontMatter as (
                  fm: Record<string, unknown>[],
                ) => void}
                currentContent={currentContent}
                isPrLocked={isPrLocked}
              />
            )
            : (
              <FrontMatterItemEditor
                frontMatter={frontMatter as Record<string, unknown>}
                setFrontMatter={setFrontMatter as (
                  fm: Record<string, unknown>,
                ) => void}
                currentContent={currentContent}
                isPrLocked={isPrLocked}
              />
            )}

          {!isYaml && (
            <MarkdownEditor
              body={body}
              setBody={setBody}
              isPrLocked={isPrLocked}
              currentContent={currentContent}
              onImageUpload={handleAddImage}
            />
          )}
        </div>
      </div>
    </div>
  );
};
