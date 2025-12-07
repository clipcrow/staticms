import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./AppRoutes.tsx";
import { ToastProvider } from "@/app/contexts/ToastContext.tsx";
import { ToastContainer } from "@/app/components/common/ToastContainer.tsx";

export function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </ToastProvider>
  );
}
