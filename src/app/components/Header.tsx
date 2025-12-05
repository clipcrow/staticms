import React from "react";
import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: React.ReactNode;
  to?: string;
  onClick?: () => void;
}

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  rightContent?: React.ReactNode;
  rootLink?: boolean;
}

export const Header = ({
  breadcrumbs,
  rightContent,
  rootLink = true,
}: HeaderProps) => {
  return (
    <div className="staticms-header-container">
      <div className="staticms-header-left">
        <h1 className="ui header staticms-header-title">
          <i className="edit icon"></i>
          <div className="content">
            Staticms
            <div className="sub header staticms-header-subtitle">
              Manage headless contents with GitHub
            </div>
          </div>
        </h1>
        {breadcrumbs && (
          <div className="staticms-header-children">
            <div className="ui breadcrumb staticms-header-breadcrumb">
              {rootLink
                ? (
                  <Link to="/" className="section">
                    <i className="github icon"></i>
                  </Link>
                )
                : (
                  <div className="section">
                    <i className="github icon"></i>
                  </div>
                )}
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={index}>
                  {(rootLink || index > 0) && (
                    <i className="right chevron icon divider"></i>
                  )}
                  {item.to
                    ? (
                      <Link to={item.to} className="section">
                        {item.label}
                      </Link>
                    )
                    : item.onClick
                    ? (
                      <span
                        className="section"
                        onClick={item.onClick}
                        style={{ cursor: "pointer", color: "#4183c4" }}
                      >
                        {item.label}
                      </span>
                    )
                    : <div className="active section">{item.label}</div>}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="staticms-header-right">
        {rightContent}
      </div>
    </div>
  );
};
