import React from "react";
import { ContentStatus } from "@/app/components/editor/utils.ts";
import { StatusBadge } from "@/app/components/common/StatusBadge.tsx";

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
        className={`content staticms-content-list-clickable ${
          disabled ? "disabled" : ""
        }`}
        onClick={!disabled ? onClick : undefined}
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
        <div className="header staticms-content-list-header">
          <span className="staticms-content-list-primary-text">
            {primaryText}
          </span>
          {secondaryText && (
            <span className="staticms-content-list-secondary-text">
              {secondaryText}
            </span>
          )}
        </div>
        <div className="staticms-content-list-labels">
          {status && (
            <>
              {status.hasDraft && (
                <StatusBadge
                  status="draft"
                  count={status.draftCount}
                  className="staticms-badge-spacer-left"
                />
              )}
              {status.hasPr && (
                <StatusBadge
                  status="pr_open"
                  prNumber={status.prNumber}
                  count={status.prCount}
                  className="staticms-badge-spacer-left"
                />
              )}
            </>
          )}
          {labels}
        </div>
      </div>
      {actions && (
        <div className="content staticms-content-list-actions">
          {actions}
        </div>
      )}
    </div>
  );
};
