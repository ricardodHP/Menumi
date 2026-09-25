BEGIN;
SELECT plan(22);

SELECT ok(
  pg_catalog.to_regclass('public.restaurant_business_days') IS NOT NULL,
  'weekly restaurant business days table exists'
);
SELECT ok(
  pg_catalog.to_regclass('public.restaurant_business_hour_intervals') IS NOT NULL,
  'restaurant business hour intervals table exists'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute AS attribute
    WHERE attribute.attrelid = 'public.restaurants'::pg_catalog.regclass
      AND attribute.attname = 'allow_reviews'
      AND NOT attribute.attisdropped
  ),
  'restaurants has an independent allow_reviews setting'
);
SELECT ok(
  pg_catalog.has_function_privilege('authenticated', 'public.save_restaurant_business_hours(uuid,jsonb)', 'EXECUTE'),
  'authenticated callers can execute the public business-hours RPC'
);
SELECT ok(
  NOT pg_catalog.has_function_privilege('anon', 'public.save_restaurant_business_hours(uuid,jsonb)', 'EXECUTE'),
  'anonymous callers cannot execute the public business-hours RPC'
);
SELECT ok(
  NOT pg_catalog.has_function_privilege('anon', 'task007_private.replace_restaurant_business_hours(uuid,jsonb)', 'EXECUTE')
  AND NOT pg_catalog.has_function_privilege('authenticated', 'task007_private.replace_restaurant_business_hours(uuid,jsonb)', 'EXECUTE'),
  'the internal privileged function cannot be executed directly by API roles'
);
SELECT ok(
  NOT pg_catalog.has_table_privilege('anon', 'public.restaurant_business_days', 'INSERT')
  AND NOT pg_catalog.has_table_privilege('authenticated', 'public.restaurant_business_days', 'UPDATE')
  AND NOT pg_catalog.has_table_privilege('anon', 'public.restaurant_business_hour_intervals', 'DELETE'),
  'API roles cannot bypass the RPC by writing schedule tables directly'
);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('00000000-0000-4000-8000-000000000701', 'authenticated', 'authenticated', 'task007-owner@example.test', '', pg_catalog.now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-4000-8000-000000000702', 'authenticated', 'authenticated', 'task007-other@example.test', '', pg_catalog.now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-4000-8000-000000000703', 'authenticated', 'authenticated', 'task007-admin@example.test', '', pg_catalog.now(), '{"provider":"email","providers":["email"]}', '{}');

INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-4000-8000-000000000703', 'admin');

INSERT INTO public.restaurants (id, owner_id, slug, name, status, allow_reviews)
VALUES
  ('00000000-0000-4000-8000-000000000711', '00000000-0000-4000-8000-000000000701', 'task007-draft', 'Task007 draft', 'draft', false),
  ('00000000-0000-4000-8000-000000000712', '00000000-0000-4000-8000-000000000702', 'task007-published', 'Task007 published', 'published', true);
INSERT INTO public.restaurants (id, owner_id, slug, name, status)
VALUES ('00000000-0000-4000-8000-000000000713', '00000000-0000-4000-8000-000000000702', 'task007-default-reviews', 'Task007 default reviews', 'draft');
SELECT is(
  (SELECT allow_reviews FROM public.restaurants WHERE id = '00000000-0000-4000-8000-000000000713'),
  true,
  'allow_reviews defaults to true for existing behavior'
);

INSERT INTO public.dishes (id, restaurant_id, name, price)
VALUES ('00000000-0000-4000-8000-000000000721', '00000000-0000-4000-8000-000000000712', 'Task007 dish', 10);

SELECT pg_catalog.set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000701', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000701","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$SELECT public.save_restaurant_business_hours(
    '00000000-0000-4000-8000-000000000711',
    '{"days":[
      {"day_of_week":1,"is_closed":true,"intervals":[]},
      {"day_of_week":2,"is_closed":true,"intervals":[]},
      {"day_of_week":3,"is_closed":true,"intervals":[]},
      {"day_of_week":4,"is_closed":true,"intervals":[]},
      {"day_of_week":5,"is_closed":true,"intervals":[]},
      {"day_of_week":6,"is_closed":true,"intervals":[]},
      {"day_of_week":7,"is_closed":true,"intervals":[]}
    ]}'::jsonb
  )$$,
  'an owner can save their complete weekly schedule'
);
SELECT is(
  (SELECT pg_catalog.count(*) FROM public.restaurant_business_days WHERE restaurant_id = '00000000-0000-4000-8000-000000000711'),
  7::bigint,
  'a configured week persists all seven ISO days'
);

SELECT throws_ok(
  $$SELECT public.save_restaurant_business_hours(
    '00000000-0000-4000-8000-000000000712',
    '{"days":[
      {"day_of_week":1,"is_closed":true,"intervals":[]},
      {"day_of_week":2,"is_closed":true,"intervals":[]},
      {"day_of_week":3,"is_closed":true,"intervals":[]},
      {"day_of_week":4,"is_closed":true,"intervals":[]},
      {"day_of_week":5,"is_closed":true,"intervals":[]},
      {"day_of_week":6,"is_closed":true,"intervals":[]},
      {"day_of_week":7,"is_closed":true,"intervals":[]}
    ]}'::jsonb
  )$$,
  '42501',
  'not authorized to manage restaurant business hours',
  'an owner cannot replace another restaurant schedule'
);

RESET ROLE;
SELECT pg_catalog.set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000703', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000703","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$SELECT public.save_restaurant_business_hours(
    '00000000-0000-4000-8000-000000000712',
    '{"days":[
      {"day_of_week":1,"is_closed":false,"intervals":[{"open_time":"18:00","close_time":"02:00"}]},
      {"day_of_week":2,"is_closed":true,"intervals":[]},
      {"day_of_week":3,"is_closed":true,"intervals":[]},
      {"day_of_week":4,"is_closed":true,"intervals":[]},
      {"day_of_week":5,"is_closed":true,"intervals":[]},
      {"day_of_week":6,"is_closed":true,"intervals":[]},
      {"day_of_week":7,"is_closed":true,"intervals":[]}
    ]}'::jsonb
  )$$,
  'an admin can manage a restaurant schedule'
);
SELECT is(
  (SELECT pg_catalog.count(*) FROM public.restaurant_business_days WHERE restaurant_id = '00000000-0000-4000-8000-000000000712'),
  7::bigint,
  'the authorized replacement leaves a complete week'
);

SELECT throws_ok(
  $$SELECT public.save_restaurant_business_hours(
    '00000000-0000-4000-8000-000000000712',
    '{"days":[
      {"day_of_week":1,"is_closed":false,"intervals":[{"open_time":"18:00","close_time":"02:00"}]},
      {"day_of_week":2,"is_closed":false,"intervals":[{"open_time":"01:00","close_time":"04:00"}]},
      {"day_of_week":3,"is_closed":true,"intervals":[]},
      {"day_of_week":4,"is_closed":true,"intervals":[]},
      {"day_of_week":5,"is_closed":true,"intervals":[]},
      {"day_of_week":6,"is_closed":true,"intervals":[]},
      {"day_of_week":7,"is_closed":true,"intervals":[]}
    ]}'::jsonb
  )$$,
  '23514',
  'business hours contain overlapping intervals',
  'an overnight interval cannot overlap the following day'
);
SELECT is(
  (SELECT pg_catalog.count(*) FROM public.restaurant_business_hour_intervals AS interval_row
   JOIN public.restaurant_business_days AS business_day ON business_day.id = interval_row.business_day_id
   WHERE business_day.restaurant_id = '00000000-0000-4000-8000-000000000712'),
  1::bigint,
  'a rejected cross-day replacement preserves the previous interval'
);

SELECT throws_ok(
  $$SELECT public.save_restaurant_business_hours(
    '00000000-0000-4000-8000-000000000712',
    '{"days":[{"day_of_week":1,"is_closed":true,"intervals":[]}]}'::jsonb
  )$$,
  '22023',
  'weekly schedule must contain exactly seven days',
  'the RPC rejects an incomplete week'
);

SELECT throws_ok(
  $$SELECT public.save_restaurant_business_hours(
    '00000000-0000-4000-8000-000000000712',
    '{"days":[
      {"day_of_week":1,"is_closed":false,"intervals":[{"open_time":"02:00","close_time":"05:00"}]},
      {"day_of_week":2,"is_closed":true,"intervals":[]},
      {"day_of_week":3,"is_closed":true,"intervals":[]},
      {"day_of_week":4,"is_closed":true,"intervals":[]},
      {"day_of_week":5,"is_closed":true,"intervals":[]},
      {"day_of_week":6,"is_closed":true,"intervals":[]},
      {"day_of_week":7,"is_closed":false,"intervals":[{"open_time":"22:00","close_time":"03:00"}]}
    ]}'::jsonb
  )$$,
  '23514',
  'business hours contain overlapping intervals',
  'an overnight interval cannot overlap across Sunday and Monday'
);

RESET ROLE;
SELECT pg_catalog.set_config('request.jwt.claim.sub', '', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;
SELECT is(
  (SELECT pg_catalog.count(*) FROM public.restaurant_business_days WHERE restaurant_id = '00000000-0000-4000-8000-000000000711'),
  0::bigint,
  'anonymous readers cannot see a draft restaurant schedule'
);
SELECT lives_ok(
  $$INSERT INTO public.reviews (restaurant_id, rating)
    VALUES ('00000000-0000-4000-8000-000000000712', 4)$$,
  'allow_reviews true permits new restaurant reviews'
);
RESET ROLE;
UPDATE public.restaurants
SET allow_reviews = false
WHERE id = '00000000-0000-4000-8000-000000000712';
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$INSERT INTO public.reviews (restaurant_id, rating)
    VALUES ('00000000-0000-4000-8000-000000000712', 5)$$,
  '42501',
  'new row violates row-level security policy for table "reviews"',
  'allow_reviews false blocks new restaurant reviews'
);
RESET ROLE;
SELECT pg_catalog.set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000702', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000702","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$INSERT INTO public.reviews (restaurant_id, dish_id, rating)
    VALUES ('00000000-0000-4000-8000-000000000712', '00000000-0000-4000-8000-000000000721', 5)$$,
  'allow_reviews false does not block a dish review for its owner'
);
SELECT is(
  (SELECT pg_catalog.count(*) FROM public.reviews
   WHERE restaurant_id = '00000000-0000-4000-8000-000000000712' AND dish_id IS NULL),
  1::bigint,
  'historical restaurant reviews remain readable and are not deleted'
);

SELECT * FROM finish();
ROLLBACK;
