BEGIN;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS menu_layout text NOT NULL DEFAULT 'social';

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'restaurants_menu_layout_check'
      AND conrelid = 'public.restaurants'::regclass
  ) THEN
    ALTER TABLE public.restaurants
      ADD CONSTRAINT restaurants_menu_layout_check
      CHECK (menu_layout IN ('social', 'classic', 'gallery'));
  END IF;
END;
$migration$;

COMMIT;
