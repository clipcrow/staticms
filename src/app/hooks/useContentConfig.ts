import { Content } from "../types.ts";
import { useCallback, useEffect, useState } from "react";

export const useContentConfig = () => {
  const [contents, setContents] = useState<Content[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
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

  const saveContentConfig = useCallback(
    async (newContent: Content, originalFilePath?: string) => {
      setIsSavingConfig(true);
      let newContents = [...contents];

      const existingIndex = originalFilePath
        ? contents.findIndex((c) =>
          c.owner === newContent.owner && c.repo === newContent.repo &&
          c.filePath === originalFilePath
        )
        : -1;

      // Validate file existence
      try {
        const params = new URLSearchParams({
          owner: newContent.owner,
          repo: newContent.repo,
          filePath: newContent.filePath,
          t: Date.now().toString(),
          validate: "true",
        });
        if (newContent.branch) {
          params.append("branch", newContent.branch);
        }
        const checkRes = await fetch(`/api/content?${params.toString()}`);
        if (checkRes.status === 404) {
          if (newContent.type === "singleton" || !newContent.type) {
            alert("Content path not found in the repository.");
            setIsSavingConfig(false);
            return false;
          } else {
            alert("Collection path not found in the repository.");
            setIsSavingConfig(false);
            return false;
          }
        }
        if (checkRes.ok) {
          const data = await checkRes.json();
          if (
            data.type === "dir" &&
            (newContent.type === "singleton" || !newContent.type)
          ) {
            // If it's a directory and type is singleton, append index.md
            const newFilePath = newContent.filePath.endsWith("/")
              ? `${newContent.filePath}index.md`
              : `${newContent.filePath}/index.md`;

            newContent = { ...newContent, filePath: newFilePath };
          } else if (
            data.type === "file" &&
            (newContent.type === "collection-files" ||
              newContent.type === "collection-dirs")
          ) {
            alert("Path points to a file, but type is Collection.");
            setIsSavingConfig(false);
            return false;
          }
        } else {
          console.error("Failed to validate file path");
        }
      } catch (e) {
        console.error("Error validating file path", e);
      }

      if (existingIndex !== -1) {
        newContents[existingIndex] = newContent;
      } else {
        newContents = [...contents, newContent];
      }

      try {
        const res = await fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: newContents }),
        });
        if (res.ok) {
          setContents(newContents);
          return true;
        } else {
          console.error("Failed to save configuration");
          return false;
        }
      } catch (e) {
        console.error(e);
        return false;
      } finally {
        setIsSavingConfig(false);
      }
    },
    [contents],
  );

  const deleteContent = useCallback(
    async (owner: string, repo: string, filePath: string) => {
      if (!confirm("Are you sure you want to delete this content?")) {
        return false;
      }
      setIsSavingConfig(true);
      const newContents = contents.filter((c) =>
        !(c.owner === owner && c.repo === repo && c.filePath === filePath)
      );
      try {
        const res = await fetch("/api/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: newContents }),
        });
        if (res.ok) {
          setContents(newContents);
          return true;
        } else {
          console.error("Failed to delete content");
          return false;
        }
      } catch (e) {
        console.error(e);
        return false;
      } finally {
        setIsSavingConfig(false);
      }
    },
    [contents],
  );

  return {
    contents,
    configLoading,
    isSavingConfig,
    saveContentConfig,
    deleteContent,
  };
};
