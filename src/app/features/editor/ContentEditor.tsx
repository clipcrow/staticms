import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Collection, useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { useDraft } from "@/app/hooks/useDraft.ts";
import { useAuth } from "@/app/hooks/useAuth.ts";
import { useToast } from "@/app/contexts/ToastContext.tsx";
import { useRepository } from "@/app/hooks/useRepositories.ts";
import yaml from "js-yaml";
import { useContentSync } from "@/app/hooks/useContentSync.ts";
import { fetchWithAuth } from "@/app/utils/fetcher.ts";
import { useSetHeader } from "@/app/contexts/HeaderContext.tsx";

// Presenter
import { EditorLayout } from "@/app/components/editor/EditorLayout.tsx";

// Types
import {
  Content as V1Content,
  Field as V1Field,
  FileItem,
} from "@/shared/types.ts";
import { BreadcrumbItem } from "@/app/components/common/Header.tsx";
import { RepoBreadcrumbLabel } from "@/app/components/common/RepoBreadcrumb.tsx";
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
  const navigate = useNavigate();
  const location = useLocation();
  const owner = params.owner;
  const repo = params.repo;
  const contentName = propColName || params.content;
  const articleName = propArtName || params.article;
  const { config, loading: configLoading } = useContentConfig(owner, repo);
  const { showToast } = useToast();
  const { username: _currentUser } = useAuth();
  const { repository, loading: repoLoading } = useRepository(owner, repo);

  const branchConfigured = !!config?.branch;
  const branchReady = !configLoading && (branchConfigured || !repoLoading);

  const branch = config?.branch || repository?.default_branch || "main";

  // Check for initial slug/name passed from navigation state
  // deno-lint-ignore no-explicit-any
  const locationState = location.state as any;
  const proposedSlug = locationState?.slug || locationState?.name ||
    locationState?.initialTitle;

  const [saving, setSaving] = useState(false);
  const [isMerged, setIsMerged] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  const [commitMessage, setCommitMessage] = useState("");

  const collection = config?.collections.find((c: Collection) =>
    c.name === contentName
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

      if (collection.binding === "directory") {
        filePath = `${filePath}/index.md`.replace("//", "/");
        // Update folder to include article directory for image upload context
        const parts = filePath.split("/");
        if (parts.length > 1) folder = parts.slice(0, -1).join("/");
      }
    }
  }

  const isYamlMode = filePath.endsWith(".yml") || filePath.endsWith(".yaml");

  const user = localStorage.getItem("staticms_user") || "anonymous";
  const effectiveArticleName = articleName ||
    (collection?.type === "singleton"
      ? "singleton"
      : (proposedSlug || "__new__"));
  const draftKey =
    `staticms_draft_${user}|${owner}|${repo}|${branch}|${contentName}/${effectiveArticleName}`;

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
    branch,
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
    if (!collection?.fields) return true;

    // Helper to check object
    // deno-lint-ignore no-explicit-any
    const checkObject = (obj: any, index?: number) => {
      // deno-lint-ignore no-explicit-any
      for (const field of (collection.fields as any[])) {
        if (field.required) {
          const val = obj[field.name];
          if (
            val === undefined || val === null ||
            (typeof val === "string" && val.trim() === "")
          ) {
            const prefix = index !== undefined ? `Item #${index + 1}: ` : "";
            showToast(
              `${prefix}Field '${field.label || field.name}' is required.`,
              "error",
            );
            return false;
          }
        }
      }
      return true;
    };

    if (Array.isArray(draft.frontMatter)) {
      // List validation
      for (let i = 0; i < draft.frontMatter.length; i++) {
        if (!checkObject(draft.frontMatter[i], i)) return false;
      }
    } else {
      // Object validation
      if (!checkObject(draft.frontMatter)) return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!handleValidation()) return;
    setSaving(true);

    // Check for empty changes (prevent Empty PR)
    if (
      mode !== "new" && originalDraft &&
      (draft.pendingImages || []).length === 0
    ) {
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
    const currentArticleName = effectiveArticleName;

    const currentContent: V1Content = {
      owner: owner || "",
      repo: repo || "",
      filePath: filePath,
      fields: [], // Not needed for key generation
      name: currentArticleName,
      type: "collection-files",
    };

    let finalSlug = articleName;

    try {
      let savePath: string;

      // deno-lint-ignore no-explicit-any
      const fm = draft.frontMatter as any;
      let title = (fm.title || fm.Title || fm.name || fm.Name) as string;

      if (!title && collection?.fields) {
        const firstStringField = collection.fields.find((f) =>
          f.widget === "string"
        );
        if (firstStringField) {
          title = fm[firstStringField.name] as string;
        }
      }

      if (mode === "new") {
        let slug: string;

        if (proposedSlug) {
          slug = proposedSlug;
        } else if (title) {
          slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
            /(^-|-$)/g,
            "",
          );
        } else {
          slug = `post-${Date.now()}`;
          // Fallback if title missing, user might have wanted explicit name
          if (!articleName || articleName === "__new__") {
            const userInput = prompt("Enter filename (slug):", slug);
            if (!userInput) throw new Error("Filename required");
            slug = userInput;
          } else {
            slug = articleName;
          }
        }

        // Normalize slug by removing extension if typed
        slug = slug.replace(/\.md$/, "");

        // Capture for navigation
        finalSlug = slug;

        const folder = collection?.path || collection?.folder || "";

        if (collection?.binding === "directory") {
          savePath = folder ? `${folder}/${slug}/index.md` : `${slug}/index.md`;
        } else {
          savePath = folder ? `${folder}/${slug}.md` : `${slug}.md`;
        }

        // Clean double slashes
        savePath = savePath.replace("//", "/");

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

      const res = await fetchWithAuth(
        `/api/repo/${owner}/${repo}/batch-commit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: commitMessage || `Update ${savePath}`,
            branch,
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
        showToast("Pull Request created/updated!", "success");

        // Clear commit message after successful save
        setCommitMessage("");

        if (mode === "new" && finalSlug) {
          // Clear the __new__ draft to prevent ghost drafts
          clearDraft();
          // Navigate to the new article URL to initialize proper draft state
          navigate(`/${owner}/${repo}/${contentName}/${finalSlug}`, {
            replace: true,
          });
          return;
        }

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
      } else {
        showToast("Saved successfully!", "success");
        setCommitMessage("");
        // No PR created? Just clean sync.
        setDraft((prev) => prev, undefined, true);

        if (mode === "new" && finalSlug) {
          clearDraft();
          navigate(`/${owner}/${repo}/${contentName}/${finalSlug}`, {
            replace: true,
          });
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
        triggerReload();
      } else {
        // No remote content (New file case) -> Cancel creation
        clearDraft();
        navigate(`/${owner}/${repo}/${contentName}`);
        showToast("Draft discarded", "info");
      }
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

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this content? This cannot be undone.",
      )
    ) return;

    // deno-lint-ignore no-explicit-any
    const sha = (originalDraft as any)?.sha;

    setSaving(true);
    try {
      const res = await fetchWithAuth(
        `/api/repo/${owner}/${repo}/contents/${filePath}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Delete ${effectiveArticleName}`,
            sha: sha,
            branch,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }

      showToast("Deleted successfully", "success");
      navigate(`/${owner}/${repo}/${contentName}`);
    } catch (e) {
      console.error(e);
      showToast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Header Logic
  const initialTitle = locationState?.initialTitle;
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: (
        <RepoBreadcrumbLabel
          owner={owner!}
          repo={repo!}
          branch={branch}
        />
      ),
      to: `/${owner}/${repo}`,
    },
  ];

  let title: React.ReactNode = "";

  if (collection) {
    if (collection.type === "singleton") {
      title = collection.label || collection.path || contentName || "Singleton";
    } else {
      breadcrumbs.push({
        label: collection.label || collection.path || contentName ||
          "Collection",
        to: `/${owner}/${repo}/${collection.name}`,
      });
      title = mode === "new"
        ? (initialTitle || "New Content")
        : effectiveArticleName;
    }
  } else if (contentName) {
    title = contentName;
  }

  const rightContent = (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      {draft.pr && (
        <a
          href={draft.pr.url}
          target="_blank"
          rel="noreferrer"
          className="ui horizontal label teal medium"
          title="View Pull Request on GitHub"
        >
          <i className="eye icon"></i>
          In Review (#{draft.pr.number})
        </a>
      )}

      {!isSynced && (
        <div
          className="ui horizontal label orange medium"
          title="Unsaved local changes"
        >
          <i className="pencil alternate icon"></i>
          Draft
        </div>
      )}

      {isMerged && !draft.pr && isSynced && (
        <div
          className="ui horizontal label purple medium"
          title="Pull Request was merged successfully"
        >
          <i className="check circle icon"></i>
          Approved
        </div>
      )}

      {isClosed && !draft.pr && isSynced && (
        <div
          className="ui horizontal label red medium"
          title="Pull Request was closed without merge"
        >
          <i className="times circle icon"></i>
          Declined
        </div>
      )}
    </div>
  );

  useSetHeader(breadcrumbs, title, rightContent);

  if (!collection || !config || !branchReady) {
    return <div className="ui active centered inline loader"></div>;
  }

  // Adapter: Convert v2 collection/config to v1 Content interface
  const v1Fields: V1Field[] = collection.fields?.map((f) => ({
    name: f.name,
    value: "",
    defaultValue: "",
    widget: f.widget,
    label: f.label,
    options: f.options,
    required: f.required,
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

  // Check if root is array
  const isListMode = isYamlMode && Array.isArray(draft.frontMatter);

  // Lock Logic
  const isLocked = !!draft.pr && isSynced;

  return (
    <EditorLayout
      isLocked={isLocked}
      isSynced={isSynced}
      isSaving={saving}
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
      branch={branch}
      commitMessage={commitMessage}
      onCommitMessageChange={setCommitMessage}
      onSave={handleSave}
      onReset={handleReset}
      onFrontMatterChange={handleFrontMatterChange}
      onBodyChange={handleBodyChange}
      onImageUpload={handleImageUpload}
      onPendingImageRemove={handlePendingImageRemove}
      onImageInsert={handleImageInsert}
      onDelete={(collection?.type !== "singleton" && mode !== "new")
        ? handleDelete
        : undefined}
    />
  );
}
