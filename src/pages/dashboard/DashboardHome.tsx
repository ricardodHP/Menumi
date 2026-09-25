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
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useManagedRestaurant } from "@/hooks/useManagedRestaurant";
import { toast } from "sonner";
import { ExternalLink, Upload, Eye, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import QrCodeModal from "@/components/QrCodeModal";
import { getRestaurantPublicPath, getRestaurantPublicUrl } from "@/lib/restaurant-public";
import { getWhatsAppPhoneInputValue } from "@/lib/whatsapp";

type CuisineTemplate = Database["public"]["Enums"]["cuisine_template"];

const TEMPLATES: { value: CuisineTemplate; label: string }[] = [
  { value: "generic", label: "Genérica" },
  { value: "mexican", label: "Mexicana" },
  { value: "italian", label: "Italiana" },
  { value: "chinese", label: "China" },
  { value: "japanese", label: "Japonesa" },
];

export default function DashboardHome() {
  const { restaurant, loading, reload } = useManagedRestaurant();
  const [form, setForm] = useState({
    name: "",
    bio: "",
    phone: "",
    address: "",
    hours: "",
    whatsapp_link: "",
    whatsapp_enabled: false,
    instagram_link: "",
    cuisine_template: "generic" as CuisineTemplate,
    show_by_rating: false,
    show_rating: true,
    logo_url: "" as string | null,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    if (!restaurant) return;
    setForm({
      name: restaurant.name,
      bio: restaurant.bio ?? "",
      phone: restaurant.phone ?? "",
      address: restaurant.address ?? "",
      hours: restaurant.hours ?? "",
      whatsapp_link: getWhatsAppPhoneInputValue(restaurant.whatsapp_link),
      whatsapp_enabled: restaurant.whatsapp_enabled,
      instagram_link: restaurant.instagram_link ?? "",
      cuisine_template: restaurant.cuisine_template,
      show_by_rating: restaurant.show_by_rating,
      show_rating: (restaurant as { show_rating?: boolean }).show_rating ?? true,
      logo_url: restaurant.logo_url,
    });
  }, [restaurant]);

  const handleSave = async () => {
    if (!restaurant) return;
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
        instagram_link: form.instagram_link || null,
        cuisine_template: form.cuisine_template,
        show_by_rating: form.show_by_rating,
        show_rating: form.show_rating,
        logo_url: form.logo_url,
      })
      .eq("id", restaurant.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Cambios guardados");
      reload();
    }
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
  const publicUrl = getRestaurantPublicUrl(restaurant.slug, window.location.origin);

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <Button asChild variant="outline" className="rounded-full h-11">
          <Link to={`${publicPath}?preview=1`} target="_blank">
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

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="hours">Horario</Label>
              <Input
                id="hours"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                placeholder="Lun-Dom 12:00 - 22:00"
              />
            </div>
          </div>

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
              <Label htmlFor="ig">Instagram (URL)</Label>
              <Input
                id="ig"
                value={form.instagram_link}
                onChange={(e) => setForm({ ...form, instagram_link: e.target.value })}
                placeholder="https://instagram.com/..."
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Plantilla del menú</Label>
              <Select
                value={form.cuisine_template}
                onValueChange={(v) => setForm({ ...form, cuisine_template: v as CuisineTemplate })}
              >
                <SelectTrigger>
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
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Ordenar platillos por calificación</Label>
                <p className="text-xs text-muted-foreground">
                  Si está activo, los más populares aparecen primero.
                </p>
              </div>
              <Switch
                checked={form.show_by_rating}
                onCheckedChange={(v) => setForm({ ...form, show_by_rating: v })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-sm">Mostrar calificación del restaurante</Label>
              <p className="text-xs text-muted-foreground">
                Si está apagado, se ocultan las estrellas y los clientes no podrán dejar reseñas del restaurante.
              </p>
            </div>
            <Switch
              checked={form.show_rating}
              onCheckedChange={(v) => setForm({ ...form, show_rating: v })}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            URL pública:{" "}
            <Link to={publicPath} target="_blank" className="text-primary inline-flex items-center gap-1">
              {publicUrl} <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
