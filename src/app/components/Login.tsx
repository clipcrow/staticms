import React from "react";

export const Login: React.FC = () => {
  return (
    <div
      className="ui middle aligned center aligned grid"
      style={{ height: "100vh" }}
    >
      <div className="column" style={{ maxWidth: 450 }}>
        <h2 className="ui teal image header">
          <div className="content">Log-in to Staticms</div>
        </h2>
        <div className="ui large form">
          <div className="ui stacked segment">
            <div className="field">
              <p>Please sign in with your GitHub account to continue.</p>
            </div>
            <a
              href="/api/auth/login"
              className="ui fluid large teal submit button"
            >
              <i className="github icon"></i>
              Login with GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
