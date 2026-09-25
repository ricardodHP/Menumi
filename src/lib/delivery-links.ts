export const DELIVERY_PLATFORMS = [
  { key: "uber_eats", label: "Uber Eats" },
  { key: "rappi", label: "Rappi" },
  { key: "didi_food", label: "DiDi Food" },
] as const;

export type DeliveryPlatform = (typeof DELIVERY_PLATFORMS)[number]["key"];
export interface CustomDeliveryLink {
  label: string;
  url: string;
}
export type DeliveryLinks = Partial<Record<DeliveryPlatform, string>> & {
  other?: CustomDeliveryLink;
};

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function parseDeliveryLinks(value: unknown): DeliveryLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const source = value as Record<string, unknown>;
  const knownLinks = Object.fromEntries(
    DELIVERY_PLATFORMS.flatMap(({ key }) => {
      const candidate = source[key];
      if (typeof candidate !== "string") return [];
      const url = candidate.trim();
      return url && isHttpUrl(url) ? [[key, url]] : [];
    }),
  ) as Partial<Record<DeliveryPlatform, string>>;
  const custom = source.other;
  if (!custom || typeof custom !== "object" || Array.isArray(custom)) return knownLinks;

  const customSource = custom as Record<string, unknown>;
  const label = typeof customSource.label === "string" ? customSource.label.trim() : "";
  const url = typeof customSource.url === "string" ? customSource.url.trim() : "";
  return label && url && isHttpUrl(url) ? { ...knownLinks, other: { label, url } } : knownLinks;
}
