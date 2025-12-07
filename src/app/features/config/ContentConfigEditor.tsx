import { useState } from "react";
import yaml from "js-yaml";
import { Collection, Config } from "@/app/hooks/useContentConfig.ts";
import { ContentSettings } from "@/app/components/common/ContentSettings.tsx";
import { Content as V1Content } from "@/app/components/editor/types.ts";

interface ContentConfigEditorProps {
  owner: string;
  repo: string;
  config: Config;
  initialData?: Collection;
  mode: "add" | "edit";
  onCancel: () => void;
  onSave: () => void;
}

export function ContentConfigEditor({
  owner,
  repo,
  config,
  initialData,
  mode,
  onCancel,
  onSave,
}: ContentConfigEditorProps) {
  // Adapter: toV1Content
  const toV1Content = (col: Collection | undefined): V1Content => {
    if (!col && mode === "add") {
      return {
        owner,
        repo,
        filePath: "",
        fields: [],
        type: "collection-files",
        name: "",
      };
    }

    const c = col!;
    let type: V1Content["type"] = "collection-files";
    if (c.type === "singleton") {
      type = c.folder ? "singleton-dir" : "singleton-file";
    } else {
      type = "collection-files"; // defaulting to collection-files
    }

    return {
      owner,
      repo,
      name: c.label,
      filePath: c.folder || c.file || "",
      fields: c.fields?.map((f) => ({
        name: f.name,
        value: "",
        defaultValue: "",
      })) || [],
      type,
    };
  };

  const [formData, setFormData] = useState<V1Content>(toV1Content(initialData));
  const [saving, setSaving] = useState(false);
  // deno-lint-ignore no-unused-vars
  const [error, setError] = useState<string | null>(null);

  // Adapter: fromV1Content
  const fromV1Content = (content: V1Content): Collection => {
    const isSingleton = content.type?.startsWith("singleton");

    const label = content.name || "Untitled";
    let name = initialData?.name;
    if (!name || mode === "add") {
      name = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
        /(^-|-$)/g,
        "",
      );
    }

    const col: Collection = {
      name: name!,
      label: label,
      type: isSingleton ? "singleton" : "collection",
      fields: content.fields.map((f) => ({
        name: f.name,
        label: f.name,
        widget: "string",
      })),
    };

    if (content.type === "singleton-file") {
      col.file = content.filePath;
    } else {
      col.folder = content.filePath;
    }

    return col;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const newCollection = fromV1Content(formData);

      // Deep copy config
      const newConfig: Config = JSON.parse(JSON.stringify(config));
      if (!newConfig.collections) newConfig.collections = [];

      if (mode === "add") {
        if (!newCollection.fields || newCollection.fields.length === 0) {
          newCollection.fields = [
            { name: "title", label: "Title", widget: "string" },
            { name: "body", label: "Body", widget: "markdown" },
          ];
        }
        newConfig.collections.push(newCollection);
      } else {
        const index = newConfig.collections.findIndex((c) =>
          c.name === initialData?.name
        );
        if (index >= 0) {
          newConfig.collections[index] = newCollection;
        } else {
          newConfig.collections.push(newCollection);
        }
      }

      const res = await fetch(`/api/repo/${owner}/${repo}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Update config for ${newCollection.label}`,
          content: btoa(unescape(encodeURIComponent(yaml.dump(newConfig)))),
          branch: "main",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save config");
      }

      onSave();
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm("Are you sure you want to delete this content configuration?")
    ) return;
    setSaving(true);
    try {
      const newConfig: Config = JSON.parse(JSON.stringify(config));
      newConfig.collections = newConfig.collections.filter((c) =>
        c.name !== initialData?.name
      );

      const res = await fetch(`/api/repo/${owner}/${repo}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Delete content config ${initialData?.label}`,
          content: btoa(unescape(encodeURIComponent(yaml.dump(newConfig)))),
          branch: "main",
        }),
      });

      if (!res.ok) throw new Error("Failed to delete");
      onSave();
    } catch (e) {
      console.error(e);
      alert("Error deleting: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ContentSettings
      formData={formData}
      setFormData={setFormData}
      editingIndex={mode === "edit" ? 1 : null}
      onSave={handleSubmit}
      onCancel={onCancel}
      onDelete={handleDelete}
      repoInfo={{ owner, repo }}
      loading={saving}
    />
  );
}
