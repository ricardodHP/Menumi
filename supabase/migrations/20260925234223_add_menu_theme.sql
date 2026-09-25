ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS menu_theme text NOT NULL DEFAULT 'light';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'restaurants_menu_theme_check'
      AND conrelid = 'public.restaurants'::regclass
  ) THEN
    ALTER TABLE public.restaurants
      ADD CONSTRAINT restaurants_menu_theme_check
      CHECK (menu_theme IN ('light', 'dark'));
  END IF;
END $$;
