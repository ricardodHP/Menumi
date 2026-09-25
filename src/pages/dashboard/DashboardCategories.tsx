import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useManagedRestaurant } from "@/hooks/useManagedRestaurant";
import { toast } from "sonner";

interface CategoryRow {
  id: string;
  restaurant_id: string;
  name: string;
  emoji: string | null;
  image_url: string | null;
  position: number;
  is_visible: boolean;
  dish_count: number;
}

export default function DashboardCategories() {
  const { restaurant, loading: loadingR } = useManagedRestaurant();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dishCountsUnavailable, setDishCountsUnavailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [dropTargetCategoryId, setDropTargetCategoryId] = useState<string | null>(null);
  const touchDragRef = useRef<{
    sourceId: string;
    targetId: string;
    pointerId: number;
  } | null>(null);

  const getDishesFilterUrl = (categoryId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("category", categoryId);
    return `/dashboard/platillos?${params.toString()}`;
  };

  const load = async () => {
    if (!restaurant) return;
    setLoading(true);
    const [categoriesResult, dishesResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id, restaurant_id, name, emoji, image_url, position, is_visible")
        .eq("restaurant_id", restaurant.id)
        .order("position", { ascending: true }),
      supabase.from("dishes").select("category_id").eq("restaurant_id", restaurant.id),
    ]);
    if (categoriesResult.error) toast.error(categoriesResult.error.message);
    if (dishesResult.error) toast.error(dishesResult.error.message);
    setDishCountsUnavailable(Boolean(dishesResult.error));

    const dishCounts = new Map<string, number>();
    for (const dish of dishesResult.data ?? []) {
      if (dish.category_id) {
        dishCounts.set(dish.category_id, (dishCounts.get(dish.category_id) ?? 0) + 1);
      }
    }
    setItems(
      (categoriesResult.data ?? []).map((category) => ({
        ...category,
        dish_count: dishCounts.get(category.id) ?? 0,
      })) as CategoryRow[],
    );
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
    setImageUrl("");
    setOpen(true);
  };

  const openEdit = (c: CategoryRow) => {
    setEditing(c);
    setName(c.name);
    setEmoji(c.emoji ?? "");
    setImageUrl(c.image_url ?? "");
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
        .update({
          name: name.trim(),
          emoji: emoji.trim() || null,
          image_url: imageUrl.trim() || null,
        })
        .eq("id", editing.id);
      if (error) toast.error(error.message);
      else toast.success("Categoría actualizada");
    } else {
      const nextPos = items.length ? Math.max(...items.map((i) => i.position)) + 1 : 0;
      const { error } = await supabase.from("categories").insert({
        restaurant_id: restaurant.id,
        name: name.trim(),
        emoji: emoji.trim() || null,
        image_url: imageUrl.trim() || null,
        position: nextPos,
      });
      if (error) toast.error(error.message);
      else toast.success("Categoría creada");
    }
    setSaving(false);
    setOpen(false);
    load();
  };

  const handleDelete = async (category: CategoryRow) => {
    if (category.dish_count > 0) return;
    const { error } = await supabase.from("categories").delete().eq("id", category.id);
    if (error) {
      if (error.code === "23503") {
        toast.error("No se puede eliminar una categoría que tiene platillos.");
        await load();
      } else {
        toast.error(error.message);
      }
    }
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

  const persistOrder = async (reordered: CategoryRow[]) => {
    if (reordering) return;
    const normalized = reordered.map((category, position) => ({ ...category, position }));

    setReordering(true);
    try {
      const { error } = await supabase.from("categories").upsert(
        normalized.map(({ id, restaurant_id, name, emoji, image_url, is_visible, position }) => ({
          id,
          restaurant_id,
          name,
          emoji,
          image_url,
          is_visible,
          position,
        })),
        { onConflict: "id" },
      );
      if (error) {
        toast.error(error.message);
        return;
      }
      setItems(normalized);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el orden.");
    } finally {
      setReordering(false);
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length || reordering) return;
    const reordered = [...items];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    await persistOrder(reordered);
  };

  const moveToCategory = async (sourceId: string, targetId: string) => {
    if (reordering || sourceId === targetId) return;
    const sourceIndex = items.findIndex((category) => category.id === sourceId);
    const targetIndex = items.findIndex((category) => category.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const reordered = [...items];
    const [draggedCategory] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, draggedCategory);
    await persistOrder(reordered);
  };

  const startPointerReorder = (
    event: React.PointerEvent<HTMLButtonElement>,
    categoryId: string,
  ) => {
    if (event.pointerType === "mouse" || reordering) return;
    event.preventDefault();
    touchDragRef.current = {
      sourceId: categoryId,
      targetId: categoryId,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraggingCategoryId(categoryId);
    setDropTargetCategoryId(categoryId);
  };

  const updatePointerReorder = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = touchDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const element = document.elementFromPoint?.(event.clientX, event.clientY);
    const targetId = element?.closest<HTMLElement>("[data-category-id]")?.dataset.categoryId;
    if (!targetId) return;

    drag.targetId = targetId;
    setDropTargetCategoryId(targetId);
  };

  const finishPointerReorder = (
    event: React.PointerEvent<HTMLButtonElement>,
    shouldDrop: boolean,
  ) => {
    const drag = touchDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    touchDragRef.current = null;
    setDraggingCategoryId(null);
    setDropTargetCategoryId(null);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    if (shouldDrop) void moveToCategory(drag.sourceId, drag.targetId);
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
            Crea tu primera categoría para organizar el menú.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((c, idx) => (
            <Card
              key={c.id}
              data-category-id={c.id}
              onDragOver={(event) => {
                if (!draggingCategoryId || reordering) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTargetCategoryId(c.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = event.dataTransfer.getData("text/plain") || draggingCategoryId;
                setDraggingCategoryId(null);
                setDropTargetCategoryId(null);
                if (sourceId) void moveToCategory(sourceId, c.id);
              }}
              className={[
                draggingCategoryId === c.id ? "opacity-55" : "",
                dropTargetCategoryId === c.id && draggingCategoryId !== c.id
                  ? "ring-2 ring-primary/40"
                  : "",
              ]
                .filter(Boolean)
                .join(" ") || undefined}
            >
              <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
                <div className="flex min-w-0 items-center gap-2 lg:flex-1 lg:gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    draggable={!reordering && items.length > 1}
                    disabled={reordering}
                    className="touch-none shrink-0 cursor-grab select-none text-muted-foreground active:cursor-grabbing"
                    aria-label={`Arrastrar categoría ${c.name}`}
                    title="Arrastrar para reordenar"
                    onDragStart={(event) => {
                      if (touchDragRef.current) {
                        event.preventDefault();
                        return;
                      }
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", c.id);
                      setDraggingCategoryId(c.id);
                    }}
                    onDragEnd={() => setDraggingCategoryId(null)}
                    onPointerDown={(event) => startPointerReorder(event, c.id)}
                    onPointerMove={updatePointerReorder}
                    onPointerUp={(event) => finishPointerReorder(event, true)}
                    onPointerCancel={(event) => finishPointerReorder(event, false)}
                  >
                    <GripVertical className="h-5 w-5" aria-hidden="true" />
                  </Button>
                  <div className="w-10 shrink-0 text-center text-2xl">{c.emoji ?? "🍽️"}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {dishCountsUnavailable ? (
                        <span>Conteo no disponible</span>
                      ) : (
                        <Link
                          to={getDishesFilterUrl(c.id)}
                          className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {c.dish_count} {c.dish_count === 1 ? "platillo" : "platillos"}
                        </Link>
                      )}
                      {" · "}
                      {c.is_visible ? "Visible" : "Oculta"}
                    </p>
                  </div>
                </div>
                <div className="flex w-full min-w-0 flex-col gap-2 border-t pt-2 sm:flex-row sm:items-center sm:justify-between lg:w-auto lg:flex-row lg:items-center lg:gap-1 lg:border-t-0 lg:pt-0">
                  <div className="flex items-center justify-between gap-2 sm:justify-start lg:px-2">
                    <Label htmlFor={`visible-${c.id}`} className="text-xs cursor-pointer">
                      Visible en el menú
                    </Label>
                    <Switch
                      id={`visible-${c.id}`}
                      checked={c.is_visible}
                      onCheckedChange={() => toggleVisible(c)}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-0.5 sm:shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0 || reordering}
                      aria-label={`Subir categoría ${c.name}`}
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => move(idx, 1)}
                      disabled={idx === items.length - 1 || reordering}
                      aria-label={`Bajar categoría ${c.name}`}
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(c)}
                      aria-label={`Editar categoría ${c.name}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          aria-label={`Eliminar categoría ${c.name}`}
                          disabled={dishCountsUnavailable}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {c.dish_count > 0 ? "No se puede eliminar la categoría" : "¿Eliminar categoría?"}
                          </AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div>
                              {c.dish_count > 0 ? (
                                <>
                                  <p>
                                    Esta categoría contiene {c.dish_count}{" "}
                                    {c.dish_count === 1 ? "platillo." : "platillos."}
                                  </p>
                                  <p>Reasigna esos platillos desde Platillos antes de eliminar la categoría.</p>
                                </>
                              ) : (
                                <p>Se eliminará "{c.name}". Esta acción no se puede deshacer.</p>
                              )}
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          {c.dish_count > 0 ? (
                            <Button asChild>
                              <Link to={getDishesFilterUrl(c.id)}>
                                Ver platillos
                              </Link>
                            </Button>
                          ) : (
                            <AlertDialogAction onClick={() => handleDelete(c)}>
                              Eliminar
                            </AlertDialogAction>
                          )}
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
            <DialogDescription>
              Organiza tus platillos con un nombre y una imagen opcional para el menú.
            </DialogDescription>
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
            <div>
              <Label htmlFor="image-url">Imagen (URL opcional)</Label>
              <Input
                id="image-url"
                type="text"
                inputMode="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... o /ruta-de-imagen.jpg"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Se muestra en el menú público; si no hay imagen, se conserva el emoji.
              </p>
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
