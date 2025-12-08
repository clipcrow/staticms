import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Collection, useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { Draft, useDraft } from "@/app/hooks/useDraft.ts";
import { useToast } from "@/app/contexts/ToastContext.tsx";
import { savePrStatus } from "@/app/components/editor/utils.ts";
import yaml from "js-yaml";

// V1 Components
import { MarkdownEditor } from "@/app/components/editor/MarkdownEditor.tsx";
import { FrontMatterItemEditor } from "@/app/components/editor/FrontMatterItemEditor.tsx";
import {
  Content as V1Content,
  Field as V1Field,
  FileItem,
} from "@/app/components/editor/types.ts";
import { BreadcrumbItem, Header } from "@/app/components/common/Header.tsx";
import { ContentImages } from "@/app/components/editor/ContentImages.tsx";

// Simple Frontmatter Parser (Reuse existing)
function parseFrontMatter(text: string) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (match) {
    try {
      // deno-lint-ignore no-explicit-any
      const data = yaml.load(match[1]) as any;
      return { data, content: match[2] };
    } catch (e) {
      console.warn("Failed to parse YAML frontmatter", e);
    }
  }
  if (text.startsWith("---")) {
    const parts = text.split("---");
    if (parts.length >= 3) {
      try {
        // deno-lint-ignore no-explicit-any
        const data = yaml.load(parts[1]) as any;
        const content = parts.slice(2).join("---").replace(/^\n/, "");
        return { data, content };
      } catch (e) {
        console.warn(e);
      }
    }
  }
  return { data: {}, content: text };
}

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

  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const fetchedPathRef = useRef<string | null>(null);
  const [prInfo, setPrInfo] = useState<
    { prUrl: string; prNumber: number } | null
  >(null);

  // SSE for PR updates (Keep existing logic)
  useEffect(() => {
    if (!prInfo) return;
    const eventSource = new EventSource("/api/events");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pr_update" && data.prNumber === prInfo.prNumber) {
          if (data.status === "merged" || data.status === "closed") {
            showToast(
              `PR #${data.prNumber} is ${data.status}. Unlocking editor.`,
              "info",
            );
            setPrInfo(null);
          }
        }
      } catch (e) {
        console.error("Failed to parse SSE message", e);
      }
    };
    return () => {
      eventSource.close();
    };
  }, [prInfo, showToast]);

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

  const user = localStorage.getItem("staticms_user") || "anonymous";
  const effectiveArticleName = articleName ||
    (collection?.type === "singleton" ? "singleton" : "__new__");
  const draftKey =
    `draft_${user}|${owner}|${repo}|main|${collectionName}/${effectiveArticleName}`;

  const { draft, setDraft, loaded, fromStorage, clearDraft } = useDraft(
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

  // Fetch remote content (Keep existing logic)
  useEffect(() => {
    console.log("[ContentEditor] Fetch Effect Check:", {
      mode,
      loaded,
      fromStorage,
      collectionName,
      filePath,
      fetching,
      fetched: fetchedPathRef.current,
    });
    if (
      mode === "new" ||
      !loaded ||
      fromStorage ||
      !owner ||
      !repo ||
      !collection ||
      !filePath ||
      fetching ||
      fetchedPathRef.current === filePath
    ) {
      return;
    }

    setFetching(true);
    fetchedPathRef.current = filePath;
    fetch(`/api/repo/${owner}/${repo}/contents/${filePath}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch remote content");
        return await res.text();
      })
      .then((text) => {
        try {
          const parsed = parseFrontMatter(text);
          const { data, content } = parsed;
          console.log("Loaded remote content:", data);
          setDraft((prev: Draft) => ({
            ...prev,
            frontMatter: data,
            body: content,
          }));
        } catch (e) {
          console.error("Failed to parse content", e);
          setDraft((prev: Draft) => ({ ...prev, body: text }));
        }
      })
      .catch((e) => {
        console.error("[ContentEditor] Fetch failed:", e);
        showToast(`Failed to load content: ${e.message}`, "error");
      })
      .finally(() => {
        setFetching(false);
      });
  }, [
    mode,
    loaded,
    fromStorage,
    owner,
    repo,
    collection,
    articleName,
    folder,
    fetching,
    setDraft,
    showToast,
  ]);

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

    // Reconstruct currentContent for savePrStatus utility
    // It matches the one in render but needs to be accessible here
    // Reconstruct currentContent for savePrStatus utility
    const currentArticleName = articleName || "__new__";

    // Slight duplication of currentContent construction logic, but safer than refactoring scope now
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

      const frontMatterString = Object.keys(draft.frontMatter || {}).length > 0
        ? yaml.dump(draft.frontMatter)
        : "";
      const fileContent = frontMatterString
        ? `---\n${frontMatterString}---\n\n${draft.body}`
        : draft.body;

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
        setPrInfo({ prUrl: data.pr.html_url, prNumber: data.pr.number });

        // Save PR status to localStorage for persistence across lists
        savePrStatus(currentContent, data.pr.number, data.pr.html_url);

        showToast("Pull Request created/updated!", "success");
      } else {
        showToast("Saved successfully!", "success");
        clearDraft();
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
      clearDraft();
      fetchedPathRef.current = null;
    }
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

  // Lock Logic: Locked if PR exists AND no local draft to override it.
  const isLocked = !!prInfo && !fromStorage;

  return (
    <div className="ui container" style={{ marginTop: "2rem" }}>
      <Header
        breadcrumbs={breadcrumbs}
        rightContent={
          <div style={{ display: "flex", gap: "0.5em", alignItems: "center" }}>
            {prInfo && (
              <a
                href={prInfo.prUrl}
                target="_blank"
                rel="noreferrer"
                className="ui green basic label"
                title="View Pull Request on GitHub"
              >
                <i className="code branch icon"></i>
                PR #{prInfo.prNumber}
                <div className="detail">Open</div>
              </a>
            )}

            {fromStorage && (
              <div
                className="ui horizontal label orange"
                title="You are viewing a local draft that hasn't been saved to GitHub yet."
              >
                <i className="pencil alternate icon"></i>
                Draft Restored
              </div>
            )}

            {/* Reset Button: Only show if we have local changes */}
            {fromStorage && (
              <button
                type="button"
                className="ui button negative basic compact"
                onClick={handleReset}
                disabled={saving}
                title="Discard local draft and reload from server"
              >
                Reset
              </button>
            )}

            <button
              type="button"
              className={`ui primary button ${saving ? "loading" : ""}`}
              onClick={handleSave}
              disabled={saving || isLocked}
              title={isLocked
                ? "Editing is locked because a PR is open"
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
        <div className="twelve wide column">
          {/* FrontMatter Editor */}
          {(!collection.fields || collection.fields.length === 0) && (
            <div className="ui warning message">
              <div className="header">No Fields Defined</div>
              <p>Please define 'fields' in your staticms.yml.</p>
            </div>
          )}

          <FrontMatterItemEditor
            frontMatter={draft.frontMatter as Record<string, unknown>}
            setFrontMatter={(fm) =>
              setDraft((prev) => ({ ...prev, frontMatter: fm }))}
            currentContent={currentContent}
            isPrLocked={isLocked}
          />

          {/* Markdown Editor */}
          <div className="ui segment">
            <MarkdownEditor
              body={draft.body}
              setBody={(body) => setDraft((prev) => ({ ...prev, body }))}
              isPrLocked={isLocked}
              currentContent={currentContent}
              height={600}
              onImageUpload={handleImageUpload}
            />
          </div>
        </div>
        <div className="four wide column">
          {/* Future Sidebar (History, Images) */}
          <div className="ui segment">
            <ContentImages
              pendingImages={draft.pendingImages || []}
              onUpload={(files) => Array.from(files).forEach(handleImageUpload)}
              onRemovePending={(name) =>
                setDraft((prev) => ({
                  ...prev,
                  pendingImages: prev.pendingImages?.filter((i) =>
                    i.name !== name
                  ),
                }))}
              onInsert={(name) => {
                // Hacky insert: use clipboard or just append?
                // Best would be to expose an insert method ref from MarkdownEditor,
                // but for now let's just use clipboard or toast
                navigator.clipboard.writeText(`![${name}](${name})`);
                showToast(`Copied ![${name}](${name}) to clipboard`, "info");
              }}
              folderPath={folder || ""}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
