import type { CartItem } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/currency";

const WHATSAPP_LINK_HOST = "wa.me";

/** Converts pilot-market phone input or an existing wa.me link to an E.164-style digit string. */
export function normalizeWhatsAppNumber(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;

  let candidate = input.trim();
  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      if (
        url.protocol !== "https:" ||
        url.hostname !== WHATSAPP_LINK_HOST ||
        url.username ||
        url.password ||
        url.port
      ) return null;
      candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
      if (url.pathname.split("/").filter(Boolean).length !== 1) return null;
    } catch {
      return null;
    }
  }

  if (!/^\+?[\d\s().-]+$/.test(candidate)) return null;
  let digits = candidate.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.length === 10) digits = `52${digits}`;
  // Mexican mobile wa.me links sometimes retain the legacy 521 prefix.
  if (digits.startsWith("521") && digits.length === 13) digits = `52${digits.slice(3)}`;

  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function getWhatsAppPhoneInputValue(input: string | null | undefined): string {
  const number = normalizeWhatsAppNumber(input);
  return number ? `+${number}` : input ?? "";
}

type WhatsAppOrderItem = Pick<CartItem, "quantity"> & {
  dish: Pick<CartItem["dish"], "name" | "price">;
};

export function buildWhatsAppMessage(items: readonly WhatsAppOrderItem[], note: string): string {
  const lines = items.map(({ dish, quantity }) =>
    `${quantity} × ${dish.name} — ${formatCurrency(dish.price * quantity)}`
  );
  const total = items.reduce((sum, { dish, quantity }) => sum + dish.price * quantity, 0);
  const message = [
    "Hola, me interesa realizar el siguiente pedido:",
    "",
    ...lines,
    "",
    `Total: ${formatCurrency(total)}`,
  ];
  const trimmedNote = note.trim();

  if (trimmedNote) message.push("", "Notas:", trimmedNote);
  return message.join("\n");
}

export function buildWhatsAppUrl(destination: string | null | undefined, message: string): string | null {
  const number = normalizeWhatsAppNumber(destination);
  if (!number) return null;
  return `https://${WHATSAPP_LINK_HOST}/${number}?text=${encodeURIComponent(message)}`;
}
