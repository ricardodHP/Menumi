import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReviewsModal from "./ReviewsModal";

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(() => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({
        data: [{
          id: "review-1",
          rating: 4,
          comment: "Muy rico",
          author_name: "Ana",
          created_at: "2026-01-01T00:00:00Z",
        }],
        error: null,
      }).then(resolve),
    };
    return query;
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: supabaseMock }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("restaurant review submission setting", () => {
  it("keeps historical restaurant reviews visible but hides new submissions when disabled", async () => {
    render(
      <ReviewsModal
        open
        onClose={vi.fn()}
        title="Reseñas del restaurante"
        restaurantId="restaurant-1"
        allowRestaurantSubmission={false}
      />,
    );

    expect(await screen.findByText("Muy rico")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar reseña" })).not.toBeInTheDocument();
    expect(screen.getByText("Reseñas (1)")).toBeInTheDocument();
  });

  it("does not apply the restaurant setting to dish reviews", async () => {
    render(
      <ReviewsModal
        open
        onClose={vi.fn()}
        title="Reseñas del platillo"
        restaurantId="restaurant-1"
        dishId="dish-1"
        allowRestaurantSubmission={false}
      />,
    );

    expect(await screen.findByRole("button", { name: "Enviar reseña" })).toBeEnabled();
  });
});
