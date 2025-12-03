import React, { useEffect, useState } from "react";
import { Header } from "./Header.tsx";
import { getUsername } from "../hooks/utils.ts";
import { ContentListItem } from "./ContentListItem.tsx";

interface RepositorySelectorProps {
  onSelect: (repoFullName: string) => void;
  onLogout: () => void;
  isLoggingOut?: boolean;
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
  isLoggingOut,
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

  const username = getUsername();

  return (
    <div className="ui container">
      <Header
        rootLink={false}
        breadcrumbs={[
          {
            label: "Select Repository",
          },
        ]}
        rightContent={
          <button
            type="button"
            className={`ui button ${isLoggingOut ? "loading" : ""}`}
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            <i className="sign out icon"></i>
            Logout
          </button>
        }
      />

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
                    Please install the Staticms GitHub App on your repositories.
                  </p>
                </div>
              )
              : (
                <div className="ui relaxed divided list">
                  {repos.map((repo) => {
                    const draftPrefix =
                      `draft_${username}|${repo.owner.login}|${repo.name}|`;
                    const prPrefix =
                      `pr_${username}|${repo.owner.login}|${repo.name}|`;
                    let hasDraft = false;
                    let hasPr = false;

                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key?.startsWith(draftPrefix)) hasDraft = true;
                      if (key?.startsWith(prPrefix)) hasPr = true;
                      if (hasDraft && hasPr) break;
                    }

                    return (
                      <ContentListItem
                        key={repo.id}
                        title={
                          <div
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            <span
                              style={{
                                fontWeight: "bold",
                                marginRight: "1em",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {repo.full_name}
                            </span>
                            <span
                              style={{
                                color: "rgba(0,0,0,0.6)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {repo.description || ""}
                            </span>
                          </div>
                        }
                        icon={<i className="large github icon" />}
                        onClick={() => onSelect(repo.full_name)}
                        labels={
                          <>
                            {hasPr && (
                              <span
                                className="ui label orange mini basic"
                                style={{ marginLeft: "0.5em" }}
                              >
                                <i className="lock icon"></i>
                                PR Open
                              </span>
                            )}
                            {hasDraft && (
                              <span
                                className="ui label gray mini basic"
                                style={{ marginLeft: "0.5em" }}
                              >
                                <i className="edit icon"></i>
                                Draft / PR
                              </span>
                            )}
                            {repo.private && (
                              <i
                                className="large lock icon"
                                style={{ marginLeft: "1em" }}
                              />
                            )}
                          </>
                        }
                      />
                    );
                  })}
                </div>
              )}
          </div>
        )}
    </div>
  );
};
