import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  LogOut,
  Store,
  UtensilsCrossed,
  Tag,
  BarChart3,
  Menu,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useManagedRestaurant } from "@/hooks/useManagedRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const navItems = [
  { to: "/dashboard", label: "Información", icon: Store },
  { to: "/dashboard/categorias", label: "Categorías", icon: Tag },
  { to: "/dashboard/platillos", label: "Platillos", icon: UtensilsCrossed },
  { to: "/dashboard/estadisticas", label: "Estadísticas", icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { restaurant, reload } = useManagedRestaurant();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const isPublished = restaurant?.status === "published";

  const togglePublished = async () => {
    if (!restaurant || toggling) return;
    setToggling(true);
    const newStatus = isPublished ? "draft" : "published";
    const { error } = await supabase
      .from("restaurants")
      .update({ status: newStatus })
      .eq("id", restaurant.id);
    setToggling(false);
    if (error) toast.error(error.message);
    else {
      toast.success(newStatus === "published" ? "Menú publicado" : "Menú en borrador");
      reload();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Store className="h-5 w-5 text-primary shrink-0" />
            <h1 className="font-semibold truncate">Mi restaurante</h1>
          </div>
          <div className="flex items-center gap-2">
            {restaurant && (
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={toggling}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  isPublished
                    ? "border-primary text-primary bg-primary/5 hover:bg-primary/10"
                    : "border-muted-foreground/30 text-muted-foreground hover:bg-muted",
                )}
                aria-label={isPublished ? "Despublicar" : "Publicar"}
              >
                {isPublished && <CheckCircle2 className="h-3.5 w-3.5" />}
                {isPublished ? "Publicado" : "¿Publicar?"}
              </button>
            )}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menú">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 flex flex-col">
                <SheetHeader>
                  <SheetTitle>Menú</SheetTitle>
                </SheetHeader>
                <nav className="mt-4 flex flex-col gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="mt-auto pt-6 border-t space-y-2">
                  {user?.email && (
                    <p className="text-xs text-muted-foreground px-3 truncate">{user.email}</p>
                  )}
                  <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" /> Salir
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Salir">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full min-w-0 max-w-6xl mx-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {children}
      </main>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPublished ? "¿Despublicar el menú?" : "¿Publicar el menú?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPublished
                ? "El menú dejará de estar disponible para tus clientes hasta que vuelvas a publicarlo."
                : "El menú quedará visible para tus clientes en la URL pública."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                togglePublished();
              }}
            >
              {isPublished ? "Despublicar" : "Publicar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
