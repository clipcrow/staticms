import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useContentConfig } from "../hooks/useContentConfig.ts";
import { ContentSettings } from "../components/ContentSettings.tsx";
import { Content } from "../types.ts";

export const ContentSettingsWrapper: React.FC = () => {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const [searchParams] = useSearchParams();
  const pathParam = searchParams.get("path");
  // Use pathParam as filePath for consistency in the rest of the file
  const filePath = pathParam;
  const navigate = useNavigate();
  const {
    contents,
    configLoading,
    saveContentConfig,
    deleteContent,
    isSavingConfig,
  } = useContentConfig();

  const [formData, setFormData] = useState<Content>({
    owner: owner || "",
    repo: repo || "",
    filePath: "",
    type: "singleton-file",
    fields: [],
  });

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (owner && repo) {
      setFormData((prev) => ({ ...prev, owner, repo }));
    }
  }, [owner, repo]);

  useEffect(() => {
    if (!configLoading && filePath && contents.length > 0) {
      const decodedPath = decodeURIComponent(filePath);
      const index = contents.findIndex(
        (c) =>
          c.owner === owner && c.repo === repo && c.filePath === decodedPath,
      );
      if (index !== -1) {
        setFormData(contents[index]);
        setEditingIndex(index);
      }
    }
  }, [configLoading, filePath, contents, owner, repo]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const getCanonicalPath = (c: Content) => {
      if (c.type === "singleton-dir") {
        return c.filePath.endsWith("/")
          ? `${c.filePath}index.md`
          : `${c.filePath}/index.md`;
      }
      return c.filePath;
    };

    const newCanonicalPath = getCanonicalPath(formData);

    const isDuplicate = contents.some((c) => {
      if (c.owner !== owner || c.repo !== repo) return false;

      const existingCanonicalPath = getCanonicalPath(c);

      if (existingCanonicalPath === newCanonicalPath) {
        if (!filePath) return true; // Creating new content
        // Editing existing content: ignore if it's the same content we are editing
        // We compare original file paths to identify if it's the same config entry
        if (c.filePath === decodeURIComponent(filePath)) return false;
        return true;
      }
      return false;
    });

    if (isDuplicate) {
      alert("The file or directory path is already in use in this repository.");
      return;
    }

    const success = await saveContentConfig(
      formData,
      filePath ? decodeURIComponent(filePath) : undefined,
    );
    if (success) {
      navigate(`/${owner}/${repo}`);
    }
  };

  const handleDelete = async () => {
    if (filePath) {
      const success = await deleteContent(
        owner!,
        repo!,
        decodeURIComponent(filePath),
      );
      if (success) {
        navigate(`/${owner}/${repo}`);
      }
    }
  };

  const handleCancel = () => {
    navigate(`/${owner}/${repo}`);
  };

  if (configLoading) {
    return <div className="ui active centered inline loader"></div>;
  }

  if (!owner || !repo) {
    return <div>Invalid Repository</div>;
  }

  return (
    <ContentSettings
      formData={formData}
      setFormData={setFormData}
      editingIndex={editingIndex}
      onSave={handleSave}
      onCancel={handleCancel}
      onDelete={handleDelete}
      repoInfo={{ owner, repo }}
      loading={isSavingConfig}
    />
  );
};
