BEGIN;

-- Refuse to change the FK while existing dishes point at another tenant's
-- category. The migration must not guess how to repair owner data.
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.dishes AS dish
    JOIN public.categories AS category ON category.id = dish.category_id
    WHERE dish.category_id IS NOT NULL
      AND dish.restaurant_id <> category.restaurant_id
  ) THEN
    RAISE EXCEPTION 'TASK008 found dishes whose category belongs to another restaurant; repair those rows before applying this migration';
  END IF;
END;
$migration$;

-- A dish can reference only a category owned by the same restaurant.
ALTER TABLE public.categories
  ADD CONSTRAINT categories_restaurant_id_id_key UNIQUE (restaurant_id, id);

ALTER TABLE public.dishes
  DROP CONSTRAINT dishes_category_id_fkey;

ALTER TABLE public.dishes
  ADD CONSTRAINT dishes_category_restaurant_fkey
  FOREIGN KEY (restaurant_id, category_id)
  REFERENCES public.categories (restaurant_id, id)
  ON DELETE RESTRICT;

-- Owners/admins retain access to all their own management records. Public
-- reads of published restaurants expose only visible categories and active
-- dishes whose category is also public.
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public"
ON public.categories
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.restaurants AS restaurant
    WHERE restaurant.id = categories.restaurant_id
      AND (
        restaurant.owner_id = (SELECT auth.uid())
        OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
        OR (
          restaurant.status = 'published'::public.restaurant_status
          AND categories.is_visible
        )
      )
  )
);

DROP POLICY IF EXISTS "dishes_select_public" ON public.dishes;
CREATE POLICY "dishes_select_public"
ON public.dishes
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.restaurants AS restaurant
    WHERE restaurant.id = dishes.restaurant_id
      AND (
        restaurant.owner_id = (SELECT auth.uid())
        OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
        OR (
          restaurant.status = 'published'::public.restaurant_status
          AND dishes.is_active
          AND (
            dishes.category_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM public.categories AS category
              WHERE category.id = dishes.category_id
                AND category.restaurant_id = dishes.restaurant_id
                AND category.is_visible
            )
          )
        )
      )
  )
);

-- Dish reviews are independent of restaurant-level review settings, but the
-- dish must be a public, active dish of the same published restaurant.
DROP POLICY IF EXISTS reviews_insert_public ON public.reviews;
CREATE POLICY reviews_insert_public
ON public.reviews
FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.restaurants AS restaurant
    WHERE restaurant.id = reviews.restaurant_id
      AND restaurant.status = 'published'::public.restaurant_status
      AND (
        (reviews.dish_id IS NULL AND restaurant.allow_reviews)
        OR (
          reviews.dish_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.dishes AS dish
            WHERE dish.id = reviews.dish_id
              AND dish.restaurant_id = restaurant.id
              AND dish.is_active
              AND (
                dish.category_id IS NULL
                OR EXISTS (
                  SELECT 1
                  FROM public.categories AS category
                  WHERE category.id = dish.category_id
                    AND category.restaurant_id = restaurant.id
                    AND category.is_visible
                )
              )
          )
        )
      )
  )
);

-- Do not let the public SECURITY DEFINER likes RPC mutate hidden or inactive
-- records. Keep the public feature while narrowing its authorization and
-- search path.
CREATE OR REPLACE FUNCTION public.increment_dish_likes(_dish_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.dishes AS dish
  SET likes_count = dish.likes_count + 1
  WHERE dish.id = _dish_id
    AND dish.is_active
    AND EXISTS (
      SELECT 1
      FROM public.restaurants AS restaurant
      WHERE restaurant.id = dish.restaurant_id
        AND restaurant.status = 'published'::public.restaurant_status
    )
    AND (
      dish.category_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.categories AS category
        WHERE category.id = dish.category_id
          AND category.restaurant_id = dish.restaurant_id
          AND category.is_visible
      )
    )
  RETURNING dish.likes_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrement_dish_likes(_dish_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.dishes AS dish
  SET likes_count = GREATEST(dish.likes_count - 1, 0)
  WHERE dish.id = _dish_id
    AND dish.is_active
    AND EXISTS (
      SELECT 1
      FROM public.restaurants AS restaurant
      WHERE restaurant.id = dish.restaurant_id
        AND restaurant.status = 'published'::public.restaurant_status
    )
    AND (
      dish.category_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.categories AS category
        WHERE category.id = dish.category_id
          AND category.restaurant_id = dish.restaurant_id
          AND category.is_visible
      )
    )
  RETURNING dish.likes_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.increment_dish_likes(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_dish_likes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_dish_likes(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_dish_likes(uuid) TO anon, authenticated;

-- Restrict Storage object listing to published restaurant paths and the
-- restaurant owner/admin. Public bucket URLs remain fetchable by design.
DROP POLICY IF EXISTS "Anyone can read restaurant-logos by path" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read dish-images by path" ON storage.objects;

CREATE POLICY "Read published restaurant logos or owned paths"
ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'restaurant-logos'
  AND EXISTS (
    SELECT 1
    FROM public.restaurants AS restaurant
    WHERE restaurant.id::text = (storage.foldername(name))[1]
      AND (
        restaurant.status = 'published'::public.restaurant_status
        OR restaurant.owner_id = (SELECT auth.uid())
        OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      )
  )
);

CREATE POLICY "Read published dish images or owned paths"
ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'dish-images'
  AND EXISTS (
    SELECT 1
    FROM public.restaurants AS restaurant
    WHERE restaurant.id::text = (storage.foldername(name))[1]
      AND (
        restaurant.status = 'published'::public.restaurant_status
        OR restaurant.owner_id = (SELECT auth.uid())
        OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      )
  )
);

COMMIT;
