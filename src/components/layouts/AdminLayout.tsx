import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Store, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", label: "Restaurantes", icon: Store },
  { to: "/admin/users", label: "Usuarios", icon: Users },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex shrink-0 items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="whitespace-nowrap font-semibold">Panel Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "px-3 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
                  active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
