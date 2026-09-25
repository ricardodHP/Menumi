import { X, Minus, Plus, Trash2, ShoppingBag, MessageCircle, Users, LogOut, Share2 } from "lucide-react";
import { useCart, getStoredName } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import { toast } from "sonner";
import SharedCartQrModal from "./SharedCartQrModal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatCurrency } from "@/lib/currency";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics";

interface CartModalProps {
  isPreview?: boolean;
}

const CartModal = ({ isPreview = false }: CartModalProps) => {
  const {
    items, updateQuantity, clearCart, totalItems, totalPrice,
    isCartOpen, setIsCartOpen,
    shared, createSharedCart, leaveSharedCart, participants,
    selectionNote, setSelectionNote,
  } = useCart();
  const { slug } = useParams<{ slug: string }>();
  const { restaurant, loading: restaurantLoading } = useRestaurantData(slug, { preview: isPreview });
  const [creating, setCreating] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const shareUrl = useMemo(() => {
    if (!shared || !restaurant) return "";
    return `${window.location.origin}/r/${restaurant.username}?group=${shared.code}`;
  }, [shared, restaurant]);

  const whatsappUrl = useMemo(() => {
    if (
      restaurantLoading ||
      !restaurant ||
      restaurant.username !== slug ||
      !restaurant.whatsappEnabled ||
      items.length === 0 ||
      shared
    ) return null;
    return buildWhatsAppUrl(
      restaurant.whatsappLink,
      buildWhatsAppMessage(items, selectionNote),
    );
  }, [items, restaurant, restaurantLoading, selectionNote, shared, slug]);

  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  const handleCreateShared = async () => {
    if (isPreview) return;
    if (!restaurant) {
      toast.error("Restaurante no disponible");
      return;
    }
    const stored = getStoredName();
    const name = stored ?? window.prompt("¿Cuál es tu nombre?", "")?.trim() ?? "";
    if (!name) {
      toast.error("Necesitas un nombre para crear el carrito");
      return;
    }
    setCreating(true);
    try {
      await createSharedCart(restaurant.id, name);
      setQrOpen(true);
    } catch (e) {
      toast.error("No se pudo crear el carrito compartido");
    } finally {
      setCreating(false);
    }
  };

  const handleShareLink = () => {
    if (!shared || !restaurant) return;
    setQrOpen(true);
  };

  const handleWhatsAppClick = () => {
    if (!whatsappUrl || !restaurant) return;
    if (!isPreview) {
      trackEvent({ restaurantId: restaurant.id, eventType: "whatsapp_clicked", isPreview });
    }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Panel */}
      <div className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto bg-background rounded-t-2xl shadow-elevated animate-fade-in max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">
              {shared ? "Carrito grupal" : "Mi pedido"} ({totalItems})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && !shared && (
              <button
                onClick={clearCart}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Vaciar
              </button>
            )}
            <button onClick={() => setIsCartOpen(false)} className="p-1 text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Shared banner */}
        {shared && (
          <div className="px-4 py-2.5 bg-primary/10 border-b border-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  Código para unirse: <span className="tracking-widest">{shared.code.toUpperCase()}</span>
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {participants.length > 0
                    ? `Participan: ${participants.join(", ")}`
                    : "Toca el ícono para mostrar el QR"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleShareLink}
                className="p-1.5 rounded-full hover:bg-primary/20 text-primary"
                aria-label="Mostrar QR del carrito"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (window.confirm("¿Salir del carrito grupal? Tu carrito local quedará vacío.")) {
                    leaveSharedCart();
                  }
                }}
                className="p-1.5 rounded-full hover:bg-destructive/10 text-destructive"
                aria-label="Salir del grupo"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {shared ? "Aún no hay platillos en el pedido grupal." : "Aún no has agregado platillos."}
              </p>
              <p className="text-xs mt-1">Explora el menú para comenzar</p>
              {!shared && (
                <Button
                  variant="outline"
                  className="mt-4 h-9 text-xs"
                  onClick={() => setIsCartOpen(false)}
                >
                  Seguir explorando
                </Button>
              )}
            </div>
          ) : shared ? (
            (() => {
              const myName = (getStoredName() ?? "").trim();
              const groups = new Map<string, typeof items>();
              for (const it of items) {
                const key = (it.addedByName ?? "Sin nombre").trim() || "Sin nombre";
                if (!groups.has(key)) groups.set(key, [] as typeof items);
                groups.get(key)!.push(it);
              }
              const myKey = myName || "Sin nombre";
              const mine = groups.get(myKey) ?? [];
              groups.delete(myKey);
              const others = Array.from(groups.entries());

              const renderItem = (item: typeof items[number]) => (
                <div key={item.dish.id} className="flex items-center gap-3 px-4 py-3">
                  <img
                    src={item.dish.image}
                    alt={item.dish.name}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.dish.name}</p>
                    <p className="text-sm font-bold text-primary">
                      {formatCurrency(item.dish.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.dish.id, item.quantity - 1)}
                      aria-label={`${item.quantity === 1 ? "Eliminar" : "Disminuir"} ${item.dish.name}`}
                      className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      ) : (
                        <Minus className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="text-sm font-semibold w-5 text-center text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.dish.id, item.quantity + 1)}
                      aria-label={`Aumentar ${item.dish.name}`}
                      className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );

              const groupTotal = (list: typeof items) =>
                list.reduce((s, i) => s + i.dish.price * i.quantity, 0);
              const groupCount = (list: typeof items) =>
                list.reduce((s, i) => s + i.quantity, 0);

              return (
                <div>
                  {/* My items always on top */}
                  <div className="bg-primary/5 border-b border-border">
                    <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Tus platillos {myName ? `· ${myName}` : ""}
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        {groupCount(mine)} · {formatCurrency(groupTotal(mine))}
                      </span>
                    </div>
                    {mine.length === 0 ? (
                      <p className="px-4 pb-3 pt-1 text-xs text-muted-foreground">
                        Aún no has agregado nada al carrito grupal.
                      </p>
                    ) : (
                      <div className="divide-y divide-border">{mine.map(renderItem)}</div>
                    )}
                  </div>

                  {/* Other participants as accordion */}
                  {others.length > 0 && (
                    <Accordion type="multiple" className="px-2">
                      {others.map(([name, list]) => (
                        <AccordionItem key={name} value={name} className="border-b border-border">
                          <AccordionTrigger className="px-2 py-3 hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                                  {name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-semibold text-foreground truncate">
                                  {name}
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                                {groupCount(list)} · {formatCurrency(groupTotal(list))}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-0">
                            <div className="divide-y divide-border">{list.map(renderItem)}</div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.dish.id} className="flex items-center gap-3 px-4 py-3">
                  <img
                    src={item.dish.image}
                    alt={item.dish.name}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.dish.name}</p>
                    <p className="text-sm font-bold text-primary">
                      {formatCurrency(item.dish.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.dish.id, item.quantity - 1)}
                      aria-label={`${item.quantity === 1 ? "Eliminar" : "Disminuir"} ${item.dish.name}`}
                      className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      ) : (
                        <Minus className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="text-sm font-semibold w-5 text-center text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.dish.id, item.quantity + 1)}
                      aria-label={`Aumentar ${item.dish.name}`}
                      className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border px-4 py-3 shrink-0 space-y-3">
            {!shared && (
              <div className="space-y-1.5">
                <label htmlFor="selection-note" className="text-xs font-medium text-foreground">
                  Nota para tu selección (opcional)
                </label>
                <textarea
                  id="selection-note"
                  value={selectionNote}
                  onChange={(event) => setSelectionNote(event.target.value)}
                  placeholder="Ej. Sin cebolla"
                  maxLength={500}
                  rows={2}
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold text-foreground">{formatCurrency(totalPrice)}</span>
            </div>
            <>
              {whatsappUrl && (
              <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="h-11 px-4 text-sm font-semibold border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10"
                    onClick={handleWhatsAppClick}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Pedir por WhatsApp
                  </Button>
              </div>
              )}
              {!shared && !isPreview && (
                <Button
                  variant="secondary"
                  className="w-full h-10 text-sm font-semibold"
                  onClick={handleCreateShared}
                  disabled={creating}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {creating ? "Creando..." : "Compartir con amigos (carrito en vivo)"}
                </Button>
              )}
            </>
          </div>
        )}
      </div>
    </div>
    <SharedCartQrModal
      open={qrOpen}
      onClose={() => setQrOpen(false)}
      url={shareUrl}
      code={shared?.code ?? ""}
      restaurantName={restaurant?.name}
    />
    </>
  );
};

export default CartModal;
