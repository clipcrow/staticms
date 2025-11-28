import React from "react";

interface HeaderProps {
  onLogout?: () => void;
  children?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  onLogout,
  children,
  rightContent,
}) => {
  return (
    <div
      style={{
        marginTop: "2em",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <h1
          className="ui header"
          style={{ margin: "0 1em 0 0", flexShrink: 0 }}
        >
          <i className="edit icon"></i>
          <div className="content">
            Staticms
            <div className="sub header">
              Manage headless contents with GitHub
            </div>
          </div>
        </h1>
        {children && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderLeft: "1px solid rgba(34,36,38,.15)",
              paddingLeft: "1em",
            }}
          >
            {children}
          </div>
        )}
      </div>
      <div>
        {rightContent
          ? rightContent
          : onLogout && (
            <button type="button" className="ui button" onClick={onLogout}>
              <i className="sign out icon"></i>
              Logout
            </button>
          )}
      </div>
    </div>
  );
};
