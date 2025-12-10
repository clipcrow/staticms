import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";

export function ConfigDebugger() {
  const { owner, repo } = useParams();
  const { config, loading, error } = useContentConfig(owner, repo);
  const [localStorageData, setLocalStorageData] = useState<
    Record<string, unknown>
  >({});

  useEffect(() => {
    if (!owner || !repo) return;
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(owner) && key.includes(repo)) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key)!);
        } catch {
          data[key] = localStorage.getItem(key);
        }
      }
    }
    setLocalStorageData(data);
  }, [owner, repo]);

  return (
    <div className="ui container" style={{ marginTop: "2rem" }}>
      <h2>Config Debugger: {owner}/{repo}</h2>

      <div className="ui segment">
        <h3>Config Data (Raw)</h3>
        {loading && <div>Loading...</div>}
        {error && <div className="ui error message">{error.message}</div>}
        {config && (
          <pre
            style={{ background: "#f0f0f0", padding: "1em", overflow: "auto" }}
          >
            {JSON.stringify(config, null, 2)}
          </pre>
        )}
      </div>

      <div className="ui segment">
        <h3>LocalStorage (Related to Repo)</h3>
        <pre
          style={{ background: "#f0f0f0", padding: "1em", overflow: "auto" }}
        >
          {JSON.stringify(localStorageData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
