import { LayoutDashboard, FileOutput, FileSearch, Download, Shield } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/convertir", icon: FileOutput, label: "Convertir" },
  { to: "/visor", icon: FileSearch, label: "Visor" },
  { to: "/plantilla", icon: Download, label: "Plantilla" },
];

export function BottomNav() {
  const { isAdmin } = useAuth();

  const allItems = isAdmin
    ? [...navItems, { to: "/admin", icon: Shield, label: "Admin" }]
    : navItems;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border flex justify-around py-2">
      {allItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-0.5 text-[10px] px-2 py-1 rounded-md transition-colors",
              isActive
                ? "text-primary font-medium"
                : "text-muted-foreground hover:text-foreground font-light"
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
