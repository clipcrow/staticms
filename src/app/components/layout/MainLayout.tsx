import { Outlet } from "react-router-dom";
import { Header } from "@/app/components/common/Header.tsx";
import { useHeader } from "@/app/contexts/HeaderContext.tsx";

export function MainLayout() {
  const { breadcrumbs, title, rightContent } = useHeader();

  return (
    <>
      <Header
        breadcrumbs={breadcrumbs}
        title={title}
        rightContent={rightContent}
      />
      <Outlet />
    </>
  );
}
