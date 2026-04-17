import { RefreshToast } from "@/components/refresh-toast";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <RefreshToast />
    </>
  );
}
