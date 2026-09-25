import { describe, expect, it } from "vitest";
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppNumber,
} from "./whatsapp";

describe("WhatsApp destination and order message", () => {
  it("normalizes Mexican phone input and legacy wa.me URLs", () => {
    expect(normalizeWhatsAppNumber("55 1234-5678")).toBe("525512345678");
    expect(normalizeWhatsAppNumber("+52 (55) 1234 5678")).toBe("525512345678");
    expect(normalizeWhatsAppNumber("5215512345678")).toBe("525512345678");
    expect(normalizeWhatsAppNumber("https://wa.me/525512345678")).toBe("525512345678");
    expect(normalizeWhatsAppNumber("12345678")).toBeNull();
    expect(normalizeWhatsAppNumber("https://example.com/525512345678")).toBeNull();
    expect(normalizeWhatsAppNumber("not a phone number")).toBeNull();
  });

  it("builds the message with each quantity, subtotal, total and optional note", () => {
    const message = buildWhatsAppMessage([
      { dish: { name: "Margherita", price: 180 }, quantity: 2 },
      { dish: { name: "Tiramisú", price: 90 }, quantity: 1 },
    ], "  Sin cebolla  ");

    expect(message).toContain("Hola, me interesa realizar el siguiente pedido:");
    expect(message).toContain("2 × Margherita — $360.00 MXN");
    expect(message).toContain("1 × Tiramisú — $90.00 MXN");
    expect(message).toContain("Total: $450.00 MXN");
    expect(message).toContain("Notas:\nSin cebolla");
    expect(message).not.toMatch(/mesa|mesero|confirmad|recibid|pago/i);
    expect(buildWhatsAppMessage([{ dish: { name: "Taco", price: 50 }, quantity: 1 }], " "))
      .not.toContain("Notas:");
  });

  it("encodes the prefilled message and rejects an invalid destination", () => {
    const url = buildWhatsAppUrl("+52 55 1234 5678", "Hola, ¿qué tal?\nTaco & salsa");

    expect(url).toBe("https://wa.me/525512345678?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F%0ATaco%20%26%20salsa");
    expect(buildWhatsAppUrl("javascript:alert(1)", "Hola")).toBeNull();
  });
});
