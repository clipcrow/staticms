import React, { useEffect, useState } from "react";

interface OwnerSelectorProps {
  onSelect: (owner: string) => void;
  onLogout: () => void;
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

export const OwnerSelector: React.FC<OwnerSelectorProps> = ({
  onSelect,
  onLogout,
}) => {
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

  return (
    <div className="ui container" style={{ marginTop: "2em" }}>
      <div className="ui grid middle aligned">
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
          marginTop: "4em",
          maxWidth: "600px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <h2 className="ui header center aligned">
          Select Owner or Organization
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
              <div className="ui relaxed divided list selection">
                {user && (
                  <div
                    className="item"
                    onClick={() => onSelect(user.login)}
                  >
                    <img
                      className="ui avatar image"
                      src={user.avatar_url}
                      alt=""
                    />
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
                    <img
                      className="ui avatar image"
                      src={org.avatar_url}
                      alt=""
                    />
                    <div className="content">
                      <div className="header">{org.login}</div>
                      <div className="description">{org.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};
