-- Qualify the outer storage.objects column explicitly. Without this qualifier,
-- the unqualified `name` inside each EXISTS subquery resolves to
-- restaurants.name instead of the path stored in storage.objects.name.
DROP POLICY IF EXISTS "Owner or admin write restaurant-logos" ON storage.objects;
CREATE POLICY "Owner or admin write restaurant-logos"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-logos'
  AND (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.restaurants AS restaurant
      WHERE restaurant.id::text = (storage.foldername(storage.objects.name))[1]
        AND restaurant.owner_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Owner or admin update restaurant-logos" ON storage.objects;
CREATE POLICY "Owner or admin update restaurant-logos"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'restaurant-logos'
  AND (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.restaurants AS restaurant
      WHERE restaurant.id::text = (storage.foldername(storage.objects.name))[1]
        AND restaurant.owner_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  bucket_id = 'restaurant-logos'
  AND (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.restaurants AS restaurant
      WHERE restaurant.id::text = (storage.foldername(storage.objects.name))[1]
        AND restaurant.owner_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Owner or admin delete restaurant-logos" ON storage.objects;
CREATE POLICY "Owner or admin delete restaurant-logos"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'restaurant-logos'
  AND (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.restaurants AS restaurant
      WHERE restaurant.id::text = (storage.foldername(storage.objects.name))[1]
        AND restaurant.owner_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Owner or admin write dish-images" ON storage.objects;
CREATE POLICY "Owner or admin write dish-images"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dish-images'
  AND (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.restaurants AS restaurant
      WHERE restaurant.id::text = (storage.foldername(storage.objects.name))[1]
        AND restaurant.owner_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Owner or admin update dish-images" ON storage.objects;
CREATE POLICY "Owner or admin update dish-images"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'dish-images'
  AND (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.restaurants AS restaurant
      WHERE restaurant.id::text = (storage.foldername(storage.objects.name))[1]
        AND restaurant.owner_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  bucket_id = 'dish-images'
  AND (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.restaurants AS restaurant
      WHERE restaurant.id::text = (storage.foldername(storage.objects.name))[1]
        AND restaurant.owner_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Owner or admin delete dish-images" ON storage.objects;
CREATE POLICY "Owner or admin delete dish-images"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'dish-images'
  AND (
    public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.restaurants AS restaurant
      WHERE restaurant.id::text = (storage.foldername(storage.objects.name))[1]
        AND restaurant.owner_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Read published restaurant logos or owned paths" ON storage.objects;
CREATE POLICY "Read published restaurant logos or owned paths"
ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'restaurant-logos'
  AND EXISTS (
    SELECT 1
    FROM public.restaurants AS restaurant
    WHERE restaurant.id::text = (storage.foldername(storage.objects.name))[1]
      AND (
        restaurant.status = 'published'::public.restaurant_status
        OR restaurant.owner_id = (SELECT auth.uid())
        OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      )
  )
);

DROP POLICY IF EXISTS "Read published dish images or owned paths" ON storage.objects;
CREATE POLICY "Read published dish images or owned paths"
ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'dish-images'
  AND EXISTS (
    SELECT 1
    FROM public.restaurants AS restaurant
    WHERE restaurant.id::text = (storage.foldername(storage.objects.name))[1]
      AND (
        restaurant.status = 'published'::public.restaurant_status
        OR restaurant.owner_id = (SELECT auth.uid())
        OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      )
  )
);
