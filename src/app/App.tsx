import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <div>
      <h1>Staticms</h1>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
