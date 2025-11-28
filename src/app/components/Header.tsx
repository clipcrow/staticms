import React from "react";

interface HeaderProps {
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  return (
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
      {onLogout && (
        <div className="four wide column right aligned">
          <button type="button" className="ui button" onClick={onLogout}>
            <i className="sign out icon"></i>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};
