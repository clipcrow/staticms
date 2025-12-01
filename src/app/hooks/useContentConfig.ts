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
        alert("Content path not found in the repository.");
        setIsSavingConfig(false);
        return;
      }
      if (checkRes.ok) {
        const data = await checkRes.json();
        if (data.type === "dir") {
          // If it's a directory, append index.md
          const newFilePath = formData.filePath.endsWith("/")
            ? `${formData.filePath}index.md`
            : `${formData.filePath}/index.md`;

          const updatedFormData = { ...formData, filePath: newFilePath };

          if (editingIndex !== null) {
            newContents[editingIndex] = updatedFormData;
          } else {
            newContents[newContents.length - 1] = updatedFormData;
          }
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
