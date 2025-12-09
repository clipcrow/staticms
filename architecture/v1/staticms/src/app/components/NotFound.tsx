import React from "react";
import { Link } from "react-router-dom";

export const NotFound: React.FC = () => {
  return (
    <div className="ui container center aligned" style={{ marginTop: "50px" }}>
      <h1 className="ui header">404</h1>
      <p>Page not found.</p>
      <Link to="/" className="ui primary button">
        Go Home
      </Link>
    </div>
  );
};
