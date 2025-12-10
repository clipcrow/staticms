import React from "react";

export const LoadingSpinner: React.FC = () => (
  <div className="ui active centered inline loader"></div>
);

interface MessageProps {
  title?: string;
  children: React.ReactNode;
}

export const ErrorCallout: React.FC<MessageProps> = ({ title, children }) => (
  <div className="ui negative message">
    {title && <div className="header">{title}</div>}
    {children}
  </div>
);

export const WarningCallout: React.FC<MessageProps> = ({ title, children }) => (
  <div className="ui warning message">
    {title && <div className="header">{title}</div>}
    {children}
  </div>
);
