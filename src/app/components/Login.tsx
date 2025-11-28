import { Header } from "./Header.tsx";

export const Login: React.FC = () => {
  return (
    <div
      className="ui container"
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Header />

      <div
        style={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: "15vh",
        }}
      >
        <div style={{ width: "100%", maxWidth: "450px" }}>
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
