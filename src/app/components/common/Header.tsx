import React from "react";
import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: React.ReactNode;
  to?: string;
  onClick?: () => void;
  // deno-lint-ignore no-explicit-any
  state?: any;
}

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  title?: React.ReactNode;
  rightContent?: React.ReactNode;
  rootLink?: boolean;
}

export const Header = ({
  breadcrumbs,
  title,
  rightContent,
  rootLink = true,
}: HeaderProps) => {
  const TitleContent = () => (
    <>
      <img
        src="/logo.svg"
        alt="Staticms"
        className="staticms-header-logo-img"
      />
      <div className="content">
        <div className="header-text">Staticms</div>
        <div className="sub-header-text">
          Manage headless contents with GitHub
        </div>
      </div>
    </>
  );

  return (
    <div className="staticms-header-container">
      <div className="staticms-header-start">
        {rootLink
          ? (
            // @ts-ignore: React 19 types issue
            <Link to="/" className="staticms-header-title">
              <TitleContent />
            </Link>
          )
          : (
            <div className="staticms-header-title">
              <TitleContent />
            </div>
          )}

        {(breadcrumbs || title) && (
          <div className="ui breadcrumb staticms-header-breadcrumb staticms-header-breadcrumb-container">
            {/* Root GitHub Icon */}
            {rootLink
              ? (
                // @ts-ignore: React 19 types issue
                <Link to="/" className="section">
                  <i className="github icon"></i>
                </Link>
              )
              : (
                <div className="section">
                  <i className="github icon"></i>
                </div>
              )}

            {/* Breadcrumbs (Path) */}
            {breadcrumbs?.map((item, index) => (
              <React.Fragment key={index}>
                <i className="right chevron icon divider"></i>
                {item.to
                  ? (
                    // @ts-ignore: React 19 types issue
                    <Link to={item.to} className="section" state={item.state}>
                      {item.label}
                    </Link>
                  )
                  : item.onClick
                  ? (
                    <span
                      className="section clickable staticms-clickable-text"
                      onClick={item.onClick}
                    >
                      {item.label}
                    </span>
                  )
                  : <div className="section">{item.label}</div>}
              </React.Fragment>
            ))}

            {title && (
              <div className="section staticms-header-breadcrumb-title">
                {title}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="staticms-header-end">
        {rightContent}
      </div>
    </div>
  );
};
