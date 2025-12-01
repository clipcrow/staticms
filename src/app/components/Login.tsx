import React from "react";
import { Header } from "./Header.tsx";

interface LoginProps {
  onLogin: () => void;
  isLoggingIn: boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin, isLoggingIn }) => {
  return (
    <div className="ui container staticms-login-container">
      <Header />

      <div className="staticms-login-content">
        <div className="staticms-login-inner">
          <h2 className="ui header center aligned">
            Log-in to Staticms
          </h2>
          <div className="ui segment">
            <div className="ui large form">
              <div className="field">
                <p>Please sign in with your GitHub account to continue.</p>
              </div>
              <button
                type="button"
                onClick={onLogin}
                className={`ui fluid large teal submit button ${
                  isLoggingIn ? "loading" : ""
                }`}
                disabled={isLoggingIn}
              >
                <i className="github icon"></i>
                Login with GitHub
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
