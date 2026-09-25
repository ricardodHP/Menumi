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
  BarChart3,
  CheckCircle2,
  Eye,
  LogOut,
  Menu,
  QrCode,
  Store,
  Tag,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useManagedRestaurant } from "@/hooks/useManagedRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QrCodeModal from "@/components/QrCodeModal";
import { getRestaurantPublicPath, getRestaurantPublicUrl } from "@/lib/restaurant-public";

const navItems = [
  { to: "/dashboard", label: "Información", icon: Store },
  { to: "/dashboard/categorias", label: "Categorías", icon: Tag },
  { to: "/dashboard/platillos", label: "Platillos", icon: UtensilsCrossed },
  { to: "/dashboard/estadisticas", label: "Estadísticas", icon: BarChart3 },
];

interface DashboardNavigationProps {
  pathname: string;
  ariaLabel: string;
  onNavigate?: () => void;
}

function DashboardNavigation({ pathname, ariaLabel, onNavigate }: DashboardNavigationProps) {
  return (
    <nav aria-label={ariaLabel} className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.to || (
          item.to !== "/dashboard" && pathname.startsWith(`${item.to}/`)
        );
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              active
                ? "border-primary bg-primary/10 font-semibold text-primary"
                : "border-transparent text-foreground hover:bg-muted",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

interface DashboardLayoutProps {
  children: ReactNode;
  previewHref?: string;
}

export default function DashboardLayout({ children, previewHref }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { restaurant, reload } = useManagedRestaurant();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const isPublished = restaurant?.status === "published";
  const publicPath = restaurant?.slug ? getRestaurantPublicPath(restaurant.slug) : null;
  const publicUrl = restaurant?.slug
    ? getRestaurantPublicUrl(restaurant.slug, window.location.origin)
    : "";

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
    <div className="min-h-screen bg-background">
      <aside
        aria-label="Menú del restaurante"
        className="inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-card lg:fixed lg:flex"
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Store className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Menumi</p>
            <p className="truncate text-sm font-semibold" title={restaurant?.name ?? "Mi restaurante"}>
              {restaurant?.name ?? "Mi restaurante"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <DashboardNavigation pathname={location.pathname} ariaLabel="Navegación principal" />
        </div>

        <div className="shrink-0 space-y-2 border-t p-3">
          {user?.email && (
            <p className="truncate px-3 text-xs text-muted-foreground" title={user.email}>
              {user.email}
            </p>
          )}
          <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Salir
          </Button>
        </div>
      </aside>

      <div className="min-h-screen min-w-0 lg:pl-64">
        <header className="sticky top-0 z-30 border-b bg-card">
          <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
              <Store className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <h1 className="min-w-0 font-semibold" title={restaurant?.name ?? "Restaurante"}>
                <span className="sm:hidden">Restaurante</span>
                <span className="hidden max-w-[min(32vw,20rem)] truncate sm:inline-block">
                  {restaurant?.name ?? "Mi restaurante"}
                </span>
              </h1>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              {restaurant && (
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={toggling}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 text-xs font-medium transition-colors sm:px-3",
                    isPublished
                      ? "border-primary bg-primary/5 text-primary hover:bg-primary/10"
                      : "border-muted-foreground/30 text-muted-foreground hover:bg-muted",
                  )}
                  aria-label={isPublished ? "Despublicar" : "Publicar"}
                >
                  {isPublished ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Store className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">{isPublished ? "Publicado" : "Borrador"}</span>
                </button>
              )}

              {restaurant && publicPath && (
                <>
                  <Button asChild variant="outline" size="sm" className="hidden lg:inline-flex">
                    <Link
                      to={previewHref ?? `${publicPath}?preview=1`}
                      target="_blank"
                      aria-label="Vista previa del menú"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      Vista previa
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden lg:inline-flex"
                    aria-label="Compartir QR del menú"
                    onClick={() => setQrOpen(true)}
                  >
                    <QrCode className="h-4 w-4" aria-hidden="true" />
                    Compartir QR
                  </Button>
                </>
              )}

              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="flex w-72 flex-col">
                  <SheetHeader>
                    <SheetTitle>Menú</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <DashboardNavigation
                      pathname={location.pathname}
                      ariaLabel="Navegación móvil"
                      onNavigate={() => setMenuOpen(false)}
                    />
                  </div>
                  <div className="mt-auto space-y-2 border-t pt-6">
                    {user?.email && (
                      <p className="truncate px-3 text-xs text-muted-foreground">{user.email}</p>
                    )}
                    <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Salir
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={handleSignOut}
                aria-label="Salir"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </header>

        <main className="w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {children}
        </main>
      </div>

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

      <QrCodeModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        url={publicUrl}
        restaurantName={restaurant?.name ?? "Mi restaurante"}
        logoUrl={restaurant?.logo_url}
      />
    </div>
  );
}
