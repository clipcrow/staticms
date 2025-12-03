import React from "react";

interface ContentListItemProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  onClick: () => void;
  actions?: React.ReactNode;
  labels?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const ContentListItem: React.FC<ContentListItemProps> = ({
  title,
  icon,
  onClick,
  actions,
  labels,
  loading,
  disabled,
  className,
  style,
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
        <div className="header staticms-content-list-header">
          {title}
        </div>
        {labels}
      </div>
      {actions && (
        <div className="content" style={{ paddingLeft: "0.5em" }}>
          {actions}
        </div>
      )}
    </div>
  );
};
