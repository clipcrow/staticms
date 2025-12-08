import { useState } from "react";
import yaml from "js-yaml";
import { Collection, Config, Field } from "@/app/hooks/useContentConfig.ts";
import { ContentSettings } from "@/app/components/common/ContentSettings.tsx";

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
  const defaultCollection: Collection = {
    name: "",
    label: "",
    type: "singleton",
    binding: "file",
    path: "",
    fields: [
      { name: "title", widget: "string", required: true },
    ],
    // archetype is stored as loose prop in Collection interface
    archetype: "",
  };

  const [formData, setFormData] = useState<Collection>(
    initialData ? JSON.parse(JSON.stringify(initialData)) : defaultCollection,
  );

  const [saving, setSaving] = useState(false);
  // deno-lint-ignore no-unused-vars
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // 0. Generate Identifier
      const rawId = formData.branch
        ? `${formData.branch}-${formData.path}`
        : formData.path;
      const generatedName = (rawId || "").toLowerCase().replace(
        /[^a-z0-9]+/g,
        "-",
      ).replace(/(^-|-$)/g, "");

      // 1. Sanitization
      const sanitizedCollection: Collection = {
        ...formData,
        name: generatedName,
        label: formData.label?.trim() || undefined, // Optional
        path: formData.path?.trim() || "",
        branch: formData.branch?.trim() || undefined,
        fields: formData.fields?.map((f: Field) => ({
          ...f,
          name: f.name.trim(),
        })) || [],
      };

      // If label is empty, remove it or leave undefined? Spec says: "If absent, Path is used".
      if (!sanitizedCollection.label) delete sanitizedCollection.label;
      // If branch is empty, remove
      if (!sanitizedCollection.branch) delete sanitizedCollection.branch;

      // 2. Validation (Basic)
      if (!sanitizedCollection.name) throw new Error("Identifier is required");
      if (!sanitizedCollection.path) throw new Error("Path is required");

      // 3. Update Config
      const newConfig: Config = JSON.parse(JSON.stringify(config));
      if (!newConfig.collections) newConfig.collections = [];

      if (mode === "add") {
        newConfig.collections.push(sanitizedCollection);
      } else {
        const index = newConfig.collections.findIndex((c) =>
          c.name === initialData?.name
        );
        if (index >= 0) {
          newConfig.collections[index] = sanitizedCollection;
        } else {
          newConfig.collections.push(sanitizedCollection);
        }
      }

      // 4. Save
      const res = await fetch(`/api/repo/${owner}/${repo}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "text/yaml",
        },
        body: yaml.dump(newConfig),
      });

      if (!res.ok) {
        throw new Error("Failed to save config");
      }

      onSave();
    } catch (e) {
      console.error(e);
      setError((e as Error).message);
      alert((e as Error).message);
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
        headers: { "Content-Type": "text/yaml" },
        body: yaml.dump(newConfig),
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
