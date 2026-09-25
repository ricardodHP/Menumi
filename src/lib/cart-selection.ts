export interface PersistedSelectionItem {
  dishId: string;
  quantity: number;
}

export interface PersistedSelection {
  items: PersistedSelectionItem[];
  note: string;
}

export interface SelectionItemLike<D extends { id: string }> {
  dish: D;
  quantity: number;
}

export function getSelectionStorageKey(restaurantId: string): string {
  return `menumi:selection:${restaurantId}`;
}

function normalizeSelection(value: unknown): PersistedSelection {
  if (!value || typeof value !== "object") return { items: [], note: "" };

  const raw = value as { items?: unknown; note?: unknown };
  const quantities = Array.isArray(raw.items)
    ? raw.items.reduce((result, item) => {
        if (!item || typeof item !== "object") return result;
        const candidate = item as { dishId?: unknown; quantity?: unknown };
        const dishId = typeof candidate.dishId === "string" ? candidate.dishId : "";
        const quantity = Number(candidate.quantity);
        if (!dishId || !Number.isFinite(quantity) || quantity < 1) return result;
        result.set(dishId, (result.get(dishId) ?? 0) + Math.floor(quantity));
        return result;
      }, new Map<string, number>())
    : new Map<string, number>();

  const items = Array.from(quantities, ([dishId, quantity]) => ({ dishId, quantity }));

  return {
    items,
    note: typeof raw.note === "string" ? raw.note : "",
  };
}

export function readSelection(
  restaurantId: string,
  storage: Storage = window.localStorage,
): PersistedSelection {
  try {
    const raw = storage.getItem(getSelectionStorageKey(restaurantId));
    return raw ? normalizeSelection(JSON.parse(raw)) : { items: [], note: "" };
  } catch {
    return { items: [], note: "" };
  }
}

export function writeSelection(
  restaurantId: string,
  selection: PersistedSelection,
  storage: Storage = window.localStorage,
): void {
  try {
    storage.setItem(getSelectionStorageKey(restaurantId), JSON.stringify(normalizeSelection(selection)));
  } catch {
    // Local persistence is best-effort; the in-memory selection remains usable.
  }
}

export function hydrateSelection<D extends { id: string }>(
  selection: PersistedSelection,
  dishes: readonly D[],
): { items: SelectionItemLike<D>[]; note: string } {
  const dishesById = new Map(dishes.map((dish) => [dish.id, dish]));
  const items: SelectionItemLike<D>[] = [];

  for (const item of selection.items) {
    const dish = dishesById.get(item.dishId);
    if (dish && (dish as D & { isAvailable?: boolean }).isAvailable !== false && item.quantity > 0) {
      items.push({ dish, quantity: item.quantity });
    }
  }

  return { items, note: selection.note };
}

export function serializeSelection<D extends { id: string }>(
  items: readonly SelectionItemLike<D>[],
  note: string,
): PersistedSelection {
  return normalizeSelection({
    items: items.map(({ dish, quantity }) => ({ dishId: dish.id, quantity })),
    note,
  });
}
