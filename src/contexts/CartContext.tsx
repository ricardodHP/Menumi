import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type Dish } from "@/data/restaurant";
import {
  hydrateSelection,
  readSelection,
  serializeSelection,
  writeSelection,
} from "@/lib/cart-selection";

export interface CartItem {
  dish: Dish;
  quantity: number;
  notes?: string;
  addedByName?: string;
}

export interface SharedCartInfo {
  code: string;
  cartId: string;
  role: "host" | "guest";
  hostName?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (dish: Dish) => void;
  removeItem: (dishId: string) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  setRestaurantScope: (
    restaurantId: string,
    dishes: readonly Dish[],
    options?: { persist?: boolean },
  ) => void;
  selectionNote: string;
  setSelectionNote: (note: string) => void;

  // Shared cart
  shared: SharedCartInfo | null;
  setDishResolver: (fn: (id: string) => Dish | undefined) => void;
  createSharedCart: (restaurantId: string, displayName: string) => Promise<string>;
  joinSharedCart: (code: string, displayName: string) => Promise<boolean>;
  leaveSharedCart: () => void;
  participants: string[];
}

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

const DEVICE_KEY = "shared_cart_device_id";
const NAME_KEY = "shared_cart_display_name";

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getStoredName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function setStoredName(name: string) {
  localStorage.setItem(NAME_KEY, name.trim().slice(0, 32));
}

function makeCode(): string {
  // 6-char base32-ish
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shared, setShared] = useState<SharedCartInfo | null>(null);
  const [selectionNote, setSelectionNoteState] = useState("");
  const [restaurantScope, setRestaurantScopeState] = useState<{
    restaurantId: string;
    dishes: readonly Dish[];
    persist: boolean;
  } | null>(null);
  const restaurantScopeRef = useRef<typeof restaurantScope>(null);
  const sharedRef = useRef<SharedCartInfo | null>(null);
  const dishResolverRef = useRef<(id: string) => Dish | undefined>(() => undefined);

  const setSharedCart = useCallback((next: SharedCartInfo | null) => {
    sharedRef.current = next;
    setShared(next);
  }, []);

  const setDishResolver = useCallback((fn: (id: string) => Dish | undefined) => {
    dishResolverRef.current = fn;
  }, []);

  const setRestaurantScope = useCallback(
    (
      restaurantId: string,
      dishes: readonly Dish[],
      options: { persist?: boolean } = {},
    ) => {
      const nextScope = {
        restaurantId,
        dishes,
        persist: options.persist ?? true,
      };
      restaurantScopeRef.current = nextScope;
      setRestaurantScopeState(nextScope);
      dishResolverRef.current = (id) => dishes.find((dish) => dish.id === id);

      if (!nextScope.persist) {
        if (sharedRef.current) setSharedCart(null);
        setItems([]);
        setSelectionNoteState("");
        setIsCartOpen(false);
        return;
      }

      // Shared cart state has its own lifecycle and must keep working as-is.
      // Local selection hydration is skipped while that mode is active.
      if (sharedRef.current) return;

      const hydrated = hydrateSelection(readSelection(restaurantId), dishes);
      setItems(hydrated.items);
      setSelectionNoteState(hydrated.items.length > 0 ? hydrated.note : "");
      setIsCartOpen(false);
    },
    [setSharedCart],
  );

  const setSelectionNote = useCallback((note: string) => {
    setSelectionNoteState(note.slice(0, 500));
  }, []);

  useEffect(() => {
    if (!shared && items.length === 0 && selectionNote) {
      setSelectionNoteState("");
    }
  }, [items.length, selectionNote, shared]);

  useEffect(() => {
    if (!restaurantScope?.persist || shared) return;
    writeSelection(
      restaurantScope.restaurantId,
      serializeSelection(items, items.length > 0 ? selectionNote : ""),
    );
  }, [items, restaurantScope, selectionNote, shared]);

  // ---------- Local mode mutations ----------
  const addItemLocal = useCallback((dish: Dish) => {
    const currentDish = restaurantScopeRef.current?.dishes.find((item) => item.id === dish.id);
    if (!currentDish || currentDish.isAvailable === false) return;

    setItems((prev) => {
      const existing = prev.find((i) => i.dish.id === dish.id);
      if (existing) {
        return prev.map((i) =>
          i.dish.id === dish.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { dish: currentDish, quantity: 1 }];
    });
  }, []);

  const updateQuantityLocal = useCallback((dishId: string, quantity: number) => {
    if (quantity > 0 && restaurantScopeRef.current?.dishes.find((dish) => dish.id === dishId)?.isAvailable === false) return;
    const normalizedQuantity = Number.isFinite(quantity) ? Math.floor(quantity) : 0;
    if (normalizedQuantity <= 0) {
      setItems((prev) => prev.filter((i) => i.dish.id !== dishId));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.dish.id === dishId ? { ...i, quantity: normalizedQuantity } : i))
      );
    }
  }, []);

  const removeItemLocal = useCallback((dishId: string) => {
    setItems((prev) => prev.filter((i) => i.dish.id !== dishId));
  }, []);

  const clearCartLocal = useCallback(() => {
    setItems([]);
    setSelectionNoteState("");
  }, []);

  // ---------- Shared mode helpers ----------
  const refreshSharedItems = useCallback(async (cartId: string) => {
    const { data } = await supabase
      .from("shared_cart_items")
      .select("dish_id, quantity, added_by_name")
      .eq("cart_id", cartId)
      .order("created_at", { ascending: true });
    if (!data) return;
    const next: CartItem[] = [];
    for (const row of data) {
      const dish = dishResolverRef.current(row.dish_id);
      if (dish && dish.isAvailable !== false) {
        next.push({ dish, quantity: row.quantity, addedByName: row.added_by_name ?? undefined });
      }
    }
    setItems(next);
  }, []);

  // Subscribe to realtime changes for the active shared cart
  useEffect(() => {
    if (!shared) return;
    const cartId = shared.cartId;
    refreshSharedItems(cartId);
    const channel = supabase
      .channel(`shared-cart-${cartId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shared_cart_items", filter: `cart_id=eq.${cartId}` },
        () => refreshSharedItems(cartId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shared, refreshSharedItems]);

  // ---------- Shared mode mutations ----------
  const addItemShared = useCallback(async (dish: Dish) => {
    if (!shared || dishResolverRef.current(dish.id)?.isAvailable === false) return;
    const device = getDeviceId();
    const name = getStoredName() ?? undefined;
    const { data: existing } = await supabase
      .from("shared_cart_items")
      .select("id, quantity")
      .eq("cart_id", shared.cartId)
      .eq("dish_id", dish.id)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("shared_cart_items")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id);
    } else {
      await supabase.from("shared_cart_items").insert({
        cart_id: shared.cartId,
        dish_id: dish.id,
        quantity: 1,
        added_by_device: device,
        added_by_name: name,
      });
    }
    // Optimistic refresh; realtime will reconcile
    refreshSharedItems(shared.cartId);
  }, [shared, refreshSharedItems]);

  const updateQuantityShared = useCallback(async (dishId: string, quantity: number) => {
    if (!shared) return;
    if (quantity > 0 && dishResolverRef.current(dishId)?.isAvailable === false) return;
    if (quantity <= 0) {
      await supabase
        .from("shared_cart_items")
        .delete()
        .eq("cart_id", shared.cartId)
        .eq("dish_id", dishId);
    } else {
      await supabase
        .from("shared_cart_items")
        .update({ quantity })
        .eq("cart_id", shared.cartId)
        .eq("dish_id", dishId);
    }
    refreshSharedItems(shared.cartId);
  }, [shared, refreshSharedItems]);

  const removeItemShared = useCallback(async (dishId: string) => {
    if (!shared) return;
    await supabase
      .from("shared_cart_items")
      .delete()
      .eq("cart_id", shared.cartId)
      .eq("dish_id", dishId);
    refreshSharedItems(shared.cartId);
  }, [shared, refreshSharedItems]);

  const clearCartShared = useCallback(async () => {
    if (!shared) return;
    await supabase.from("shared_cart_items").delete().eq("cart_id", shared.cartId);
    refreshSharedItems(shared.cartId);
  }, [shared, refreshSharedItems]);

  // ---------- Public API ----------
  const addItem = shared ? addItemShared : addItemLocal;
  const updateQuantity = shared ? updateQuantityShared : updateQuantityLocal;
  const removeItem = shared ? removeItemShared : removeItemLocal;
  const clearCart = shared ? clearCartShared : clearCartLocal;

  // ---------- Create / join / leave ----------
  const createSharedCart = useCallback(async (restaurantId: string, displayName: string): Promise<string> => {
    setStoredName(displayName);
    const device = getDeviceId();
    // Try up to 5 times to avoid code collision
    let code = "";
    let cartId = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      code = makeCode();
      const { data, error } = await supabase
        .from("shared_carts")
        .insert({
          restaurant_id: restaurantId,
          code,
          host_device_id: device,
          host_name: displayName,
        })
        .select("id")
        .single();
      if (!error && data) {
        cartId = data.id;
        break;
      }
    }
    if (!cartId) throw new Error("No se pudo crear el carrito compartido");

    // Upload current local items
    if (items.length > 0) {
      const rows = items.map((i) => ({
        cart_id: cartId,
        dish_id: i.dish.id,
        quantity: i.quantity,
        added_by_device: device,
        added_by_name: displayName,
      }));
      await supabase.from("shared_cart_items").insert(rows);
    }

    setSharedCart({ code, cartId, role: "host", hostName: displayName });
    return code;
  }, [items, setSharedCart]);

  const joinSharedCart = useCallback(async (code: string, displayName: string): Promise<boolean> => {
    setStoredName(displayName);
    const { data, error } = await supabase
      .from("shared_carts")
      .select("id, code, host_name")
      .eq("code", code.toLowerCase())
      .maybeSingle();
    if (error || !data) return false;
    setItems([]); // discard local cart; we'll load the shared one
    setSharedCart({ code: data.code, cartId: data.id, role: "guest", hostName: data.host_name ?? undefined });
    return true;
  }, [setSharedCart]);

  const leaveSharedCart = useCallback(() => {
    setSharedCart(null);
    setItems([]);
  }, [setSharedCart]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.dish.price * i.quantity, 0);
  const participants = Array.from(
    new Set(items.map((i) => i.addedByName).filter((n): n is string => !!n)),
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
        setRestaurantScope,
        selectionNote,
        setSelectionNote,
        shared,
        setDishResolver,
        createSharedCart,
        joinSharedCart,
        leaveSharedCart,
        participants,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
