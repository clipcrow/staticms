import React, { useState } from "react";

interface RepositorySettingsProps {
  onNext: (owner: string, repo: string, branch?: string) => void;
  onCancel: () => void;
}

export const RepositorySettings: React.FC<RepositorySettingsProps> = ({
  onNext,
  onCancel,
}) => {
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(owner, repo, branch || undefined);
  };

  return (
    <div className="ui container" style={{ marginTop: "2em" }}>
      <div className="ui segment">
        <h2 className="ui header">
          Add Repository
          <div className="sub header">
            Configure a new GitHub repository.
          </div>
        </h2>

        <form onSubmit={handleSubmit} className="ui form">
          <div className="field">
            <label>GitHub Owner</label>
            <input
              type="text"
              placeholder="e.g. facebook"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>GitHub Repo</label>
            <input
              type="text"
              placeholder="e.g. react"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Branch (Optional)</label>
            <input
              type="text"
              placeholder="e.g. main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </div>

          <div className="actions">
            <button
              type="button"
              onClick={onCancel}
              className="ui button"
            >
              Cancel
            </button>
            <button type="submit" className="ui primary button">
              Next
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
