import { useCallback, useState } from "react";

export const useRepository = () => {
  const [currentRepo, setCurrentRepo] = useState<string | null>(
    localStorage.getItem("staticms_repo"),
  );

  const selectRepo = useCallback((repo: string) => {
    setCurrentRepo(repo);
    localStorage.setItem("staticms_repo", repo);
  }, []);

  const clearRepo = useCallback(() => {
    setCurrentRepo(null);
    localStorage.removeItem("staticms_repo");
  }, []);

  return {
    currentRepo,
    selectRepo,
    clearRepo,
  };
};
