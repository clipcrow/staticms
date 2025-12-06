import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./AppRoutes.tsx";

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
