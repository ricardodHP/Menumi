ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false;

-- Preserve the behavior of restaurants that already configured a WhatsApp URL.
UPDATE public.restaurants
SET whatsapp_enabled = true
WHERE NULLIF(BTRIM(whatsapp_link), '') IS NOT NULL;

ALTER TYPE public.dish_event_type
  ADD VALUE IF NOT EXISTS 'whatsapp_clicked';

ALTER TABLE public.dish_events
  ADD COLUMN IF NOT EXISTS session_id uuid;
