import { useEffect, useState } from "react";
import yaml from "js-yaml";
import { Collection, Config } from "@/app/hooks/useContentConfig.ts";

interface ContentConfigEditorProps {
  owner: string;
  repo: string;
  config: Config; // Current full config
  initialData?: Collection; // If editing
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
  const [formData, setFormData] = useState<Partial<Collection>>({
    type: "collection",
    name: "",
    label: "",
    folder: "",
    fields: [],
  });
  // We use a simple text area for YAML fields definition for MVP
  const [fieldsYaml, setFieldsYaml] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "edit" && initialData) {
      setFormData(initialData);
      // Convert fields object back to YAML string for editing
      if (initialData.fields) {
        setFieldsYaml(yaml.dump(initialData.fields));
      }
    }
  }, [mode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Parse fields YAML
      let parsedFields = [];
      try {
        if (fieldsYaml.trim()) {
          // deno-lint-ignore no-explicit-any
          parsedFields = yaml.load(fieldsYaml) as any[];
        }
      } catch (e) {
        throw new Error("Invalid Fields YAML: " + (e as Error).message);
      }

      const newCollection: Collection = {
        ...formData as Collection,
        fields: parsedFields,
      };

      // Merge into config
      // Deep copy to avoid mutating prop/state directly
      const newConfig: Config = JSON.parse(JSON.stringify(config));
      if (!newConfig.collections) newConfig.collections = [];

      if (mode === "add") {
        newConfig.collections.push(newCollection);
      } else {
        // Edit
        const index = newConfig.collections.findIndex((c) =>
          c.name === initialData?.name
        );

        if (index >= 0) {
          newConfig.collections[index] = newCollection;
        } else {
          newConfig.collections.push(newCollection);
        }
      }

      // Save to API
      const res = await fetch(`/api/repo/${owner}/${repo}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: yaml.dump(newConfig),
      });

      if (!res.ok) {
        throw new Error("Failed to save config");
      }

      onSave(); // Should trigger reload in parent
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ui segment">
      <h2 className="ui header">
        {mode === "add" ? "Add Content" : "Edit Content"}
      </h2>

      {error && <div className="ui negative message">{error}</div>}

      <form className="ui form" onSubmit={handleSubmit}>
        <div className="field">
          <label>Type</label>
          <select
            value={formData.type || "collection"}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="collection">Collection (Folder based)</option>
            <option value="singleton">Singleton (Single file)</option>
          </select>
        </div>

        <div className="field">
          <label>Name (ID)</label>
          <input
            type="text"
            required
            placeholder="posts"
            value={formData.name || ""}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            // Disable name edit in edit mode for simplicity (as it is key)?
            // For now allow it, but logic above relies on previous name finding.
            // TODO: Handle rename correctly.
          />
        </div>

        <div className="field">
          <label>Label</label>
          <input
            type="text"
            required
            placeholder="Blog Posts"
            value={formData.label || ""}
            onChange={(e) =>
              setFormData({ ...formData, label: e.target.value })}
          />
        </div>

        {/* Conditional Path Input */}
        <div className="field">
          <label>
            {formData.type === "singleton" ? "File Path" : "Folder Path"}
          </label>
          {formData.type === "singleton"
            ? (
              <input
                type="text"
                placeholder="data/settings.json"
                value={formData.file || ""} // Accessing dynamic prop? Collection definition has folder/file
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    file: e.target.value,
                    folder: undefined,
                  })}
              />
            )
            : (
              <input
                type="text"
                placeholder="content/posts"
                value={formData.folder || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    folder: e.target.value,
                    file: undefined,
                  })}
              />
            )}
        </div>

        <div className="field">
          <label>Fields Definition (YAML)</label>
          <textarea
            rows={10}
            placeholder="- {label: 'Title', name: 'title', widget: 'string'}"
            value={fieldsYaml}
            onChange={(e) => setFieldsYaml(e.target.value)}
            style={{ fontFamily: "monospace" }}
          >
          </textarea>
        </div>

        <div className="ui buttons">
          <button
            type="button"
            className="ui button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <div className="or"></div>
          <button type="submit" className="ui primary button" disabled={saving}>
            {saving ? "Saving..." : "Save Config"}
          </button>
        </div>
      </form>
    </div>
  );
}
