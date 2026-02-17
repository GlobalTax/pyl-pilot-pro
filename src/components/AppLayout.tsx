import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
