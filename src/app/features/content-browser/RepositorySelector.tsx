import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
}

export function RepositorySelector() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/repositories")
      .then((res) => res.json())
      .then((data) => {
        setRepos(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch repos", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="ui active centered inline loader"></div>;
  }

  return (
    <div className="ui container" style={{ marginTop: "2em" }}>
      <h1 className="ui header">Select Repository</h1>
      <div className="ui relaxed divided list repository-list">
        {repos.map((repo) => (
          <div className="item repo-item" key={repo.id} role="listitem">
            <i className="large github middle aligned icon"></i>
            <div className="content">
              <Link className="header" to={`/repo/${repo.full_name}`}>
                {repo.full_name}
              </Link>
              <div className="description">{repo.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
