import { useNavigate } from "react-router-dom";
import { RepositorySelector as V1RepositorySelector } from "@/app/components/repository/RepositorySelector.tsx";

export function RepositorySelector() {
  const navigate = useNavigate();

  const handleSelect = (repoFullName: string) => {
    navigate(`/${repoFullName}`);
  };

  return <V1RepositorySelector onSelect={handleSelect} />;
}
