import { Content, ViewState } from "../types.ts";
import { useCallback, useEffect, useState } from "react";

export const useContentConfig = (
  setView: (view: ViewState) => void,
  currentRepo: string | null,
) => {
  const [contents, setContents] = useState<Content[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [formData, setFormData] = useState<Content>({
    owner: "",
    repo: "",
    filePath: "",
    type: "singleton",
    fields: [],
  });
  const [targetRepo, setTargetRepo] = useState<
    {
      owner: string;
      repo: string;
      branch?: string;
    } | null
  >(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Load config
  useEffect(() => {
    const init = async () => {
      try {
        const configRes = await fetch("/api/config");
        const data = await configRes.json();
        if (data && data.contents) {
          // Ensure fields array exists for older configs
          const contentsWithFields = data.contents.map((c: Content) => ({
            ...c,
            fields: c.fields || [],
            type: c.type || "singleton",
          }));
          setContents(contentsWithFields);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setConfigLoading(false);
      }
    };
    init();
  }, []);

  const filteredContents = contents.filter((c) => {
    if (!currentRepo) return false;
    const [owner, repo] = currentRepo.split("/");
    return c.owner === owner && c.repo === repo;
  });

  const handleAddNewContentToRepo = useCallback((
    owner: string,
    repo: string,
    branch?: string,
  ) => {
    setTargetRepo({ owner, repo, branch });
    setFormData({
      owner,
      repo,
      branch,
      filePath: "",
      type: "singleton",
      fields: [],
    });
    setEditingIndex(null);
    setView("content-settings");
  }, [setView]);

  const handleEditContentConfig = useCallback((index: number) => {
    const content = contents[index];
    setTargetRepo({
      owner: content.owner,
      repo: content.repo,
      branch: content.branch,
    });
    setFormData({
      ...content,
      fields: content.fields || [],
      type: content.type || "singleton",
    });
    setEditingIndex(index);
    setView("content-settings");
  }, [contents, setView]);

  const handleSaveContentConfig = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    let newContents = [...contents];
    if (editingIndex !== null) {
      newContents[editingIndex] = formData;
    } else {
      newContents = [...contents, formData];
    }

    // Validate file existence
    try {
      const params = new URLSearchParams({
        owner: formData.owner,
        repo: formData.repo,
        filePath: formData.filePath,
        t: Date.now().toString(),
        validate: "true",
      });
      if (formData.branch) {
        params.append("branch", formData.branch);
      }
      const checkRes = await fetch(`/api/content?${params.toString()}`);
      if (checkRes.status === 404) {
        // For collection, 404 might be acceptable if creating new dir, but usually we want to check if it exists or parent exists.
        // For now, let's warn but allow saving if it's a collection (maybe user wants to create it later or it's empty)
        // Or strictly, if it's singleton, file MUST exist or be creatable.
        // If it's collection, dir MUST exist?
        // Let's keep simple: warn if 404.
        if (formData.type === "singleton" || !formData.type) {
          alert("Content path not found in the repository.");
          setIsSavingConfig(false);
          return;
        } else {
          // Collection: warn but allow? Or maybe just alert?
          // If collection path doesn't exist, we probably can't list files.
          // Let's alert for now.
          alert("Collection path not found in the repository.");
          setIsSavingConfig(false);
          return;
        }
      }
      if (checkRes.ok) {
        const data = await checkRes.json();
        if (
          data.type === "dir" &&
          (formData.type === "singleton" || !formData.type)
        ) {
          // If it's a directory and type is singleton, append index.md
          const newFilePath = formData.filePath.endsWith("/")
            ? `${formData.filePath}index.md`
            : `${formData.filePath}/index.md`;

          const updatedFormData = { ...formData, filePath: newFilePath };

          if (editingIndex !== null) {
            newContents[editingIndex] = updatedFormData;
          } else {
            newContents[newContents.length - 1] = updatedFormData;
          }
        } else if (
          data.type === "file" &&
          (formData.type === "collection-files" ||
            formData.type === "collection-dirs")
        ) {
          alert("Path points to a file, but type is Collection.");
          setIsSavingConfig(false);
          return;
        }
      } else {
        console.error("Failed to validate file path");
      }
    } catch (e) {
      console.error("Error validating file path", e);
    }

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: newContents }),
      });
      if (res.ok) {
        setContents(newContents);
        setFormData({ owner: "", repo: "", filePath: "", fields: [] });
        setEditingIndex(null);
        setTargetRepo(null);
        setView("content-list");
      } else {
        console.error("Failed to save configuration");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingConfig(false);
    }
  }, [contents, editingIndex, formData, setView]);

  const handleDeleteContent = useCallback(async (index: number) => {
    if (!confirm("Are you sure you want to delete this content?")) return;
    setIsSavingConfig(true);
    const newContents = contents.filter((_, i) => i !== index);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: newContents }),
      });
      if (res.ok) {
        setContents(newContents);
        setFormData({ owner: "", repo: "", filePath: "", fields: [] });
        setEditingIndex(null);
        setTargetRepo(null);
        setView("content-list");
      } else {
        console.error("Failed to delete content");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingConfig(false);
    }
  }, [contents, setView]);

  return {
    contents,
    filteredContents,
    configLoading,
    formData,
    setFormData,
    targetRepo,
    setTargetRepo,
    editingIndex,
    setEditingIndex,
    isSavingConfig,
    handleAddNewContentToRepo,
    handleEditContentConfig,
    handleSaveContentConfig,
    handleDeleteContent,
  };
};
