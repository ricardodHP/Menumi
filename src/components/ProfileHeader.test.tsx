import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProfileHeader from "./ProfileHeader";
import type { RestaurantInfo } from "@/data/restaurant";

const restaurant = {
  id: "restaurant-1",
  name: "Dragón Dorado",
  username: "dragon-dorado",
  bio: "Sabores tradicionales",
  posts: 6,
  whatsappLink: "https://wa.me/523312345678",
  instagramLink: "https://instagram.com/dragon-dorado",
  address: "Calle Hidalgo 45",
  hours: "Mar-Dom 12:00-22:00",
  logo: "/seed/restaurant-logo.png",
  cuisineTemplate: "generic",
  showByRating: false,
  showRating: true,
} as RestaurantInfo;

describe("ProfileHeader public MVP profile", () => {
  it("does not expose follower or following metrics", () => {
    render(<ProfileHeader restaurant={restaurant} />);

    expect(screen.queryByText("seguidores")).not.toBeInTheDocument();
    expect(screen.queryByText("siguiendo")).not.toBeInTheDocument();
  });
});
