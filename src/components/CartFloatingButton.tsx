import { ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const CartFloatingButton = () => {
  const { totalItems, isCartOpen, setIsCartOpen } = useCart();

  if (isCartOpen) return null;

  return (
    <button
      onClick={() => setIsCartOpen(true)}
      className="fixed bottom-6 right-6 z-[55] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-elevated flex items-center justify-center hover:opacity-90 transition-opacity active:scale-95"
      aria-label="Abrir Mi pedido"
      title="Abrir Mi pedido"
    >
      <ShoppingBag className="w-6 h-6" />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
          {totalItems > 9 ? "9+" : totalItems}
        </span>
      )}
    </button>
  );
};

export default CartFloatingButton;
