import { useNavigate } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { BranchManagement } from "./BranchManagement.tsx";
import { useLoading, useSetHeader } from "@/app/contexts/HeaderContext.tsx";

interface BranchManagementPageProps {
  owner?: string;
  repo?: string;
}

export function BranchManagementPage(
  { owner, repo }: BranchManagementPageProps,
) {
  const navigate = useNavigate();
  // Ensure owner/repo are present before calling hook, or hook should handle skip
  const { config, loading, error } = useContentConfig(owner, repo);

  useLoading(loading);
  useSetHeader([], undefined);

  if (!owner || !repo) {
    // Should not happen if called correctly
    return null;
  }

  const handleBack = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <div className="ui placeholder segment">
          <div className="ui active inverted dimmer">
            <div className="ui loader"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <div className="ui negative message">
          Error loading configuration: {error?.message || "Unknown error"}
          <div style={{ marginTop: "1rem" }}>
            <button type="button" className="ui button" onClick={handleBack}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BranchManagement
      owner={owner}
      repo={repo}
      initialConfig={config}
      onCancel={handleBack}
      onSave={handleBack}
    />
  );
}
