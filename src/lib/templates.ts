import type { RestaurantInfo } from "@/data/restaurant";

export interface TemplateStyles {
  // CSS variable overrides applied to the root element via inline style.
  vars: Record<string, string>;
  // Optional decoration emoji shown next to the username.
  emoji: string;
  // Google font family (already loaded globally via index.css).
  fontFamily?: string;
}

export const templateStyles: Record<RestaurantInfo["cuisineTemplate"], TemplateStyles> = {
  generic: {
    vars: {},
    emoji: "🍽️",
  },
  mexican: {
    vars: {
      "--background": "30 33% 97%",
      "--foreground": "20 20% 12%",
      "--primary": "16 80% 55%",
      "--primary-foreground": "0 0% 100%",
      "--accent": "45 80% 58%",
      "--secondary": "35 60% 92%",
      "--ring": "16 80% 55%",
      "--gradient-story":
        "linear-gradient(135deg, hsl(16, 80%, 55%), hsl(45, 80%, 58%), hsl(140, 50%, 45%))",
    },
    emoji: "🌮",
    fontFamily: "'Inter', sans-serif",
  },
  italian: {
    vars: {
      "--background": "40 30% 97%",
      "--foreground": "20 30% 15%",
      "--primary": "0 65% 45%",
      "--primary-foreground": "0 0% 100%",
      "--accent": "140 40% 38%",
      "--secondary": "40 50% 92%",
      "--ring": "0 65% 45%",
      "--gradient-story":
        "linear-gradient(135deg, hsl(0, 65%, 45%), hsl(40, 70%, 60%), hsl(140, 40%, 38%))",
    },
    emoji: "🍝",
    fontFamily: "'Playfair Display', 'Inter', serif",
  },
  chinese: {
    vars: {
      "--background": "0 0% 98%",
      "--foreground": "0 30% 12%",
      "--primary": "0 75% 45%",
      "--primary-foreground": "0 0% 100%",
      "--accent": "45 90% 55%",
      "--secondary": "0 50% 95%",
      "--ring": "0 75% 45%",
      "--gradient-story":
        "linear-gradient(135deg, hsl(0, 75%, 45%), hsl(45, 90%, 55%), hsl(15, 70%, 50%))",
    },
    emoji: "🥡",
    fontFamily: "'Inter', sans-serif",
  },
  japanese: {
    vars: {
      "--background": "0 0% 98%",
      "--foreground": "220 15% 15%",
      "--primary": "350 70% 50%",
      "--primary-foreground": "0 0% 100%",
      "--accent": "220 15% 25%",
      "--secondary": "350 30% 95%",
      "--ring": "350 70% 50%",
      "--gradient-story":
        "linear-gradient(135deg, hsl(350, 70%, 50%), hsl(330, 60%, 70%), hsl(220, 15%, 25%))",
    },
    emoji: "🍣",
    fontFamily: "'Inter', sans-serif",
  },
};

export function getTemplateStyles(t: RestaurantInfo["cuisineTemplate"]): TemplateStyles {
  return templateStyles[t] ?? templateStyles.generic;
}
