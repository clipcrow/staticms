import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Collection,
  Field,
  useContentConfig,
} from "@/app/hooks/useContentConfig.ts";
import { Draft, FileItem, useDraft } from "@/app/hooks/useDraft.ts";
import { useToast } from "@/app/contexts/ToastContext.tsx";
import yaml from "js-yaml";

// Simple Frontmatter Parser
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
  // Try to check if it starts with --- but maybe different newline handling
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [prInfo, setPrInfo] = useState<
    { prUrl: string; prNumber: number } | null
  >(null);

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

  // Fetch remote content if editing and no local draft
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
    setDraft,
    fetching,
    folder,
    showToast,
  ]);

  if (!loaded || !config) {
    return <div className="ui active centered inline loader"></div>;
  }
  if (!collection) {
    return <div className="ui error message">Collection not found</div>;
  }

  const insertTextAtCursor = (text: string, insertion: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return text + insertion;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    return text.slice(0, start) + insertion + text.slice(end);
  };

  const handleImageUpload = (files: FileList | null) => {
    if (prInfo) return;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const newItem: FileItem = {
        name: file.name,
        type: "file",
        content: content,
        path: `images/${file.name}`,
      };

      setDraft((prev: Draft) => ({
        ...prev,
        pendingImages: [...(prev.pendingImages || []), newItem],
        body: insertTextAtCursor(prev.body, `![${file.name}](${newItem.path})`),
      }));
      showToast("Image added to draft", "info");
    };
    reader.readAsDataURL(file);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (prInfo) return;
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();
      handleImageUpload(e.clipboardData.files);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (prInfo) return;
    if (e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const handleChange = (fieldName: string, value: string) => {
    if (fieldName === "body") {
      setDraft((prev: Draft) => ({ ...prev, body: value }));
    } else {
      setDraft((prev: Draft) => ({
        ...prev,
        frontMatter: { ...prev.frontMatter, [fieldName]: value },
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let savePath: string;

      if (mode === "new") {
        const title = draft.frontMatter.title as string;
        let filename = `post-${Date.now()}.md`;
        if (title) {
          filename = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
            /(^-|-$)/g,
            "",
          ) + ".md";
        } else {
          // For now continue using prompt for filename as it requires user input
          // Or we can open a modal. Simplicity for now:
          const userInput = prompt(
            "Enter filename (e.g. my-post.md):",
            filename,
          );
          if (!userInput) throw new Error("Filename required");
          filename = userInput;
        }
        savePath = folder ? `${folder}/${filename}` : filename;
      } else {
        savePath = folder ? `${folder}/${articleName}` : (articleName || "");
      }

      const res = await fetch(`/api/repo/${owner}/${repo}/pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft,
          path: savePath,
          collectionName,
          baseBranch: "main",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create PR");
      }
      const data = await res.json();
      setPrInfo({ prUrl: data.prUrl, prNumber: data.prNumber });
      showToast("Pull Request created successfully!", "success");
    } catch (e) {
      showToast("Error saving: " + (e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure? This will discard local changes.")) {
      clearDraft();
      showToast("Draft discarded", "info");
    }
  };

  return (
    <div className="ui container content-editor" style={{ marginTop: "2em" }}>
      <div
        className="ui flex"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1em",
        }}
      >
        <h2 className="ui header" style={{ margin: 0 }}>
          {mode === "new" ? "New" : "Edit"} {collection.label}
          {fromStorage && mode === "edit" && (
            <div className="ui horizontal label orange">Draft Restored</div>
          )}
        </h2>
        <div>
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

      <div className={`ui form ${prInfo ? "disabled" : ""}`}>
        {(!collection.fields || collection.fields.length === 0) && (
          <div className="ui warning message">
            <div className="header">No Fields Defined</div>
            <p>
              Please define 'fields' in your staticms.yml for collection '
              {collection.name}'.
            </p>
          </div>
        )}
        {collection.fields?.map((field: Field) => {
          const value = field.name === "body"
            ? draft.body
            : draft.frontMatter[field.name] || "";

          return (
            <div className="field" key={field.name}>
              <label>{field.label}</label>
              {field.widget === "markdown" || field.name === "body"
                ? (
                  <textarea
                    ref={field.name === "body" || field.widget === "markdown"
                      ? textareaRef
                      : null}
                    name={field.name}
                    value={value as string}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    onPaste={field.name === "body" ||
                        field.widget === "markdown"
                      ? onPaste
                      : undefined}
                    onDrop={field.name === "body" || field.widget === "markdown"
                      ? onDrop
                      : undefined}
                    disabled={!!prInfo}
                  />
                )
                : (
                  <input
                    type="text"
                    name={field.name}
                    value={value as string}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    disabled={!!prInfo}
                  />
                )}
            </div>
          );
        })}
      </div>

      {draft.pendingImages && draft.pendingImages.length > 0 && (
        <div className="ui segment">
          <h4 className="ui header">Pending Images</h4>
          <div className="ui small images">
            {draft.pendingImages.map((img: FileItem, idx: number) => (
              <img
                key={idx}
                src={img.content}
                alt={img.name}
                title={img.name}
                className="ui image border"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
