ALTER TYPE public.dish_event_type ADD VALUE IF NOT EXISTS 'menu_view';
ALTER TYPE public.dish_event_type ADD VALUE IF NOT EXISTS 'dish_view';
ALTER TYPE public.dish_event_type ADD VALUE IF NOT EXISTS 'selection_add';

DROP POLICY IF EXISTS "dish_events_insert_public" ON public.dish_events;

CREATE POLICY "dish_events_insert_public"
ON public.dish_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  session_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = dish_events.restaurant_id
      AND r.status = 'published'
  )
  AND (
    (
      event_type::text IN ('menu_view', 'whatsapp_clicked')
      AND dish_id IS NULL
      AND category_id IS NULL
    )
    OR (
      event_type::text IN ('dish_view', 'selection_add')
      AND dish_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.dishes d
        WHERE d.id = dish_events.dish_id
          AND d.restaurant_id = dish_events.restaurant_id
          AND d.is_active
          AND d.category_id IS NOT DISTINCT FROM dish_events.category_id
          AND (
            d.category_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM public.categories c
              WHERE c.id = d.category_id
                AND c.restaurant_id = d.restaurant_id
                AND c.is_visible
            )
          )
      )
    )
    OR (
      event_type::text = 'category_view'
      AND dish_id IS NULL
      AND category_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.categories c
        WHERE c.id = dish_events.category_id
          AND c.restaurant_id = dish_events.restaurant_id
          AND c.is_visible
      )
    )
  )
);
