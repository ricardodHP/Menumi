import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardCategories from "./DashboardCategories";

const mockData = vi.hoisted(() => ({
  categories: [] as Array<Record<string, unknown>>,
  categoryQueryError: false,
  dishes: [] as Array<{ category_id: string | null }>,
  dishQueryError: false,
  updates: [] as Array<Record<string, unknown>>,
  upserts: [] as Array<Array<Record<string, unknown>>>,
  deletes: [] as string[],
}));

vi.mock("@/hooks/useManagedRestaurant", () => ({
  useManagedRestaurant: () => ({
    restaurant: { id: "restaurant-1", status: "draft" },
    loading: false,
    reload: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "owner@example.com" },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "dishes") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              data: mockData.dishQueryError ? null : mockData.dishes,
              error: mockData.dishQueryError ? { message: "No se pudo cargar el conteo" } : null,
            })),
          })),
        };
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: mockData.categoryQueryError ? null : mockData.categories,
              error: mockData.categoryQueryError ? { message: "No se pudieron cargar las categorías" } : null,
            })),
          })),
        })),
        update: vi.fn((changes: Record<string, unknown>) => ({
          eq: vi.fn(async (_column: string, id: string) => {
            mockData.updates.push(changes);
            mockData.categories = mockData.categories.map((category) =>
              category.id === id ? { ...category, ...changes } : category,
            );
            return { error: null };
          }),
        })),
        upsert: vi.fn(async (rows: Array<Record<string, unknown>>) => {
          mockData.upserts.push(rows);
          mockData.categories = rows;
          return { error: null };
        }),
        insert: vi.fn(async (row: Record<string, unknown>) => {
          mockData.categories = [...mockData.categories, row];
          return { error: null };
        }),
        delete: vi.fn(() => ({
          eq: vi.fn(async (_column: string, id: string) => {
            mockData.deletes.push(id);
            mockData.categories = mockData.categories.filter((category) => category.id !== id);
            return { error: null };
          }),
        })),
      };
    }),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const category = (overrides: Record<string, unknown> = {}) => ({
  id: "category-1",
  restaurant_id: "restaurant-1",
  name: "Pastas",
  emoji: "🍝",
  image_url: null,
  position: 0,
  is_visible: true,
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard/categorias"]}>
      <DashboardCategories />
    </MemoryRouter>,
  );

describe("DashboardCategories", () => {
  beforeEach(() => {
    mockData.categories = [category()];
    mockData.categoryQueryError = false;
    mockData.dishes = [{ category_id: "category-1" }];
    mockData.dishQueryError = false;
    mockData.updates = [];
    mockData.upserts = [];
    mockData.deletes = [];
  });

  it("replaces numeric position with the per-category dish count", async () => {
    renderPage();

    expect(await screen.findByText("1 platillo")).toBeInTheDocument();
    expect(screen.queryByText(/Posición\s+\d+/)).not.toBeInTheDocument();
  });

  it("shows a retry state instead of an empty catalog when categories fail to load", async () => {
    mockData.categoryQueryError = true;
    renderPage();

    expect(await screen.findByText("No se pudieron cargar las categorías. Intenta de nuevo.")).toBeInTheDocument();
    expect(screen.queryByText("Crea tu primera categoría para organizar el menú.")).not.toBeInTheDocument();

    mockData.categoryQueryError = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("1 platillo")).toBeInTheDocument();
  });

  it("keeps loaded categories and disables deletion when a refresh fails", async () => {
    renderPage();
    expect(await screen.findByText("1 platillo")).toBeInTheDocument();

    mockData.categoryQueryError = true;
    mockData.dishQueryError = true;
    fireEvent.click(screen.getByRole("switch", { name: "Visible en el menú" }));

    expect(await screen.findByText("No se pudieron actualizar las categorías. Se conserva la información cargada.")).toBeInTheDocument();
    expect(screen.getByText("Pastas")).toBeInTheDocument();
    expect(screen.getByText("Conteo no disponible")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar categoría Pastas" })).toBeDisabled();
  });

  it("uses plural wording for multiple dishes", async () => {
    mockData.dishes = [
      { category_id: "category-1" },
      { category_id: "category-1" },
      { category_id: "category-1" },
    ];

    renderPage();

    expect(await screen.findByText("3 platillos")).toBeInTheDocument();
  });

  it("shows the current visibility and persists hide/show with the existing field", async () => {
    renderPage();

    expect(await screen.findByText("1 platillo")).toBeInTheDocument();
    const countLink = screen.getByRole("link", { name: "1 platillo" });
    expect(countLink.parentElement).toHaveTextContent("Visible");
    const visibilitySwitch = screen.getByRole("switch", { name: "Visible en el menú" });
    expect(visibilitySwitch).toBeChecked();
    fireEvent.click(visibilitySwitch);

    await waitFor(() => expect(mockData.updates).toContainEqual({ is_visible: false }));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "1 platillo" }).parentElement).toHaveTextContent("Oculta"),
    );
    expect(screen.getByRole("switch", { name: "Visible en el menú" })).not.toBeChecked();

    fireEvent.click(screen.getByRole("switch", { name: "Visible en el menú" }));
    await waitFor(() => expect(mockData.updates).toContainEqual({ is_visible: true }));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "1 platillo" }).parentElement).toHaveTextContent("Visible"),
    );
  });

  it("normalizes and persists the reordered categories in one write", async () => {
    mockData.categories = [
      category({ id: "category-1", name: "Pastas", position: 4 }),
      category({ id: "category-2", name: "Postres", position: 9 }),
      category({ id: "category-3", name: "Bebidas", position: 12 }),
    ];
    mockData.dishes = [];

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Bajar categoría Pastas" }));

    await waitFor(() => expect(mockData.upserts).toHaveLength(1));
    expect(mockData.upserts[0].map(({ id, position }) => [id, position])).toEqual([
      ["category-2", 0],
      ["category-1", 1],
      ["category-3", 2],
    ]);
  });

  it("shows a drag handle and reorders categories when dropped on another row", async () => {
    mockData.categories = [
      category({ id: "category-1", name: "Pastas", position: 4 }),
      category({ id: "category-2", name: "Postres", position: 9 }),
      category({ id: "category-3", name: "Bebidas", position: 12 }),
    ];
    mockData.dishes = [];

    renderPage();

    const handle = await screen.findByRole("button", { name: "Arrastrar categoría Pastas" });
    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      setData: vi.fn(),
      getData: vi.fn(() => "category-1"),
    };

    fireEvent.dragStart(handle, { dataTransfer });
    fireEvent.dragOver(screen.getByText("Bebidas"), { dataTransfer });
    fireEvent.drop(screen.getByText("Bebidas"), { dataTransfer });

    await waitFor(() => expect(mockData.upserts).toHaveLength(1));
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "category-1");
    expect(mockData.upserts[0].map(({ id, position }) => [id, position])).toEqual([
      ["category-2", 0],
      ["category-3", 1],
      ["category-1", 2],
    ]);
  });

  it("supports touch dragging and stacks category controls on narrow layouts", async () => {
    mockData.categories = [
      category({ id: "category-1", name: "Pastas", position: 4 }),
      category({ id: "category-2", name: "Postres", position: 9 }),
      category({ id: "category-3", name: "Bebidas", position: 12 }),
    ];
    mockData.dishes = [];

    renderPage();

    const handle = await screen.findByRole("button", { name: "Arrastrar categoría Pastas" });
    expect(handle).toHaveClass("touch-none");
    const firstRow = screen.getByText("Pastas").closest("[data-category-id]");
    expect(firstRow?.firstElementChild).toHaveClass("flex-col", "lg:flex-row");
    expect(firstRow?.querySelector(".border-t")).toHaveClass("w-full", "flex-col", "sm:flex-row");

    const targetRow = screen.getByText("Bebidas").closest("[data-category-id]");
    const originalDescriptor = Object.getOwnPropertyDescriptor(document, "elementFromPoint");
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => targetRow),
    });

    try {
      fireEvent.pointerDown(handle, {
        pointerId: 7,
        pointerType: "touch",
        clientX: 10,
        clientY: 10,
      });
      fireEvent.pointerMove(handle, {
        pointerId: 7,
        pointerType: "touch",
        clientX: 100,
        clientY: 200,
      });
      fireEvent.pointerUp(handle, { pointerId: 7, pointerType: "touch" });

      await waitFor(() => expect(mockData.upserts).toHaveLength(1));
      expect(mockData.upserts[0].map(({ id, position }) => [id, position])).toEqual([
        ["category-2", 0],
        ["category-3", 1],
        ["category-1", 2],
      ]);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(document, "elementFromPoint", originalDescriptor);
      } else {
        Reflect.deleteProperty(document, "elementFromPoint");
      }
    }
  });

  it("keeps the reorder boundaries disabled", async () => {
    mockData.categories = [
      category({ id: "category-1", name: "Pastas" }),
      category({ id: "category-2", name: "Postres", position: 1 }),
    ];
    mockData.dishes = [];

    renderPage();

    expect(await screen.findByRole("button", { name: "Subir categoría Pastas" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bajar categoría Postres" })).toBeDisabled();
  });

  it("allows deleting an empty category after confirmation", async () => {
    mockData.dishes = [];
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Eliminar categoría Pastas" }));
    fireEvent.click(await screen.findByRole("button", { name: /^Eliminar$/ }));

    await waitFor(() => expect(mockData.deletes).toEqual(["category-1"]));
  });

  it("blocks category deletion when dishes exist and links to their filtered list", async () => {
    mockData.dishes = [
      { category_id: "category-1" },
      { category_id: "category-1" },
    ];
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Eliminar categoría Pastas" }));

    expect(await screen.findByText("Esta categoría contiene 2 platillos.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver platillos" })).toHaveAttribute(
      "href",
      "/dashboard/platillos?category=category-1",
    );
    expect(screen.queryByRole("button", { name: /^Eliminar$/ })).not.toBeInTheDocument();
    expect(mockData.deletes).toEqual([]);
  });

  it("keeps an existing category image editable", async () => {
    mockData.categories = [category({ image_url: "https://example.test/pastas.jpg" })];
    mockData.dishes = [];
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Editar categoría Pastas" }));

    const imageInput = screen.getByLabelText("Imagen (URL opcional)");
    expect(imageInput).toHaveValue("https://example.test/pastas.jpg");
    fireEvent.change(imageInput, { target: { value: "https://example.test/new-pastas.jpg" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(mockData.updates).toContainEqual(
        expect.objectContaining({ image_url: "https://example.test/new-pastas.jpg" }),
      ),
    );
  });

  it("shows the focused first-category empty state and create action", async () => {
    mockData.categories = [];
    mockData.dishes = [];
    renderPage();

    expect(await screen.findByText("Crea tu primera categoría para organizar el menú.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva categoría" })).toBeInTheDocument();
  });

  it("does not display a false zero or allow deletion when dish counts fail to load", async () => {
    mockData.dishes = [];
    mockData.dishQueryError = true;
    renderPage();

    expect(await screen.findByText("Conteo no disponible")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar categoría Pastas" })).toBeDisabled();
  });
});
