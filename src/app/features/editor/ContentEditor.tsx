import { useRef } from "react";
import { useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { FileItem, useDraft } from "@/app/hooks/useDraft.ts";

export function ContentEditor({ mode = "edit" }: { mode?: "new" | "edit" }) {
  const { owner, repo, collectionName, articleName } = useParams();
  const { config } = useContentConfig(owner, repo);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        path: `images/${file.name}`, // Provisional path strategy
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
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();
      handleImageUpload(e.clipboardData.files);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
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

  return (
    <div className="ui container content-editor" style={{ marginTop: "2em" }}>
      <h2 className="ui header">
        {mode === "new" ? "New" : "Edit"} {collection.label}
      </h2>
      <div className="ui form">
        {collection.fields.map((field) => {
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
                  />
                )
                : (
                  <input
                    type="text"
                    name={field.name}
                    value={value as string}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  />
                )}
            </div>
          );
        })}
      </div>

      {/* Preview of pending images (Optional/Debug) */}
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
