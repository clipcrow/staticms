import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Collection, useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { useDraft } from "@/app/hooks/useDraft.ts";
import { useAuth } from "@/app/hooks/useAuth.ts";
import { useToast } from "@/app/contexts/ToastContext.tsx";
import yaml from "js-yaml";
import { useContentSync } from "@/app/hooks/useContentSync.ts";

// Presenter
import { EditorLayout } from "@/app/components/editor/EditorLayout.tsx";

// Types
import {
  Content as V1Content,
  Field as V1Field,
  FileItem,
} from "@/app/components/editor/types.ts";
import { BreadcrumbItem } from "@/app/components/layout/Header.tsx";
import { FrontMatterList, FrontMatterObject } from "@/shared/types.ts";

export interface ContentEditorProps {
  mode?: "new" | "edit";
  collectionName?: string;
  articleName?: string;
}

export function ContentEditor(
  { mode = "edit", collectionName: propColName, articleName: propArtName }:
    ContentEditorProps,
) {
  const params = useParams();
  const location = useLocation();
  const owner = params.owner;
  const repo = params.repo;
  const collectionName = propColName || params.collectionName;
  const articleName = propArtName || params.articleName;
  const { config } = useContentConfig(owner, repo);
  const { showToast } = useToast();
  const { username: _currentUser } = useAuth();

  const [saving, setSaving] = useState(false);
  const [isMerged, setIsMerged] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  const collection = config?.collections.find((c: Collection) =>
    c.name === collectionName
  );

  // Resolve File Path and Folder
  let filePath = "";
  let folder = "";
  if (collection) {
    if (collection.type === "singleton") {
      filePath = collection.path || "";
      if (collection.binding === "directory") {
        filePath = `${filePath}/index.md`.replace("//", "/");
      }

      const parts = filePath.split("/");
      if (parts.length > 1) folder = parts.slice(0, -1).join("/");
    } else {
      folder = collection.path || collection.folder || "";
      filePath = folder && articleName
        ? `${folder}/${articleName}`
        : articleName || "";
    }
  }

  const isYamlMode = filePath.endsWith(".yml") || filePath.endsWith(".yaml");

  const user = localStorage.getItem("staticms_user") || "anonymous";
  const effectiveArticleName = articleName ||
    (collection?.type === "singleton" ? "singleton" : "__new__");
  const draftKey =
    `staticms_draft_${user}|${owner}|${repo}|main|${collectionName}/${effectiveArticleName}`;

  const { draft, setDraft, loaded, fromStorage, clearDraft, isSynced } =
    useDraft(
      draftKey,
      {
        frontMatter: {},
        body: "",
        pendingImages: [],
      },
    );

  // Warn if singleton draft is empty (potential bug artifact)
  useEffect(() => {
    if (
      loaded &&
      fromStorage &&
      !draft.body &&
      Object.keys(draft.frontMatter || {}).length === 0 &&
      collection?.type === "singleton"
    ) {
      showToast(
        "Local draft is empty. If unexpected, please click 'Reset' to reload remote content.",
        "warning",
      );
    }
  }, [loaded, fromStorage, draft, collection, showToast]);

  // Use Content Sync Hook
  const { fetching: _fetching, originalDraft, triggerReload } = useContentSync({
    owner: owner || "",
    repo: repo || "",
    filePath,
    mode,
    loaded,
    draft,
    fromStorage: fromStorage || !isSynced,
    setDraft,
    showToast,
  });

  // SSE for PR updates
  useEffect(() => {
    const prNumber = draft.pr?.number;
    if (!prNumber) return;

    const eventSource = new EventSource("/api/events");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pr_update" && data.prNumber === prNumber) {
          if (data.status === "merged" || data.status === "closed") {
            if (data.status === "merged") {
              setIsMerged(true);
            } else if (data.status === "closed") {
              setIsClosed(true);
            }
            showToast(
              `PR #${prNumber} is ${data.status}. Unlocking editor and checking content...`,
              "info",
            );
            // Remove PR info from draft
            setDraft((prev) => {
              const { pr: _pr, ...rest } = prev;
              return rest;
            });
            triggerReload();
          }
        }
      } catch (e) {
        console.error("Failed to parse SSE message", e);
      }
    };
    return () => {
      eventSource.close();
    };
  }, [draft.pr?.number, showToast, setDraft, triggerReload]);

  const handleImageUpload = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = (e.target?.result as string).split(",")[1];
        const newImage: FileItem = {
          name: file.name,
          type: "file",
          content: content,
          path: folder ? `${folder}/${file.name}` : file.name,
        };
        setDraft((prev) => ({
          ...prev,
          pendingImages: [...(prev.pendingImages || []), newImage],
        }));
        resolve(file.name);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleValidation = () => {
    // Basic validation
    // deno-lint-ignore no-explicit-any
    const title = (draft.frontMatter as any).title;
    if (!title && mode === "new") {
      // Only require title for new? Or always?
      // For now, lenient.
    }
    return true;
  };

  const handleSave = async () => {
    if (!handleValidation()) return;
    setSaving(true);

    // Check for empty changes (prevent Empty PR)
    if (originalDraft && (draft.pendingImages || []).length === 0) {
      // Compare FrontMatter
      const fmChanged = JSON.stringify(draft.frontMatter) !==
        JSON.stringify(originalDraft.frontMatter);
      // Compare Body
      // Note: originalDraft.body is already normalized (trimmed) by parseFrontMatter
      const bodyChanged = draft.body !== originalDraft.body;

      if (!fmChanged && !bodyChanged) {
        showToast("No changes detected. Save cancelled.", "warning");
        setSaving(false);
        return;
      }
    }

    // Reconstruct currentContent for savePrStatus utility
    // It matches the one in render but needs to be accessible here
    const currentArticleName = articleName || "__new__";

    const currentContent: V1Content = {
      owner: owner || "",
      repo: repo || "",
      filePath: filePath,
      fields: [], // Not needed for key generation
      name: currentArticleName,
      type: "collection-files",
    };

    try {
      let savePath: string;
      let filename: string;

      // deno-lint-ignore no-explicit-any
      const title = (draft.frontMatter as any).title as string;

      if (mode === "new") {
        filename = `post-${Date.now()}.md`;
        if (title) {
          filename = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
            /(^-|-$)/g,
            "",
          ) + ".md";
        } else {
          // Fallback if title missing, user might have wanted explicit name
          if (!articleName || articleName === "__new__") {
            const userInput = prompt("Enter filename:", filename);
            if (!userInput) throw new Error("Filename required");
            filename = userInput;
          } else {
            filename = articleName;
          }
        }
        if (!filename.endsWith(".md")) filename += ".md";

        const folder = collection?.path || collection?.folder || "";
        savePath = folder ? `${folder}/${filename}` : filename;

        // Update currentContent filePath for correct PR key generation if it was new
        currentContent.filePath = savePath;
      } else {
        savePath = filePath;
      }

      let fileContent = "";
      if (isYamlMode) {
        fileContent = yaml.dump(draft.frontMatter);
      } else {
        const fmObject = draft.frontMatter as FrontMatterObject;
        const frontMatterString = Object.keys(fmObject || {}).length > 0
          ? yaml.dump(fmObject)
          : "";
        fileContent = frontMatterString
          ? `---\n${frontMatterString}---\n\n${draft.body}`
          : draft.body;
      }

      // Prepare Batch Updates
      const updates = [];

      // 1. Markdown File
      updates.push({
        path: savePath,
        content: btoa(unescape(encodeURIComponent(fileContent))),
        encoding: "base64",
      });

      // 2. Pending Images
      if (draft.pendingImages) {
        for (const img of draft.pendingImages) {
          if (img.content) {
            updates.push({
              path: img.path || img.name,
              content: img.content,
              encoding: "base64",
            });
          }
        }
      }

      const res = await fetch(
        `/api/repo/${owner}/${repo}/batch-commit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Update ${savePath}`,
            branch: "main", // TODO: Configurable
            updates,
            createPr: true,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      const data = await res.json();
      // If backend returns PR info
      if (data.pr) {
        setDraft(
          (prev) => ({
            ...prev,
            pr: {
              number: data.pr.number,
              url: data.pr.html_url,
              state: "open",
            },
          }),
          undefined,
          true,
        );

        showToast("Pull Request created/updated!", "success");
      } else {
        showToast("Saved successfully!", "success");
        // No PR created? Just clean sync.
        setDraft((prev) => prev, undefined, true);
        if (mode === "new") {
          // Provide feedback or reload
        }
      }
    } catch (e) {
      console.error(e);
      showToast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Discard local changes?")) {
      // Revert to remote
      if (originalDraft) {
        setDraft(originalDraft, undefined, true);
      } else {
        clearDraft();
      }
      triggerReload();
    }
  };

  const handleFrontMatterChange = (fm: FrontMatterObject | FrontMatterList) => {
    if (Array.isArray(fm)) {
      // List Mode
      const isClean = originalDraft
        ? (JSON.stringify(fm) === JSON.stringify(originalDraft.frontMatter))
        : false;
      setDraft(
        (prev) => ({ ...prev, frontMatter: fm }),
        undefined,
        isClean,
      );
    } else {
      // Object Mode
      const prevBody = draft.body;
      const isClean = originalDraft
        ? (prevBody === originalDraft.body &&
          JSON.stringify(fm) === JSON.stringify(originalDraft.frontMatter))
        : false;
      setDraft(
        (prev) => ({ ...prev, frontMatter: fm }),
        undefined,
        isClean,
      );
    }
  };

  const handleBodyChange = (body: string) => {
    const nextBody = body || "";
    if (nextBody === draft.body) return;

    const prevFM = draft.frontMatter;
    const isClean = originalDraft
      ? (nextBody === originalDraft.body &&
        JSON.stringify(prevFM) ===
          JSON.stringify(originalDraft.frontMatter))
      : false;

    setDraft(
      (prev) => ({ ...prev, body: nextBody }),
      undefined,
      isClean,
    );
  };

  const handlePendingImageRemove = (name: string) => {
    setDraft((prev) => ({
      ...prev,
      pendingImages: prev.pendingImages?.filter((i) => i.name !== name),
    }));
  };

  const handleImageInsert = (name: string) => {
    navigator.clipboard.writeText(`![${name}](${name})`);
    showToast(`Copied ![${name}](${name}) to clipboard`, "info");
  };

  if (!collection || !config) {
    return <div className="ui active centered inline loader"></div>;
  }

  // Adapter: Convert v2 collection/config to v1 Content interface
  const v1Fields: V1Field[] = collection.fields?.map((f) => ({
    name: f.name,
    value: "",
    defaultValue: "",
  })) || [];

  const currentContent: V1Content = {
    owner: owner || "",
    repo: repo || "",
    filePath: folder
      ? `${folder}/${effectiveArticleName}`
      : effectiveArticleName,
    fields: v1Fields,
    name: effectiveArticleName,
    type: "collection-files", // Simplified assumption
  };

  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: `${owner}/${repo}`,
      to: `/${owner}/${repo}`,
    },
  ];

  if (collection) {
    breadcrumbs.push({
      label: collection.label || collection.path || collectionName ||
        "Collection",
      to: `/${owner}/${repo}/${collection.name}`,
    });
  }

  // deno-lint-ignore no-explicit-any
  const initialTitle = (location.state as any)?.initialTitle;

  if (collection?.type !== "singleton") {
    breadcrumbs.push({
      label: mode === "new"
        ? (initialTitle || "New Content")
        : effectiveArticleName,
    });
  }

  // Check if root is array
  const isListMode = isYamlMode && Array.isArray(draft.frontMatter);

  // Lock Logic
  const isLocked = !!draft.pr && isSynced;

  return (
    <EditorLayout
      breadcrumbs={breadcrumbs}
      isLocked={isLocked}
      isSynced={isSynced}
      isSaving={saving}
      isMerged={isMerged}
      isClosed={isClosed}
      fromStorage={!!fromStorage}
      prInfo={draft.pr as { url: string; number: number; state: string } | null}
      draft={{
        frontMatter: draft.frontMatter as FrontMatterObject | FrontMatterList,
        body: draft.body,
        pendingImages: draft.pendingImages,
      }}
      collection={collection}
      currentContent={currentContent}
      isYamlMode={isYamlMode}
      isListMode={isListMode || false}
      folderPath={folder || ""}
      onSave={handleSave}
      onReset={handleReset}
      onFrontMatterChange={handleFrontMatterChange}
      onBodyChange={handleBodyChange}
      onImageUpload={handleImageUpload}
      onPendingImageRemove={handlePendingImageRemove}
      onImageInsert={handleImageInsert}
    />
  );
}
