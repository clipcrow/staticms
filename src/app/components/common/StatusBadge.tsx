import React from "react";

export type ContentStatusType = "draft" | "pr_open" | "merged" | "clean";

interface StatusBadgeProps {
  status: ContentStatusType;
  prNumber?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const StatusBadge: React.FC<StatusBadgeProps> = (
  { status, prNumber, className, style },
) => {
  switch (status) {
    case "draft":
      return (
        <span
          className={`ui label orange tiny basic ${className || ""}`}
          style={style}
        >
          <i className="pencil alternate icon" /> Draft
        </span>
      );
    case "pr_open":
      return (
        <span
          className={`ui label green tiny basic ${className || ""}`}
          style={style}
        >
          <i className="code branch icon" />
          {prNumber ? ` #${prNumber}` : " PR Open"}
        </span>
      );
    case "merged":
      return (
        <span
          className={`ui label purple tiny basic ${className || ""}`}
          style={style}
        >
          <i className="check circle icon" /> Merged
        </span>
      );
    default:
      return null;
  }
};
