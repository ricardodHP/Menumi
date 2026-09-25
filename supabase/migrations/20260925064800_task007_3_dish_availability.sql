-- Availability is separate from visibility: an unavailable dish remains visible
-- to customers but cannot be added to an order.
ALTER TABLE public.dishes
  ADD COLUMN is_available boolean NOT NULL DEFAULT true;
