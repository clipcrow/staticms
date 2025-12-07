import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Collection, useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { Draft, useDraft } from "@/app/hooks/useDraft.ts";
import { useToast } from "@/app/contexts/ToastContext.tsx";
import yaml from "js-yaml";

// V1 Components
import { MarkdownEditor } from "@/app/components/editor/MarkdownEditor.tsx";
import { FrontMatterItemEditor } from "@/app/components/editor/FrontMatterItemEditor.tsx";
import {
  Content as V1Content,
  Field as V1Field,
} from "@/app/components/editor/types.ts";

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

export function ContentEditor({ mode = "edit" }: { mode?: "new" | "edit" }) {
  const { owner, repo, collectionName, articleName } = useParams();
  const { config } = useContentConfig(owner, repo);
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
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

  const user = localStorage.getItem("staticms_user") || "anonymous";
  const effectiveArticleName = articleName || "__new__";
  const folder = collection?.folder ? collection.folder : null;
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

  // Fetch remote content (Keep existing logic)
  useEffect(() => {
    if (
      mode === "new" ||
      !loaded ||
      fromStorage ||
      !owner ||
      !repo ||
      !collection ||
      !articleName ||
      fetching
    ) {
      return;
    }

    const path = folder ? `${folder}/${articleName}` : articleName;

    setFetching(true);
    fetch(`/api/repo/${owner}/${repo}/contents/${path}`)
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
        console.error(e);
        showToast("Failed to load content", "error");
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

  const handleSave = async () => {
    setSaving(true);
    try {
      let savePath: string;

      if (mode === "new") {
        // deno-lint-ignore no-explicit-any
        const title = (draft.frontMatter as any).title as string;
        let filename = `post-${Date.now()}.md`;
        if (title) {
          filename = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
            /(^-|-$)/g,
            "",
          ) + ".md";
        } else {
          const userInput = prompt(
            "Enter filename (e.g. my-post.md):",
            filename,
          );
          if (!userInput) throw new Error("Filename required");
          filename = userInput;
        }

        savePath = folder ? `${folder}/${filename}` : filename;
      } else {
        savePath = folder ? `${folder}/${articleName}` : articleName!;
      }

      const frontMatterString = Object.keys(draft.frontMatter || {}).length > 0
        ? yaml.dump(draft.frontMatter)
        : "";
      const fileContent = frontMatterString
        ? `---\n${frontMatterString}---\n\n${draft.body}`
        : draft.body;

      // TODO: Handle Image Uploads First (similar to v1 logic, or reuse v1 hook logic later)
      // For now, assume images are already uploaded or we just save text.

      const res = await fetch(
        `/api/repo/${owner}/${repo}/contents/${savePath}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Update ${savePath}`,
            content: btoa(unescape(encodeURIComponent(fileContent))), // UTF-8 safe base64
            branch: "main", // TODO: Configurable branch
            sha: undefined, // TODO: We need SHA if updating
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      const data = await res.json();
      if (data.pr) {
        setPrInfo({ prUrl: data.pr.html_url, prNumber: data.pr.number });
        showToast("Pull Request created/updated!", "success");
      } else {
        showToast("Saved successfully!", "success");
        clearDraft();
        if (mode === "new") {
          // Redirect to edit mode? For now just stay or reload
          // navigate...
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
      // Trigger refetch?
      globalThis.location.reload();
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

  return (
    <div className="ui container" style={{ marginTop: "2rem" }}>
      <div className="ui segment basic">
        <h2 className="ui header">
          {mode === "new" ? "New" : "Edit"} {collection.label}
          {fromStorage && mode === "edit" && (
            <div className="ui horizontal label orange">Draft Restored</div>
          )}
        </h2>

        {/* Actions Toolbar */}
        <div style={{ marginBottom: "1rem", textAlign: "right" }}>
          {prInfo && (
            <a
              href={prInfo.prUrl}
              target="_blank"
              rel="noreferrer"
              style={{ marginRight: "1em" }}
            >
              PR #{prInfo.prNumber} Open{" "}
              <i className="external alternate icon"></i>
            </a>
          )}
          {fromStorage && !prInfo && (
            <button
              type="button"
              className="ui button negative basic"
              onClick={handleReset}
              style={{ marginRight: "0.5em" }}
              disabled={saving}
            >
              Reset
            </button>
          )}
          <button
            type="button"
            className={`ui primary button ${saving ? "loading" : ""}`}
            onClick={handleSave}
            disabled={saving || !!prInfo}
          >
            {prInfo ? "Locked (PR Created)" : "Save"}
          </button>
        </div>
      </div>

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
            isPrLocked={!!prInfo}
          />

          {/* Markdown Editor */}
          <div className="ui segment">
            <MarkdownEditor
              body={draft.body}
              setBody={(body) => setDraft((prev) => ({ ...prev, body }))}
              isPrLocked={!!prInfo}
              currentContent={currentContent}
              height={600}
              // onImageUpload={...} // TODO: Implement image upload hook logic
            />
          </div>
        </div>
        <div className="four wide column">
          {/* Future Sidebar (History, Images) */}
          <div className="ui segment">
            <h4 className="ui header">Sidebar</h4>
            <p>Coming back soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
