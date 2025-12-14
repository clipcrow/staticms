import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./AppRoutes.tsx";
import { ToastProvider } from "@/app/contexts/ToastContext.tsx";
import { ToastContainer } from "@/app/components/common/ToastContainer.tsx";
import { HeaderProvider } from "@/app/contexts/HeaderContext.tsx";

export function App() {
  return (
    <ToastProvider>
      <HeaderProvider>
        <BrowserRouter>
          <AppRoutes />
          <ToastContainer />
        </BrowserRouter>
      </HeaderProvider>
    </ToastProvider>
  );
}
