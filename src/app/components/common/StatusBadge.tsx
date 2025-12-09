import React from "react";

export type ContentStatusType =
  | "draft"
  | "pr_open"
  | "merged"
  | "clean"
  | "declined";

interface StatusBadgeProps {
  status: ContentStatusType;
  prNumber?: number;
  count?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const StatusBadge: React.FC<StatusBadgeProps> = (
  { status, prNumber, count, className, style },
) => {
  switch (status) {
    case "draft":
      return (
        <span
          className={`ui label orange tiny basic ${className || ""}`}
          style={style}
        >
          <i className="pencil alternate icon" />{" "}
          Draft{count && count > 1 ? ` (${count})` : ""}
        </span>
      );
    case "pr_open":
      return (
        <span className="ui label teal tiny basic">
          <i className="eye icon" />
          {prNumber
            ? ` In Review (#${prNumber})`
            : count && count > 1
            ? ` In Review (${count})`
            : " In Review"}
        </span>
      );
    case "merged":
      return (
        <span
          className={`ui label purple tiny basic ${className || ""}`}
          style={style}
        >
          <i className="check circle icon" /> Approved
        </span>
      );
    case "declined":
      return (
        <span
          className={`ui label red tiny basic ${className || ""}`}
          style={style}
        >
          <i className="times circle icon" /> Declined
        </span>
      );
    default:
      return null;
  }
};
