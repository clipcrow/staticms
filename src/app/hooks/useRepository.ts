import { useCallback, useState } from "react";

export const useRepository = () => {
  const [selectedRepo, setSelectedRepoState] = useState<string | null>(
    localStorage.getItem("staticms_repo"),
  );

  const selectRepo = useCallback((repo: string) => {
    setSelectedRepoState(repo);
    localStorage.setItem("staticms_repo", repo);
  }, []);

  const clearRepo = useCallback(() => {
    setSelectedRepoState(null);
    localStorage.removeItem("staticms_repo");
  }, []);

  return {
    selectedRepo,
    selectRepo,
    clearRepo,
  };
};
