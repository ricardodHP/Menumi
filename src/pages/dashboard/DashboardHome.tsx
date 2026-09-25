import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useManagedRestaurant } from "@/hooks/useManagedRestaurant";
import { toast } from "sonner";
import { ChevronDown, ExternalLink, Upload, Eye, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import QrCodeModal from "@/components/QrCodeModal";
import { getRestaurantPublicPath, getRestaurantPublicUrl } from "@/lib/restaurant-public";
import { getWhatsAppPhoneInputValue } from "@/lib/whatsapp";
import BusinessHoursEditor from "@/components/BusinessHoursEditor";
import { loadRestaurantBusinessHours, saveRestaurantBusinessHours } from "@/lib/business-hours-api";
import {
  formatBusinessHoursSummary,
  validateWeeklyBusinessHours,
  type WeeklyBusinessDay,
} from "@/lib/business-hours";
import { normalizeInstagramUsername } from "@/lib/instagram";
import {
  buildMenuPreviewPath,
  MENU_LAYOUTS,
  normalizeMenuLayout,
  type MenuLayout,
} from "@/lib/menu-layout";

type CuisineTemplate = Database["public"]["Enums"]["cuisine_template"];

const TEMPLATES: { value: CuisineTemplate; label: string }[] = [
  { value: "generic", label: "Genérica" },
  { value: "mexican", label: "Mexicana" },
  { value: "italian", label: "Italiana" },
  { value: "chinese", label: "China" },
  { value: "japanese", label: "Japonesa" },
];

const CLOSED_WEEK: WeeklyBusinessDay[] = Array.from({ length: 7 }, (_, index) => ({
  dayOfWeek: (index + 1) as WeeklyBusinessDay["dayOfWeek"],
  isClosed: true,
  intervals: [],
}));

const cloneWeek = (week: readonly WeeklyBusinessDay[]) => week.map((day) => ({
  ...day,
  intervals: day.intervals.map((interval) => ({ ...interval })),
}));

function MenuLayoutMiniature({ layout }: { layout: MenuLayout }) {
  if (layout === "social") {
    return (
      <div aria-hidden="true" className="space-y-2 rounded-md bg-muted/70 p-2">
        <div className="flex justify-center gap-1.5">
          {[0, 1, 2, 3].map((item) => (
            <span key={item} className="h-4 w-4 rounded-full border-2 border-primary/70 bg-background" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1">
          <span className="h-5 rounded bg-primary/15" />
          <span className="h-5 rounded bg-primary/25" />
        </div>
      </div>
    );
  }

  if (layout === "classic") {
    return (
      <div aria-hidden="true" className="space-y-1.5 rounded-md bg-muted/70 p-2">
        <span className="block h-1.5 w-1/3 rounded bg-foreground/30" />
        {[0, 1].map((item) => (
          <div key={item} className="flex items-center gap-2 border-b border-border/70 pb-1">
            <span className="h-5 w-5 shrink-0 rounded bg-foreground/10" />
            <span className="flex-1 space-y-1">
              <span className="block h-1.5 w-3/4 rounded bg-foreground/25" />
              <span className="block h-1 w-1/2 rounded bg-foreground/10" />
            </span>
            <span className="h-1.5 w-6 rounded bg-primary/60" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-1 rounded-md bg-muted/70 p-2">
      {[0, 1, 2, 3].map((item) => (
        <span key={item} className={`h-7 rounded ${item % 2 ? "bg-primary/25" : "bg-primary/15"}`} />
      ))}
    </div>
  );
}

export default function DashboardHome() {
  const { restaurant, loading } = useManagedRestaurant();
  const [form, setForm] = useState({
    name: "",
    bio: "",
    phone: "",
    address: "",
    hours: "",
    whatsapp_link: "",
    whatsapp_enabled: false,
    instagram_link: "",
    menu_layout: "social" as MenuLayout,
    cuisine_template: "generic" as CuisineTemplate,
    show_by_rating: false,
    show_rating: true,
    allow_reviews: true,
    logo_url: "" as string | null,
  });
  const [savedForm, setSavedForm] = useState(form);
  const [businessHours, setBusinessHours] = useState<WeeklyBusinessDay[]>(cloneWeek(CLOSED_WEEK));
  const [savedHoursJson, setSavedHoursJson] = useState("");
  const [hoursConfigured, setHoursConfigured] = useState(false);
  const [savedHoursConfigured, setSavedHoursConfigured] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [hoursLoaded, setHoursLoaded] = useState(false);
  const [hoursLoadError, setHoursLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const restaurantId = restaurant?.id;

  useEffect(() => {
    if (!restaurant) return;
    const loadedForm = {
      name: restaurant.name,
      bio: restaurant.bio ?? "",
      phone: restaurant.phone ?? "",
      address: restaurant.address ?? "",
      hours: restaurant.hours ?? "",
      whatsapp_link: getWhatsAppPhoneInputValue(restaurant.whatsapp_link),
      whatsapp_enabled: restaurant.whatsapp_enabled,
      instagram_link: restaurant.instagram_link ?? "",
      menu_layout: normalizeMenuLayout(restaurant.menu_layout),
      cuisine_template: restaurant.cuisine_template,
      show_by_rating: restaurant.show_by_rating,
      show_rating: restaurant.show_rating,
      allow_reviews: restaurant.allow_reviews,
      logo_url: restaurant.logo_url,
    };
    setForm(loadedForm);
    setSavedForm(loadedForm);
  }, [restaurant]);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    setHoursLoaded(false);
    setHoursLoadError(false);
    setHoursExpanded(false);
    loadRestaurantBusinessHours(restaurantId).then((schedule) => {
      if (cancelled) return;
      const loadedWeek = schedule ?? cloneWeek(CLOSED_WEEK);
      setBusinessHours(cloneWeek(loadedWeek));
      setSavedHoursConfigured(schedule !== null);
      setHoursConfigured(schedule !== null);
      setSavedHoursJson(schedule ? JSON.stringify(schedule) : "");
      setHoursLoaded(true);
    }).catch((error: unknown) => {
      if (cancelled) return;
      console.error("Could not load business hours for dashboard", error);
      setHoursLoadError(true);
      setHoursLoaded(true);
    });
    return () => { cancelled = true; };
  }, [restaurantId]);

  const formDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedForm), [form, savedForm]);
  const hoursDirty = hoursLoaded && !hoursLoadError && (
    hoursConfigured !== savedHoursConfigured ||
    (hoursConfigured && JSON.stringify(businessHours) !== savedHoursJson)
  );
  const hoursSummary = !hoursLoaded
    ? "Cargando horario…"
    : hoursLoadError
      ? "No se pudo comprobar el horario semanal"
      : hoursConfigured
        ? formatBusinessHoursSummary(businessHours).text
        : form.hours
          ? `Horario legado: ${form.hours}`
          : "Sin horario semanal configurado";
  const isDirty = formDirty || hoursDirty;

  const handleSave = async () => {
    if (!restaurant || !isDirty || !hoursLoaded) return;
    const instagramUsername = normalizeInstagramUsername(form.instagram_link);
    if (form.instagram_link.trim() && !instagramUsername) {
      toast.error("Escribe un usuario válido o una URL válida de Instagram.");
      return;
    }
    if (hoursDirty) {
      const validationError = validateWeeklyBusinessHours(businessHours);
      if (validationError) {
        toast.error("Revisa los horarios: hay días u horas incompletos o intervalos que se cruzan.");
        return;
      }
    }

    const formSnapshot = { ...form };
    const scheduleSnapshot = cloneWeek(businessHours);
    const saveHours = hoursDirty && hoursConfigured;
    setSaving(true);
    const { error } = await supabase
      .from("restaurants")
      .update({
        name: form.name.trim(),
        bio: form.bio || null,
        phone: form.phone || null,
        address: form.address || null,
        hours: form.hours || null,
        whatsapp_link: form.whatsapp_link.trim() || null,
        whatsapp_enabled: form.whatsapp_enabled,
        instagram_link: instagramUsername,
        menu_layout: form.menu_layout,
        cuisine_template: form.cuisine_template,
        show_by_rating: form.show_by_rating,
        show_rating: form.show_rating,
        allow_reviews: form.allow_reviews,
        logo_url: form.logo_url,
      })
      .eq("id", restaurant.id);
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }

    setSavedForm(formSnapshot);
    if (saveHours) {
      try {
        await saveRestaurantBusinessHours(restaurant.id, scheduleSnapshot);
        setSavedHoursConfigured(true);
        setSavedHoursJson(JSON.stringify(scheduleSnapshot));
      } catch (hoursError) {
        console.error("Could not save restaurant business hours", hoursError);
        setSaving(false);
        toast.error("La información general se guardó, pero fallaron los horarios. Tus cambios siguen aquí; puedes reintentar.");
        return;
      }
    }
    setSavedHoursConfigured(hoursConfigured);
    if (!hoursConfigured) setSavedHoursJson("");
    setSaving(false);
    toast.success("Cambios guardados");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!restaurant) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${restaurant.id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("restaurant-logos")
      .upload(path, file, { upsert: true });
    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("restaurant-logos").getPublicUrl(path);
    setForm((f) => ({ ...f, logo_url: pub.publicUrl }));
    setUploading(false);
    toast.success("Logo subido. Recuerda guardar los cambios.");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </DashboardLayout>
    );
  }

  if (!restaurant) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aún no tienes un restaurante asignado. Pídele al administrador que cree uno y te asigne como dueño.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const publicPath = getRestaurantPublicPath(restaurant.slug);
  const previewHref = buildMenuPreviewPath(publicPath, form.menu_layout, form.cuisine_template);
  const publicUrl = getRestaurantPublicUrl(restaurant.slug, window.location.origin);

  return (
    <DashboardLayout previewHref={previewHref}>
      <div className="grid grid-cols-1 gap-3 mb-5 sm:grid-cols-2 lg:hidden">
        <Button asChild variant="outline" className="rounded-full h-11">
          <Link to={previewHref} target="_blank">
            <Eye className="h-4 w-4" /> Vista previa
          </Link>
        </Button>
        <Button variant="outline" className="rounded-full h-11" onClick={() => setQrOpen(true)}>
          <QrCode className="h-4 w-4" /> Compartir QR
        </Button>
      </div>
      <div className="mb-5 sm:mb-6">
        <h2 className="text-2xl font-bold">Información del restaurante</h2>
        <p className="text-sm text-muted-foreground">
          Edita los datos generales que verán tus clientes
        </p>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-muted overflow-hidden flex items-center justify-center">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">Sin logo</span>
              )}
            </div>
            <div className="min-w-0">
              <Label htmlFor="logo" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 text-sm font-medium border rounded-md px-3 py-2 hover:bg-accent">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Subiendo..." : "Cambiar logo"}
                </div>
                <input
                  id="logo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
              </Label>
              <p className="text-xs text-muted-foreground mt-1">PNG o JPG, cuadrado.</p>
            </div>
          </div>

          <h3 className="border-t pt-5 font-semibold">Información general</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Descripción</Label>
            <Textarea
              id="bio"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Cuéntale a tus clientes de qué se trata tu restaurante"
            />
          </div>

          <div>
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>

          <section className="space-y-3 border-t pt-5">
            <div className="flex items-center gap-2 rounded-lg border p-3 sm:gap-3 sm:p-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">Horarios</h3>
                <p
                  className="truncate text-sm text-muted-foreground"
                  title={hoursSummary}
                  role={hoursLoadError ? "status" : undefined}
                >
                  {hoursSummary}
                </p>
              </div>
              {!hoursConfigured && !hoursLoadError && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  aria-label="Configurar horario semanal"
                  disabled={!hoursLoaded || saving}
                  onClick={() => {
                    setHoursConfigured(true);
                    setHoursExpanded(true);
                  }}
                >
                  <span className="sm:hidden">Configurar</span>
                  <span className="hidden sm:inline">Configurar horario semanal</span>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label={hoursExpanded ? "Contraer horarios" : "Expandir horarios"}
                aria-expanded={hoursExpanded}
                aria-controls="restaurant-business-hours-editor"
                onClick={() => setHoursExpanded((expanded) => !expanded)}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${hoursExpanded ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </Button>
            </div>
            <div id="restaurant-business-hours-editor" hidden={!hoursExpanded} className="space-y-3">
              {hoursConfigured ? (
                <BusinessHoursEditor value={businessHours} onChange={setBusinessHours} />
              ) : hoursLoadError ? (
                <p className="rounded-lg border p-4 text-sm text-destructive">
                  No sobrescribiremos ningún horario. Vuelve a cargar la pantalla para intentarlo de nuevo.
                </p>
              ) : (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                  {form.hours ? `Horario actual (texto legado): ${form.hours}` : "Aún no hay un horario semanal configurado."}
                </p>
              )}
            </div>
          </section>

          <h3 className="border-t pt-5 font-semibold">Contacto y redes</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="wa">WhatsApp (teléfono)</Label>
              <Input
                id="wa"
                type="tel"
                value={form.whatsapp_link}
                onChange={(e) => setForm({ ...form, whatsapp_link: e.target.value })}
                placeholder="+52 55 1234 5678"
              />
              <div className="mt-2 flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <Label htmlFor="whatsapp-enabled" className="text-sm">Mostrar opción en Mi pedido</Label>
                  <p className="text-xs text-muted-foreground">Tus clientes podrán continuar en WhatsApp.</p>
                </div>
                <Switch
                  id="whatsapp-enabled"
                  checked={form.whatsapp_enabled}
                  onCheckedChange={(checked) => setForm({ ...form, whatsapp_enabled: checked })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ig">Instagram</Label>
              <Input
                id="ig"
                value={form.instagram_link}
                onChange={(e) => setForm({ ...form, instagram_link: e.target.value })}
                placeholder="pastabella, @pastabella o URL de Instagram"
              />
            </div>
          </div>

          <h3 className="border-t pt-5 font-semibold">Preferencias del menú</h3>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium leading-none">Diseño del menú</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {MENU_LAYOUTS.map((layout) => {
                const selected = form.menu_layout === layout.value;
                return (
                  <button
                    key={layout.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setForm((current) => ({ ...current, menu_layout: layout.value }))}
                    className={`rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      selected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-muted/40"
                    }`}
                  >
                    <MenuLayoutMiniature layout={layout.value} />
                    <span className="mt-3 block text-sm font-semibold">{layout.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {layout.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Cambia cómo se organiza el mismo menú para tus clientes.
            </p>
          </fieldset>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Tema visual</Label>
              <Select
                value={form.cuisine_template}
                onValueChange={(v) => setForm({ ...form, cuisine_template: v as CuisineTemplate })}
              >
                <SelectTrigger aria-label="Tema visual">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Define colores y tipografía del menú público.
              </p>
            </div>
            <div>
              <Label>Orden de “Populares”</Label>
              <Select
                value={form.show_by_rating ? "rating" : "likes"}
                onValueChange={(value) => setForm({ ...form, show_by_rating: value === "rating" })}
              >
                <SelectTrigger aria-label="Ordenar populares por">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Calificación</SelectItem>
                  <SelectItem value="likes">Likes</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                El orden de platillos populares usa la opción seleccionada.
              </p>
            </div>
          </div>

          <h3 className="border-t pt-5 font-semibold">Calificaciones y reseñas</h3>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <Label htmlFor="show-rating" className="text-sm">Mostrar calificación del restaurante</Label>
              <p className="text-xs text-muted-foreground">
                Controla únicamente si el promedio se muestra públicamente.
              </p>
            </div>
            <Switch
              id="show-rating"
              checked={form.show_rating}
              onCheckedChange={(v) => setForm({ ...form, show_rating: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <Label htmlFor="allow-reviews" className="text-sm">Permitir nuevas reseñas del restaurante</Label>
              <p className="text-xs text-muted-foreground">
                Las reseñas existentes se conservan. Esta opción no cambia las reseñas de platillos.
              </p>
            </div>
            <Switch
              id="allow-reviews"
              checked={form.allow_reviews}
              onCheckedChange={(v) => setForm({ ...form, allow_reviews: v })}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            URL pública:{" "}
            <Link to={publicPath} target="_blank" className="text-primary inline-flex items-center gap-1">
              {publicUrl} <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

        </CardContent>
      </Card>

      {isDirty && (
        <div className="sticky bottom-3 z-30 mt-4 flex items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
          <p role="status" className="min-w-0 text-sm font-medium text-foreground">
            Cambios sin guardar
            {hoursDirty && formDirty && <span className="block text-xs font-normal text-muted-foreground">La información general y los horarios se guardan por separado.</span>}
          </p>
          <Button onClick={handleSave} disabled={saving || !hoursLoaded} className="shrink-0">
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      )}

      <QrCodeModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        url={publicUrl}
        restaurantName={restaurant.name}
        logoUrl={form.logo_url}
      />
    </DashboardLayout>
  );
}
