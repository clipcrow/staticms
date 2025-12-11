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
  const TitleContent = () => (
    <>
      <img
        src="/logo.svg"
        alt="Staticms"
        style={{ height: "32px", verticalAlign: "middle" }}
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

        {breadcrumbs && (
          <>
            <div className="ui breadcrumb staticms-header-breadcrumb">
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

              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;
                // If rootLink is effectively disabled (false), we treat the first breadcrumb as a caption,
                // so we skip the divider between the root icon and the first item.
                const showDivider = !(index === 0 && !rootLink);

                return (
                  <React.Fragment key={index}>
                    {showDivider && (
                      <i className="right chevron icon divider"></i>
                    )}
                    {!isLast && item.to
                      ? (
                        // @ts-ignore: React 19 types issue
                        <Link to={item.to} className="section">
                          {item.label}
                        </Link>
                      )
                      : !isLast && item.onClick
                      ? (
                        <span
                          className="section clickable"
                          onClick={item.onClick}
                          style={{ cursor: "pointer" }}
                        >
                          {item.label}
                        </span>
                      )
                      : <div className="active section">{item.label}</div>}
                  </React.Fragment>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div className="staticms-header-end">
        {rightContent}
      </div>
    </div>
  );
};
