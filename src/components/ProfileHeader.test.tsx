import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
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
  whatsappEnabled: true,
  instagramUsername: "https://instagram.com/dragondorado",
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

  it("does not offer WhatsApp outside a non-empty Mi pedido selection", () => {
    render(<ProfileHeader restaurant={restaurant} />);

    expect(screen.queryByRole("button", { name: /mensaje|whatsapp/i })).not.toBeInTheDocument();
  });

  it("builds a canonical Instagram URL from a stored legacy URL", () => {
    render(<ProfileHeader restaurant={restaurant} />);

    const followLink = screen.getByRole("link", { name: /Seguir @dragondorado/i });
    expect(followLink).toHaveAttribute("href", "https://www.instagram.com/dragondorado/");
    expect(followLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows the structured week in public hours details while preserving the legacy fallback", () => {
    render(<ProfileHeader restaurant={{
      ...restaurant,
      businessHours: [
        { dayOfWeek: 1, isClosed: false, intervals: [{ openTime: "18:00", closeTime: "02:00" }] },
        ...[2, 3, 4, 5, 6, 7].map((day) => ({
          dayOfWeek: day as 2 | 3 | 4 | 5 | 6 | 7,
          isClosed: true,
          intervals: [],
        })),
      ],
    }} />);

    fireEvent.click(screen.getByRole("button", { name: "Ver horarios" }));
    expect(screen.getByText("18:00–02:00")).toBeInTheDocument();
    expect(screen.getByText("Mar")).toBeInTheDocument();
  });
});
