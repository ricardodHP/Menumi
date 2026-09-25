import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Star, Heart, Upload, Search, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useManagedRestaurant } from "@/hooks/useManagedRestaurant";
import { toast } from "sonner";
import { filterAdminDishes, getDishImageExtension, isSupportedDishImage, normalizeDishTags, validateDishPrice } from "@/lib/dish-admin";

interface CategoryRow {
  id: string;
  name: string;
}

interface DishRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  rating: number;
  likes_count: number;
  tags: string[];
  is_featured: boolean;
  is_active: boolean;
  is_available: boolean;
  show_rating: boolean;
  category_id: string | null;
  position: number;
}

interface DishForm {
  name: string;
  description: string;
  price: string;
  image_url: string | null;
  category_id: string | null;
  tags: string[];
  is_featured: boolean;
  is_active: boolean;
  show_rating: boolean;
  is_available: boolean;
}

const emptyForm: DishForm = {
  name: "",
  description: "",
  price: "",
  image_url: null,
  category_id: null,
  tags: [],
  is_featured: false,
  is_active: true,
  show_rating: true,
  is_available: true,
};

export default function DashboardDishes() {
  const { restaurant, loading: loadingR } = useManagedRestaurant();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dishes, setDishes] = useState<DishRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DishRow | null>(null);
  const [form, setForm] = useState<DishForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [tagInput, setTagInput] = useState("");

  const requestedFilter = searchParams.get("category");
  const filter =
    requestedFilter === "uncategorized" || categories.some((category) => category.id === requestedFilter)
      ? requestedFilter
      : "all";

  const load = async () => {
    if (!restaurant) return;
    setLoading(true);
    setLoadError(false);
    const [dRes, cRes] = await Promise.all([
      supabase
        .from("dishes")
        .select("id, name, description, price, image_url, rating, likes_count, tags, is_featured, is_active, is_available, show_rating, category_id, position")
        .eq("restaurant_id", restaurant.id)
        .order("position", { ascending: true }),
      supabase
        .from("categories")
        .select("id, name")
        .eq("restaurant_id", restaurant.id)
        .order("position", { ascending: true }),
    ]);
    if (dRes.error) toast.error(dRes.error.message);
    if (cRes.error) toast.error(cRes.error.message);

    if (dRes.error || cRes.error) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    setDishes((dRes.data ?? []) as DishRow[]);
    setCategories((cRes.data ?? []) as CategoryRow[]);
    setLoading(false);
  };

  useEffect(() => {
    setDishes([]);
    setCategories([]);
    setLoadError(false);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setTagInput("");
    setOpen(true);
  };

  const openEdit = (d: DishRow) => {
    setEditing(d);
    setForm({
      name: d.name,
      description: d.description ?? "",
      price: String(d.price),
      image_url: d.image_url,
      category_id: d.category_id,
      tags: d.tags,
      is_featured: d.is_featured,
      is_active: d.is_active,
      show_rating: d.show_rating,
      is_available: d.is_available,
    });
    setTagInput("");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!restaurant) return;
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    const priceNum = validateDishPrice(form.price, editing?.price);
    if (priceNum === null) {
      toast.error("Ingresa un precio mayor que cero");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      price: priceNum,
      image_url: form.image_url,
      category_id: form.category_id,
      tags: normalizeDishTags([...form.tags, tagInput].join(",")),
      is_featured: form.is_featured,
      is_active: form.is_active,
      is_available: form.is_available,
      show_rating: form.show_rating,
    };
    let succeeded = false;
    if (editing) {
      const { error } = await supabase.from("dishes").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message);
      else { toast.success("Platillo actualizado"); succeeded = true; }
    } else {
      const nextPos = dishes.length ? Math.max(...dishes.map((d) => d.position)) + 1 : 0;
      const { error } = await supabase.from("dishes").insert({
        ...payload,
        restaurant_id: restaurant.id,
        position: nextPos,
      });
      if (error) toast.error(error.message);
      else { toast.success("Platillo creado"); succeeded = true; }
    }
    setSaving(false);
    if (succeeded) {
      setOpen(false);
      load();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("dishes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Eliminado");
      load();
    }
  };

  const toggleFeatured = async (d: DishRow) => {
    const { error } = await supabase
      .from("dishes")
      .update({ is_featured: !d.is_featured })
      .eq("id", d.id);
    if (error) toast.error(error.message);
    else load();
  };

  const toggleActive = async (d: DishRow) => {
    const { error } = await supabase
      .from("dishes")
      .update({ is_active: !d.is_active })
      .eq("id", d.id);
    if (error) toast.error(error.message);
    else {
      toast.success(d.is_active ? "Platillo deshabilitado" : "Platillo habilitado");
      load();
    }
  };

  const toggleAvailable = async (d: DishRow) => {
    const { error } = await supabase.from("dishes").update({ is_available: !d.is_available }).eq("id", d.id);
    if (error) toast.error(error.message);
    else {
      toast.success(d.is_available ? "Platillo marcado como agotado" : "Platillo disponible");
      load();
    }
  };

  const duplicateDish = async (d: DishRow) => {
    if (!restaurant) return;
    const nextPos = dishes.length ? Math.max(...dishes.map((item) => item.position)) + 1 : 0;
    const { error } = await supabase.from("dishes").insert({
      restaurant_id: restaurant.id,
      position: nextPos,
      name: `${d.name} (copia)`,
      description: d.description,
      price: d.price,
      image_url: d.image_url,
      category_id: d.category_id,
      tags: d.tags,
      is_featured: false,
      is_active: true,
      is_available: true,
      show_rating: d.show_rating,
    });
    if (error) toast.error(error.message);
    else { toast.success("Platillo duplicado"); load(); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!restaurant) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isSupportedDishImage(file)) {
      toast.error("Usa una imagen JPEG, PNG o WebP");
      e.target.value = "";
      return;
    }
    setUploading(true);
    const ext = getDishImageExtension(file.type);
    if (!ext) return;
    const path = `${restaurant.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("dish-images")
      .upload(path, file, { upsert: true });
    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("dish-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: pub.publicUrl }));
    setUploading(false);
    toast.success("Imagen subida");
  };

  const filtered = filterAdminDishes(
    dishes.map((d) => ({ ...d, category: d.category_id ?? "", description: d.description ?? "" })),
    search,
    filter,
  );

  const handleFilterChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete("category");
    else next.set("category", value);
    setSearchParams(next);
  };

  if (loadingR) {
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
            Aún no tienes un restaurante asignado.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Platillos</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona los platillos de tu menú y revisa likes y calificaciones
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input aria-label="Buscar platillos" placeholder="Buscar platillos" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              <SelectItem value="uncategorized">Sin categoría</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openNew} aria-label="Nuevo platillo" className="shrink-0">
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="lg:hidden">Nuevo</span>
            <span className="hidden lg:inline">Nuevo platillo</span>
          </Button>
        </div>
      </div>

      {loadError && dishes.length > 0 && (
        <Card role="alert" className="mb-4">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              No se pudieron actualizar los platillos. Se conserva la información cargada.
            </p>
            <Button variant="outline" onClick={() => void load()}>Reintentar</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : loadError && dishes.length === 0 ? (
        <Card role="alert">
          <CardContent className="flex flex-wrap items-center justify-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">No se pudieron cargar los platillos. Intenta de nuevo.</p>
            <Button variant="outline" onClick={() => void load()}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {search || filter !== "all" ? "No hay platillos que coincidan con la búsqueda o categoría." : <>No hay platillos. Crea el primero con "Nuevo platillo".</>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => (
            <Card key={d.id} className={`overflow-hidden ${!d.is_active ? "opacity-60" : ""}`}>
              <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                  {d.image_url ? <img src={d.image_url} alt={d.name} className="aspect-square h-full w-full object-cover" /> : <div className="flex aspect-square h-full items-center justify-center text-xs text-muted-foreground">Sin imagen</div>}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold leading-tight">{d.name}</h3><span className="text-sm font-bold">${d.price.toFixed(2)}</span>{d.is_featured && <Badge variant="secondary">Destacado</Badge>}{!d.is_active && <Badge variant="outline">Oculto</Badge>}{!d.is_available && <Badge variant="destructive">Agotado</Badge>}</div>
                  {d.description && <p className="text-xs text-muted-foreground line-clamp-1">{d.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">{d.show_rating && <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" />{d.rating.toFixed(1)}</span>}<span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{d.likes_count}</span>{d.tags.slice(0, 4).map((tag) => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Button size="sm" variant="outline" onClick={() => toggleFeatured(d)} aria-label={d.is_featured ? "Quitar destacado" : "Marcar destacado"}><Star className={d.is_featured ? "h-4 w-4 fill-primary text-primary" : "h-4 w-4"} /></Button>
                  <div className="flex items-center gap-1 rounded-md border px-2 py-1"><Label htmlFor={`active-${d.id}`} className="cursor-pointer text-xs">Visible</Label><Switch id={`active-${d.id}`} checked={d.is_active} onCheckedChange={() => toggleActive(d)} /></div>
                  <div className="flex items-center gap-1 rounded-md border px-2 py-1"><Label htmlFor={`available-${d.id}`} className="cursor-pointer text-xs">Disponible</Label><Switch id={`available-${d.id}`} checked={d.is_available} onCheckedChange={() => toggleAvailable(d)} /></div>
                  <Button size="sm" variant="outline" onClick={() => duplicateDish(d)} aria-label={`Duplicar ${d.name}`}><Copy className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(d)}><Pencil className="h-3 w-3" /><span className="hidden sm:inline">Editar</span></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar platillo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{d.name}" será eliminado permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(d.id)}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar platillo" : "Nuevo platillo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="aspect-square max-h-64 bg-muted rounded-md overflow-hidden">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  Sin imagen
                </div>
              )}
            </div>
            <Label htmlFor="img" className="cursor-pointer">
              <div className="inline-flex items-center gap-2 text-sm font-medium border rounded-md px-3 py-2 hover:bg-accent">
                <Upload className="h-4 w-4" />
                {uploading ? "Subiendo..." : "Subir imagen"}
              </div>
              <input
                id="img"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </Label>

            <div>
              <Label htmlFor="dname">Nombre</Label>
              <Input id="dname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ddesc">Descripción</Label>
              <Textarea
                id="ddesc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="dprice">Precio</Label>
                <Input
                  id="dprice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Ej. 120.00"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select
                  value={form.category_id ?? "none"}
                  onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="dtags">Etiquetas</Label>
              <Input
                id="dtags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const next = normalizeDishTags(tagInput);
                    setForm((current) => ({ ...current, tags: normalizeDishTags([...current.tags, ...next].join(",")) }));
                    setTagInput("");
                  }
                }}
                placeholder="Escribe una etiqueta y presiona Enter"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.tags.map((tag) => <Badge key={tag} variant="outline" className="gap-1">{tag}<button type="button" aria-label={`Quitar etiqueta ${tag}`} onClick={() => setForm((current) => ({ ...current, tags: current.tags.filter((value) => value !== tag) }))}>×</button></Badge>)}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div><Label className="text-sm">Disponible para pedir</Label><p className="text-xs text-muted-foreground">Si se agota, seguirá visible pero no se podrá agregar a Mi pedido.</p></div>
              <Switch checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="dfeat"
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="dfeat" className="cursor-pointer">
                Marcar como destacado
              </Label>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Visible en el menú</Label>
                <p className="text-xs text-muted-foreground">
                  Si está apagado, los clientes no verán este platillo.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Mostrar calificación</Label>
                <p className="text-xs text-muted-foreground">
                  Si está apagado, se oculta la calificación. Los clientes aún pueden dejar reseñas.
                </p>
              </div>
              <Switch
                checked={form.show_rating}
                onCheckedChange={(v) => setForm({ ...form, show_rating: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
