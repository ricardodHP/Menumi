import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useManagedRestaurant } from "@/hooks/useManagedRestaurant";
import { toast } from "sonner";

interface CategoryRow {
  id: string;
  name: string;
  emoji: string | null;
  position: number;
  is_visible: boolean;
}

export default function DashboardCategories() {
  const { restaurant, loading: loadingR } = useManagedRestaurant();
  const [items, setItems] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!restaurant) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, emoji, position, is_visible")
      .eq("restaurant_id", restaurant.id)
      .order("position", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data ?? []) as CategoryRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id]);

  const openNew = () => {
    setEditing(null);
    setName("");
    setEmoji("");
    setOpen(true);
  };

  const openEdit = (c: CategoryRow) => {
    setEditing(c);
    setName(c.name);
    setEmoji(c.emoji ?? "");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!restaurant) return;
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("categories")
        .update({ name: name.trim(), emoji: emoji || null })
        .eq("id", editing.id);
      if (error) toast.error(error.message);
      else toast.success("Categoría actualizada");
    } else {
      const nextPos = items.length ? Math.max(...items.map((i) => i.position)) + 1 : 0;
      const { error } = await supabase.from("categories").insert({
        restaurant_id: restaurant.id,
        name: name.trim(),
        emoji: emoji || null,
        position: nextPos,
      });
      if (error) toast.error(error.message);
      else toast.success("Categoría creada");
    }
    setSaving(false);
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Eliminada");
      load();
    }
  };

  const toggleVisible = async (category: CategoryRow) => {
    const { error } = await supabase
      .from("categories")
      .update({ is_visible: !category.is_visible })
      .eq("id", category.id);
    if (error) toast.error(error.message);
    else {
      toast.success(category.is_visible ? "Categoría oculta" : "Categoría visible");
      load();
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const a = items[idx];
    const b = items[target];
    await supabase.from("categories").update({ position: b.position }).eq("id", a.id);
    await supabase.from("categories").update({ position: a.position }).eq("id", b.id);
    load();
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Categorías</h2>
          <p className="text-sm text-muted-foreground">
            Agrupa tus platillos en secciones (ej. Entradas, Postres)
          </p>
        </div>
        <Button onClick={openNew} aria-label="Nueva categoría" className="shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="lg:hidden">Nueva</span>
          <span className="hidden lg:inline">Nueva categoría</span>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aún no tienes categorías. Crea la primera con "Nueva categoría".
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((c, idx) => (
            <Card key={c.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="text-2xl w-10 text-center">{c.emoji ?? "🍽️"}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Posición {c.position} · {c.is_visible ? "Visible" : "Oculta"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-2 px-2">
                    <Label htmlFor={`visible-${c.id}`} className="text-xs cursor-pointer">
                      Visible en el menú
                    </Label>
                    <Switch
                      id={`visible-${c.id}`}
                      checked={c.is_visible}
                      onCheckedChange={() => toggleVisible(c)}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => move(idx, 1)}
                    disabled={idx === items.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Los platillos de "{c.name}" quedarán sin categoría. No se borran.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(c.id)}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Entradas" />
            </div>
            <div>
              <Label htmlFor="emoji">Emoji (opcional)</Label>
              <Input
                id="emoji"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="🥑"
                maxLength={4}
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
