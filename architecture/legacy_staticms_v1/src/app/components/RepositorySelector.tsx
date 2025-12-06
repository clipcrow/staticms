import React, { useEffect, useState } from "react";
import { Header } from "./Header.tsx";
import { getRepoStatus } from "../hooks/utils.ts";
import { ContentListItem } from "./ContentListItem.tsx";

interface RepositorySelectorProps {
  onSelect: (repoFullName: string) => void;
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
}) => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = React.useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const eventSource = new EventSource("/api/events");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "repository_update") {
          console.log("Repository update received, refreshing list...");
          fetchData();
        }
      } catch (e) {
        console.error("Error parsing SSE event", e);
      }
    };
    return () => {
      eventSource.close();
    };
  }, [fetchData]);

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
          <div style={{ display: "flex", gap: "0.5em" }}>
            <a
              // Set by esbuild
              // deno-lint-ignore no-process-global
              href={process.env.STATICMS_GITHUB_APP_URL}
              target="_blank"
              rel="noreferrer"
              className="ui button primary"
            >
              <i className="plus icon"></i>
              Add Repository
            </a>
          </div>
        }
      />

      {loading
        ? (
          <div className="ui segment">
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
                    const status = getRepoStatus(repo.owner.login, repo.name);

                    return (
                      <ContentListItem
                        key={repo.id}
                        icon={<i className="large github icon" />}
                        primaryText={repo.full_name}
                        secondaryText={repo.description || ""}
                        status={status}
                        labels={
                          <>
                            {repo.private && (
                              <i
                                className="large lock icon"
                                style={{ marginLeft: "1em" }}
                              />
                            )}
                          </>
                        }
                        onClick={() => onSelect(repo.full_name)}
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
