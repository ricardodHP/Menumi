ALTER TABLE public.restaurants
  ADD COLUMN delivery_links jsonb NOT NULL DEFAULT '{}'::jsonb
  CONSTRAINT restaurants_delivery_links_object
  CHECK (jsonb_typeof(delivery_links) = 'object');
