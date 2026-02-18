import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function AppHeader() {
  const { profile, signOut } = useAuth();

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 border-b bg-background">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-medium tracking-tight text-foreground">PYL Manager</h1>
        <span className="hidden sm:inline text-[10px] font-medium tracking-widest text-muted-foreground uppercase">NRRO</span>
      </div>
      <div className="flex items-center gap-3">
        {profile && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <User size={14} />
            <span>{profile.full_name || profile.email}</span>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground" title="Cerrar sesión">
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  );
}
