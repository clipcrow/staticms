import React, { useEffect, useState } from "react";
import { Header } from "./Header.tsx";

interface RepositorySelectorProps {
  onSelect: (repoFullName: string) => void;
  onLogout: () => void;
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  private: boolean;
  description: string | null;
}

export const RepositorySelector: React.FC<RepositorySelectorProps> = ({
  onSelect,
  onLogout,
}) => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/user/repos");
        if (response.ok) {
          const data = await response.json();
          setRepos(data);
        }
      } catch (e) {
        console.error("Failed to fetch repositories", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="ui container staticms-repo-selector-container">
      <Header onLogout={onLogout} />

      <div className="staticms-repo-selector-content">
        <div className="staticms-repo-selector-inner">
          <h2 className="ui header center aligned">
            Select Repository
          </h2>
          {loading
            ? (
              <div className="ui segment staticms-repo-selector-loading-segment">
                <div className="ui active inverted dimmer">
                  <div className="ui loader"></div>
                </div>
              </div>
            )
            : (
              <div className="ui segment">
                {repos.length === 0
                  ? (
                    <div className="ui message warning">
                      <div className="header">No repositories found</div>
                      <p>
                        Please install the Staticms GitHub App on your
                        repositories.
                      </p>
                    </div>
                  )
                  : (
                    <div className="ui relaxed divided list selection">
                      {repos.map((repo) => (
                        <div
                          key={repo.id}
                          className="item"
                          onClick={() => onSelect(repo.full_name)}
                        >
                          <i
                            className={`large middle aligned icon ${
                              repo.private ? "lock" : "github"
                            }`}
                          />
                          <div className="content">
                            <div className="header">{repo.full_name}</div>
                            <div className="description">
                              {repo.description || "No description"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
