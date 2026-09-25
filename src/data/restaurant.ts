// Shared shape used across UI components. Data is loaded from the database
// via useRestaurantData, but the UI components keep working with this shape.
import type { WeeklyBusinessDay } from "@/lib/business-hours";
import type { MenuLayout } from "@/lib/menu-layout";
import type { MenuTheme } from "@/lib/menu-theme";
import type { DeliveryLinks } from "@/lib/delivery-links";

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  hasRealImage?: boolean;
  category: string; // category id ("populares" is virtual)
  rating: number;
  likes: number;
  tags: string[];
  showRating: boolean;
  isAvailable?: boolean;
  reviewsCount?: number;
}

export interface Category {
  id: string;
  name: string;
  image: string;
  hasRealImage?: boolean;
  emoji: string;
}

export interface RestaurantInfo {
  id: string;
  name: string;
  username: string; // slug
  bio: string;
  posts: number;
  whatsappLink: string;
  whatsappEnabled: boolean;
  phone?: string;
  deliveryLinks?: DeliveryLinks;
  /** Normalized username. Public URLs are built only at the Instagram boundary. */
  instagramUsername: string;
  menuLayout: MenuLayout;
  menuTheme: MenuTheme;
  ownerId: string | null;
  address?: string;
  /** Legacy free-text fallback while structured business hours are not configured. */
  hours?: string;
  businessHours?: WeeklyBusinessDay[] | null;
  businessHoursLoadError?: boolean;
  logo: string;
  cuisineTemplate: "generic" | "mexican" | "italian" | "chinese" | "japanese";
  showByRating: boolean;
  showRating: boolean;
  allowReviews?: boolean;
}
