// Shared shape used across UI components. Data is loaded from the database
// via useRestaurantData, but the UI components keep working with this shape.
import type { WeeklyBusinessDay } from "@/lib/business-hours";

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string; // category id ("populares" is virtual)
  rating: number;
  likes: number;
  tags: string[];
  showRating: boolean;
  reviewsCount?: number;
}

export interface Category {
  id: string;
  name: string;
  image: string;
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
  /** Normalized username. Public URLs are built only at the Instagram boundary. */
  instagramUsername: string;
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
