import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Field, useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { FileItem, useDraft } from "@/app/hooks/useDraft.ts";

export function ContentEditor({ mode = "edit" }: { mode?: "new" | "edit" }) {
  const { owner, repo, collectionName, articleName } = useParams();
  const { config } = useContentConfig(owner, repo);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [saving, setSaving] = useState(false);
  const [prInfo, setPrInfo] = useState<
    { prUrl: string; prNumber: number } | null
  >(
    null,
  );

  useEffect(() => {
    if (!prInfo) return;

    const eventSource = new EventSource("/api/events");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pr_update" && data.prNumber === prInfo.prNumber) {
          if (data.status === "merged" || data.status === "closed") {
            alert(`PR #${data.prNumber} is ${data.status}. Unlocking editor.`);
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
  }, [prInfo]);

  const collection = config?.collections.find((c) => c.name === collectionName);

  const user = localStorage.getItem("staticms_user") || "anonymous";
  const filePath = mode === "new" ? "__new__" : articleName;
  const draftKey =
    `draft_${user}|${owner}|${repo}|main|${collectionName}/${filePath}`;

  const { draft, setDraft, loaded } = useDraft(draftKey, {
    frontMatter: {},
    body: "",
    pendingImages: [],
  });

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
    if (prInfo) return; // Locked
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

      setDraft((prev) => ({
        ...prev,
        pendingImages: [...(prev.pendingImages || []), newItem],
        body: insertTextAtCursor(prev.body, `![${file.name}](${newItem.path})`),
      }));
    };
    reader.readAsDataURL(file);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (prInfo) return; // Locked
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();
      handleImageUpload(e.clipboardData.files);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (prInfo) return; // Locked
    if (e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const handleChange = (fieldName: string, value: string) => {
    if (fieldName === "body") {
      setDraft((prev) => ({ ...prev, body: value }));
    } else {
      setDraft((prev) => ({
        ...prev,
        frontMatter: { ...prev.frontMatter, [fieldName]: value },
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/repo/${owner}/${repo}/pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft,
          filePath,
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
      // Ideally show toast
    } catch (e) {
      alert("Error saving: " + (e as Error).message);
    } finally {
      setSaving(false);
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
            {draft.pendingImages.map((img, idx) => (
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
