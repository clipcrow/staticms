import React from "react";

interface HeaderProps {
  onLogout?: () => void;
  children?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export const Header = ({
  onLogout,
  children,
  rightContent,
}: HeaderProps) => {
  return (
    <div className="staticms-header-container">
      <div className="staticms-header-left">
        <h1 className="ui header staticms-header-title">
          <i className="edit icon"></i>
          <div className="content">
            Staticms
            <div className="sub header">
              Manage headless contents with GitHub
            </div>
          </div>
        </h1>
        {children && (
          <div className="staticms-header-children">
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
