import { useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { useDraft } from "@/app/hooks/useDraft.ts";

export function ContentEditor({ mode = "edit" }: { mode?: "new" | "edit" }) {
  const { owner, repo, collectionName, articleName } = useParams();
  const { config } = useContentConfig(owner, repo);

  const collection = config?.collections.find((c) => c.name === collectionName);

  const user = localStorage.getItem("staticms_user") || "anonymous";
  const filePath = mode === "new" ? "__new__" : articleName;
  const draftKey =
    `draft_${user}|${owner}|${repo}|main|${collectionName}/${filePath}`;

  const { draft, setDraft, loaded } = useDraft(draftKey, {
    frontMatter: {},
    body: "",
  });

  if (!loaded || !config) {
    return <div className="ui active centered inline loader"></div>;
  }
  if (!collection) {
    return <div className="ui error message">Collection not found</div>;
  }

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
                    name={field.name}
                    value={value as string}
                    onChange={(e) => handleChange(field.name, e.target.value)}
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
    </div>
  );
}
