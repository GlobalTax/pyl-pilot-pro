import { LayoutDashboard, FileOutput, FileSearch, Download } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/convertir", icon: FileOutput, label: "Convertir" },
  { to: "/visor", icon: FileSearch, label: "Visor" },
  { to: "/plantilla", icon: Download, label: "Plantilla" },
];

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-sidebar border-t border-sidebar-border flex justify-around py-2">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-0.5 text-[10px] font-medium px-2 py-1 rounded-md transition-colors",
              isActive
                ? "text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
            )
          }
        >
          <item.icon size={20} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
