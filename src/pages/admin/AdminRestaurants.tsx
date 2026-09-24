import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Plus, ExternalLink, Pencil, Trash2, UserPlus, Check, ChevronsUpDown, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { slugify } from "@/lib/slug";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type CuisineTemplate = Database["public"]["Enums"]["cuisine_template"];
type RestaurantStatus = Database["public"]["Enums"]["restaurant_status"];

interface RestaurantRow {
  id: string;
  name: string;
  slug: string;
  status: RestaurantStatus;
  cuisine_template: CuisineTemplate;
  owner_id: string | null;
}

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  roles: string[];
}

const TEMPLATES: { value: CuisineTemplate; label: string }[] = [
  { value: "generic", label: "Genérica" },
  { value: "mexican", label: "Mexicana" },
  { value: "italian", label: "Italiana" },
  { value: "chinese", label: "China" },
  { value: "japanese", label: "Japonesa" },
];

export default function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RestaurantRow | null>(null);
  const [open, setOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<RestaurantRow | null>(null);

  // form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState<CuisineTemplate>("generic");
  const [status, setStatus] = useState<RestaurantStatus>("draft");
  const [saving, setSaving] = useState(false);

  // assign form
  const [assignUserId, setAssignUserId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const usersById = useMemo(() => {
    const m = new Map<string, UserRow>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, slug, status, cuisine_template, owner_id")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRestaurants((data ?? []) as RestaurantRow[]);
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
    ) => Promise<{ data: UserRow[] | null; error: { message: string } | null }>)(
      "list_users_with_roles",
    );
    if (error) toast.error(error.message);
    else setUsers(data ?? []);
  };

  useEffect(() => {
    load();
    loadUsers();
  }, []);

  const openNew = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setTemplate("generic");
    setStatus("draft");
    setOpen(true);
  };

  const openEdit = (r: RestaurantRow) => {
    setEditing(r);
    setName(r.name);
    setSlug(r.slug);
    setTemplate(r.cuisine_template);
    setStatus(r.status);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Nombre y slug son obligatorios");
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("restaurants")
        .update({
          name: name.trim(),
          slug: slug.trim(),
          cuisine_template: template,
          status,
        })
        .eq("id", editing.id);
      if (error) toast.error(error.message);
      else toast.success("Restaurante actualizado");
    } else {
      const { error } = await supabase.from("restaurants").insert({
        name: name.trim(),
        slug: slug.trim(),
        cuisine_template: template,
        status,
      });
      if (error) toast.error(error.message);
      else toast.success("Restaurante creado");
    }
    setSaving(false);
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("restaurants").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Restaurante eliminado");
      load();
    }
  };

  const handleAssignOwner = async () => {
    if (!assignFor) return;
    setAssigning(true);
    const newOwnerId = assignUserId;
    if (newOwnerId) {
      // Ensure they have the 'owner' role
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: newOwnerId, role: "owner" });
      if (roleErr && !roleErr.message.includes("duplicate")) {
        toast.error(roleErr.message);
      }
    }
    const { error: updErr } = await supabase
      .from("restaurants")
      .update({ owner_id: newOwnerId })
      .eq("id", assignFor.id);
    if (updErr) toast.error(updErr.message);
    else toast.success(newOwnerId ? "Dueño asignado" : "Dueño removido");
    setAssigning(false);
    setAssignFor(null);
    setAssignUserId(null);
    load();
    loadUsers();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Restaurantes</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona todos los restaurantes de la plataforma
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : restaurants.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay restaurantes todavía. Crea el primero con el botón "Nuevo".
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{r.name}</h3>
                  <Badge variant={r.status === "published" ? "default" : "secondary"}>
                    {r.status === "published" ? "Publicado" : "Borrador"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>/r/{r.slug}</p>
                  <p>Plantilla: {TEMPLATES.find((t) => t.value === r.cuisine_template)?.label}</p>
                  <p>
                    Dueño:{" "}
                    {r.owner_id ? (
                      <span className="text-foreground font-medium">
                        {usersById.get(r.owner_id)?.display_name ||
                          usersById.get(r.owner_id)?.email ||
                          "—"}
                      </span>
                    ) : (
                      <span className="italic">Sin dueño</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/r/${r.slug}`} target="_blank">
                      <ExternalLink className="h-3 w-3" /> Ver
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAssignFor(r);
                      setAssignUserId(r.owner_id ?? null);
                    }}
                  >
                    <UserPlus className="h-3 w-3" /> Dueño
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar restaurante?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará "{r.name}" junto con sus categorías y platillos. No se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(r.id)}>
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

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar restaurante" : "Nuevo restaurante"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editing) setSlug(slugify(e.target.value));
                }}
                placeholder="Ej. La Casa del Sabor"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="la-casa-del-sabor"
              />
              <p className="text-xs text-muted-foreground mt-1">URL pública: /r/{slug || "..."}</p>
            </div>
            <div>
              <Label>Plantilla</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as CuisineTemplate)}>
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
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as RestaurantStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Assign owner dialog */}
      <Dialog
        open={!!assignFor}
        onOpenChange={(v) => {
          if (!v) {
            setAssignFor(null);
            setAssignUserId(null);
            setPickerOpen(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar dueño a {assignFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {assignFor?.owner_id && (
              <div className="text-xs bg-muted/50 border border-border rounded-md p-2">
                <p className="text-muted-foreground">Dueño actual:</p>
                <p className="font-medium">
                  {usersById.get(assignFor.owner_id)?.display_name ||
                    usersById.get(assignFor.owner_id)?.email ||
                    "Usuario desconocido"}
                </p>
                {usersById.get(assignFor.owner_id)?.email && (
                  <p className="text-muted-foreground">
                    {usersById.get(assignFor.owner_id)?.email}
                  </p>
                )}
              </div>
            )}
            <div>
              <Label>Buscar usuario por correo</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {assignUserId ? (
                      <span className="truncate">
                        {usersById.get(assignUserId)?.email ?? "Usuario seleccionado"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Selecciona un usuario…</span>
                    )}
                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por correo o nombre…" />
                    <CommandList>
                      <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                      <CommandGroup>
                        {users.map((u) => (
                          <CommandItem
                            key={u.id}
                            value={`${u.email} ${u.display_name ?? ""}`}
                            onSelect={() => {
                              setAssignUserId(u.id);
                              setPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "h-3.5 w-3.5 mr-2",
                                assignUserId === u.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{u.email}</p>
                              {u.display_name && (
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {u.display_name}
                                </p>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {assignUserId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs text-muted-foreground"
                  onClick={() => setAssignUserId(null)}
                >
                  <X className="h-3 w-3" /> Quitar selección (remover dueño)
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Al confirmar sin seleccionar usuario se removerá el dueño actual. El usuario
                seleccionado obtendrá automáticamente el rol "owner".
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignFor(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignOwner} disabled={assigning}>
              {assigning ? "Asignando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
