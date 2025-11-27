import React, { useEffect, useState } from "react";
import { Loading } from "./Loading.tsx";

interface OwnerSelectorProps {
  onSelect: (owner: string) => void;
}

interface User {
  login: string;
  avatar_url: string;
  name: string;
}

interface Org {
  login: string;
  avatar_url: string;
  description: string;
}

export const OwnerSelector: React.FC<OwnerSelectorProps> = ({ onSelect }) => {
  const [user, setUser] = useState<User | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, orgsRes] = await Promise.all([
          fetch("/api/user"),
          fetch("/api/user/orgs"),
        ]);

        if (userRes.ok && orgsRes.ok) {
          const userData = await userRes.json();
          const orgsData = await orgsRes.json();
          setUser(userData);
          setOrgs(orgsData);
        }
      } catch (e) {
        console.error("Failed to fetch user data", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <div
      className="ui container"
      style={{ marginTop: "5em", maxWidth: "600px" }}
    >
      <h2 className="ui header center aligned">Select Owner or Organization</h2>
      <div className="ui segment">
        <div className="ui relaxed divided list selection">
          {user && (
            <div className="item" onClick={() => onSelect(user.login)}>
              <img className="ui avatar image" src={user.avatar_url} alt="" />
              <div className="content">
                <div className="header">{user.login}</div>
                <div className="description">Personal Account</div>
              </div>
            </div>
          )}
          {orgs.map((org) => (
            <div
              key={org.login}
              className="item"
              onClick={() => onSelect(org.login)}
            >
              <img className="ui avatar image" src={org.avatar_url} alt="" />
              <div className="content">
                <div className="header">{org.login}</div>
                <div className="description">{org.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
