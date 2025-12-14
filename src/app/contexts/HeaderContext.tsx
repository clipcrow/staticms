import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export interface BreadcrumbItem {
  label: ReactNode;
  to?: string;
}

export interface HeaderState {
  breadcrumbs: BreadcrumbItem[];
  title?: ReactNode;
  rightContent?: ReactNode;
}

const HeaderStateContext = createContext<HeaderState | null>(null);
const HeaderDispatchContext = createContext<
  React.Dispatch<React.SetStateAction<HeaderState>> | null
>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HeaderState>({ breadcrumbs: [] });

  return (
    <HeaderDispatchContext.Provider value={setState}>
      <HeaderStateContext.Provider value={state}>
        {children}
      </HeaderStateContext.Provider>
    </HeaderDispatchContext.Provider>
  );
}

export function useHeader() {
  const ctx = useContext(HeaderStateContext);
  if (!ctx) throw new Error("useHeader must be used within HeaderProvider");
  return ctx;
}

// Helper hook for pages to set header via effect
// It uses HeaderDispatchContext so updating the header state won't trigger re-render of the component using this hook.
export function useSetHeader(
  breadcrumbs: BreadcrumbItem[],
  title?: ReactNode,
  rightContent?: ReactNode,
) {
  const setHeader = useContext(HeaderDispatchContext);
  if (!setHeader) {
    throw new Error("useSetHeader must be used within HeaderProvider");
  }

  useEffect(() => {
    setHeader({ breadcrumbs, title, rightContent });
  }, [
    setHeader,
    title,
    rightContent,
    breadcrumbs.length,
    ...breadcrumbs.map((b) => b.to),
  ]);
}
