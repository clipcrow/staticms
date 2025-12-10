import React from "react";
import { ContentStatus } from "@/app/components/editor/utils.ts";
import { StatusBadge } from "./StatusBadge.tsx";

interface ContentListItemProps {
  icon?: React.ReactNode;
  primaryText: string;
  secondaryText?: string;
  status?: ContentStatus;
  labels?: React.ReactNode;
  actions?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick: () => void;
}

export const ContentListItem: React.FC<ContentListItemProps> = ({
  icon,
  primaryText,
  secondaryText,
  status,
  labels,
  actions,
  loading,
  disabled,
  className,
  style,
  onClick,
}) => {
  return (
    <div
      className={`item staticms-content-list-item ${className || ""}`}
      style={style}
    >
      <div
        className="content staticms-content-list-clickable"
        onClick={!disabled ? onClick : undefined}
        style={{
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          display: "flex",
          alignItems: "center",
          flex: 1,
          minWidth: 0,
        }}
      >
        {loading
          ? (
            <div className="ui active mini inline loader staticms-content-list-loader">
            </div>
          )
          : (
            icon && (
              <span className="staticms-content-list-icon">
                {icon}
              </span>
            )
          )}
        <div
          className="header staticms-content-list-header"
          style={{
            display: "flex",
            alignItems: "baseline",
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontWeight: "bold",
              marginRight: "0.5em",
              whiteSpace: "nowrap",
            }}
          >
            {primaryText}
          </span>
          {secondaryText && (
            <span
              className="staticms-content-list-secondary-text"
              style={{
                fontWeight: "normal",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {secondaryText}
            </span>
          )}
        </div>
        <div className="staticms-content-list-labels">
          {status && (
            status.hasDraft
              ? (
                <StatusBadge
                  status="draft"
                  count={status.draftCount}
                  style={{ marginLeft: "0.5em" }}
                />
              )
              : status.hasPr
              ? (
                <StatusBadge
                  status="pr_open"
                  prNumber={status.prNumber}
                  style={{ marginLeft: "0.5em" }}
                />
              )
              : null
          )}
          {labels}
        </div>
      </div>
      {actions && (
        <div className="content" style={{ paddingLeft: "0.5em" }}>
          {actions}
        </div>
      )}
    </div>
  );
};
