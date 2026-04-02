"use client";

import { useState } from "react";

import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

export default function DashboardShell({ children }) {
  useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <div
        className={cn(
          "flex min-h-screen flex-col gap-4 px-4 py-4 lg:gap-6 lg:px-6 lg:py-6",
          "lg:flex-row"
        )}
      >
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="min-w-0 flex-1">
          <div className="mx-auto flex w-full max-w-[1540px] flex-col space-y-6">
            <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
            <main>{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
