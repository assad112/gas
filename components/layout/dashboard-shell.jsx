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
          "relative mx-auto flex min-h-screen w-full max-w-[var(--app-shell-max)] flex-col gap-4 px-3 py-3 sm:px-4 sm:py-4 lg:gap-6 lg:px-6 lg:py-6",
          "lg:flex-row"
        )}
      >
        <div className="pointer-events-none absolute inset-x-6 top-4 -z-10 hidden h-28 rounded-[36px] bg-white/50 blur-3xl lg:block" />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="min-w-0 flex-1">
          <div className="mx-auto flex w-full flex-col space-y-6">
            <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
            <main>{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
