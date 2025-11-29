import { Header } from "./Header.tsx";

export const Login: React.FC = () => {
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
    </div>
  );
};
