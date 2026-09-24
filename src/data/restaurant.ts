// Shared shape used across UI components. Data is loaded from the database
// via useRestaurantData, but the UI components keep working with this shape.

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
  instagramLink: string;
  address?: string;
  hours?: string;
  logo: string;
  cuisineTemplate: "generic" | "mexican" | "italian" | "chinese" | "japanese";
  showByRating: boolean;
  showRating: boolean;
}
