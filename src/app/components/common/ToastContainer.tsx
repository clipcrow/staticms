import { useToast } from "@/app/contexts/ToastContext.tsx";

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`ui message ${toast.type} toast-message`}
        >
          <i
            className="close icon"
            onClick={(e) => {
              e.stopPropagation();
              dismissToast(toast.id);
            }}
            style={{ cursor: "pointer" }}
          >
          </i>
          <div className="header">
            {toast.type === "error"
              ? "Error"
              : toast.type === "success"
              ? "Success"
              : toast.type === "warning"
              ? "Warning"
              : "Info"}
          </div>
          <p>{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
