export type MenuTheme = "light" | "dark";

export const MENU_THEMES: ReadonlyArray<{
  value: MenuTheme;
  label: string;
  description: string;
}> = [
  {
    value: "light",
    label: "Claro",
    description: "La apariencia actual, luminosa y familiar.",
  },
  {
    value: "dark",
    label: "Oscuro",
    description: "Fondos oscuros para una experiencia más cómoda con poca luz.",
  },
];

const DARK_THEME_VARS: Record<string, string> = {
  "--background": "222 30% 10%",
  "--foreground": "210 25% 96%",
  "--card": "222 24% 14%",
  "--card-foreground": "210 25% 96%",
  "--popover": "222 24% 14%",
  "--popover-foreground": "210 25% 96%",
  "--secondary": "222 20% 22%",
  "--secondary-foreground": "210 25% 96%",
  "--muted": "222 20% 20%",
  "--muted-foreground": "215 16% 72%",
  "--border": "222 16% 28%",
  "--input": "222 16% 28%",
  "--accent-foreground": "210 25% 96%",
  "--shadow-card": "0 2px 12px -2px hsl(0 0% 0% / 0.35)",
  "--shadow-elevated": "0 8px 30px -8px hsl(0 0% 0% / 0.55)",
};

export function normalizeMenuTheme(value: unknown): MenuTheme {
  return value === "dark" ? "dark" : "light";
}

export function getMenuThemeStyles(theme: MenuTheme): Record<string, string> {
  return theme === "dark" ? DARK_THEME_VARS : {};
}
