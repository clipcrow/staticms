import React from "react";
import { BreadcrumbItem, Header } from "@/app/components/common/Header.tsx";

interface ConfigLayoutProps {
  breadcrumbs: BreadcrumbItem[];
  loading?: boolean;
  error?: Error | null;
  notFound?: boolean;
  notFoundMessage?: string;
  children?: React.ReactNode;
}

export const ConfigLayout: React.FC<ConfigLayoutProps> = ({
  breadcrumbs,
  loading,
  error,
  notFound,
  notFoundMessage,
  children,
}) => {
  if (loading) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <Header breadcrumbs={breadcrumbs} />
        <div className="ui active centered inline loader"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <div className="ui negative message">
          <div className="header">Error loading configuration</div>
          <p>{error.message || "Configuration not found"}</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <div className="ui warning message">
          {notFoundMessage || "Content not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="ui container" style={{ marginTop: "2rem" }}>
      <Header breadcrumbs={breadcrumbs} />
      <div className="ui segment">
        {children}
      </div>
    </div>
  );
};
