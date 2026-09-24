import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, getDefaultRouteForRoles } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ChefHat } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roles, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in. Wait until roles are loaded so owners
  // land on /dashboard instead of being redirected to "/" when roles
  // haven't arrived yet.
  useEffect(() => {
    if (authLoading || !user) return;
    // If user exists but roles are still being fetched, wait one more tick.
    if (roles.length === 0) {
      const t = setTimeout(() => {
        const from = (location.state as { from?: string } | null)?.from;
        navigate(from && from !== "/login" ? from : getDefaultRouteForRoles(roles), { replace: true });
      }, 400);
      return () => clearTimeout(t);
    }
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && from !== "/login" ? from : getDefaultRouteForRoles(roles), { replace: true });
  }, [user, roles, authLoading, navigate, location.state]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("¡Bienvenido!");
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ChefHat className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
          <CardDescription>Accede a tu cuenta de administrador o dueño</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">o</span>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
            Continuar con Google
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            ¿No tienes cuenta? Solicítala al administrador de la plataforma.
          </p>
          {/* <p className="text-xs text-center text-muted-foreground">
            <Link to="/" className="hover:underline">← Volver al menú</Link>
          </p> */}
        </CardContent>
      </Card>
    </div>
  );
}
