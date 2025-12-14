import { useState } from "react";
import yaml from "js-yaml";
import { Collection, Config, Field } from "@/app/hooks/useContentConfig.ts";
import { ConfigForm } from "@/app/components/config/ConfigForm.tsx";
import { RepoBreadcrumbLabel } from "@/app/components/common/RepoBreadcrumb.tsx";
import { fetchWithAuth } from "@/app/utils/fetcher.ts";

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
    fields: [],
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
      const rawId = formData.path;
      const generatedName = (rawId || "").toLowerCase().replace(
        /[^a-z0-9]+/g,
        "-",
      ).replace(/(^-|-$)/g, "");

      // 1. Sanitization
      const sanitizedCollection: Collection = {
        ...formData,
        name: generatedName,
        label: formData.label?.trim() || undefined, // Optional
        path: formData.path?.trim().replace(/^\//, "") || "",
        // branch: formData.branch?.trim() || undefined, // Removed
        fields: formData.fields?.map((f: Field) => ({
          ...f,
          name: f.name.trim(),
        })) || [],
      };

      // If label is empty, remove it or leave undefined? Spec says: "If absent, Path is used".
      if (!sanitizedCollection.label) delete sanitizedCollection.label;

      // 2. Validation (Basic)
      if (!sanitizedCollection.name) throw new Error("Identifier is required");
      if (!sanitizedCollection.path) throw new Error("Path is required");

      // Check for duplicate path
      const isDuplicate = config.collections?.some((c) => {
        // Skip self if editing
        if (mode === "edit" && c.name === initialData?.name) return false;
        return c.path === sanitizedCollection.path;
      });

      if (isDuplicate) {
        throw new Error("Content with this path already exists.");
      }

      // 3. Path Existence Check
      const branchParam = config.branch
        ? `?branch=${encodeURIComponent(config.branch)}`
        : "";

      let validatePath = sanitizedCollection.path;
      if (
        sanitizedCollection.type === "singleton" &&
        sanitizedCollection.binding === "directory"
      ) {
        validatePath = `${validatePath}/index.md`.replace(/\/+/g, "/");
      }

      const valRes = await fetchWithAuth(
        `/api/repo/${owner}/${repo}/contents/${validatePath}${branchParam}`,
      );

      if (valRes.status === 404) {
        throw new Error(`Path does not exist in repository: ${validatePath}`);
      }
      if (!valRes.ok) {
        throw new Error(`Failed to validate path: ${validatePath}`);
      }

      const contentType = valRes.headers.get("content-type") || "";
      let isDirectory = false;

      if (contentType.includes("application/json")) {
        const valData = await valRes.json();
        if (Array.isArray(valData)) {
          isDirectory = true;
        }
      } else {
        await valRes.text(); // Consume body
      }

      if (sanitizedCollection.type === "collection") {
        if (!isDirectory) {
          throw new Error(
            `Path '${validatePath}' must be a folder (for Collection).`,
          );
        }
      } else {
        // Singleton (File or Directory->index.md)
        if (isDirectory) {
          throw new Error(`Path '${validatePath}' must be a file.`);
        }
      }

      // 4. Update Config
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
      const res = await fetchWithAuth(`/api/repo/${owner}/${repo}/config`, {
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

      const res = await fetchWithAuth(`/api/repo/${owner}/${repo}/config`, {
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

  const breadcrumbs = [
    {
      label: (
        <RepoBreadcrumbLabel
          owner={owner}
          repo={repo}
          branch={config.branch || "main"}
        />
      ),
      to: `/${owner}/${repo}`,
    },
  ];
  const title = mode === "add" ? "New Content" : "Content Settings";

  return (
    <ConfigForm
      formData={formData}
      setFormData={setFormData}
      editingIndex={mode === "edit" ? 1 : null}
      onSave={handleSubmit}
      onCancel={onCancel}
      onDelete={handleDelete}
      repoInfo={{ owner, repo }}
      loading={saving}
      breadcrumbs={breadcrumbs}
      title={title}
    />
  );
}
