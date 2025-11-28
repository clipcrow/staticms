import React, { useEffect, useState } from "react";

interface OwnerSelectorProps {
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

export const OwnerSelector: React.FC<OwnerSelectorProps> = ({
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
    <div
      className="ui container"
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      <div
        className="ui grid middle aligned"
        style={{ marginTop: "2em", flexShrink: 0 }}
      >
        <div className="twelve wide column">
          <h1 className="ui header">
            <i className="edit icon"></i>
            <div className="content">
              Staticms
              <div className="sub header">
                Manage headless contents with GitHub
              </div>
            </div>
          </h1>
        </div>
        <div className="four wide column right aligned">
          <button type="button" className="ui button" onClick={onLogout}>
            <i className="sign out icon"></i>
            Logout
          </button>
        </div>
      </div>

      <div
        style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: "15vh",
        }}
      >
        <div style={{ width: "100%", maxWidth: "600px" }}>
          <h2 className="ui header center aligned">
            Select Repository
          </h2>
          {loading
            ? (
              <div className="ui segment" style={{ minHeight: "200px" }}>
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
