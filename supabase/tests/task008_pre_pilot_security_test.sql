BEGIN;
SELECT plan(24);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('00000000-0000-4000-8000-000000000801', 'authenticated', 'authenticated', 'task008-owner-a@example.test', '', pg_catalog.now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-4000-8000-000000000802', 'authenticated', 'authenticated', 'task008-owner-b@example.test', '', pg_catalog.now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-4000-8000-000000000803', 'authenticated', 'authenticated', 'task008-admin@example.test', '', pg_catalog.now(), '{"provider":"email","providers":["email"]}', '{}');

INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-4000-8000-000000000803', 'admin');

INSERT INTO public.restaurants (id, owner_id, slug, name, status, allow_reviews)
VALUES
  ('00000000-0000-4000-8000-000000000811', '00000000-0000-4000-8000-000000000801', 'task008-published-a', 'Task008 published A', 'published', false),
  ('00000000-0000-4000-8000-000000000812', '00000000-0000-4000-8000-000000000802', 'task008-published-b', 'Task008 published B', 'published', true),
  ('00000000-0000-4000-8000-000000000813', '00000000-0000-4000-8000-000000000801', 'task008-draft-a', 'Task008 draft A', 'draft', false);

INSERT INTO public.categories (id, restaurant_id, name, is_visible)
VALUES
  ('00000000-0000-4000-8000-000000000821', '00000000-0000-4000-8000-000000000811', 'Visible A', true),
  ('00000000-0000-4000-8000-000000000822', '00000000-0000-4000-8000-000000000811', 'Hidden A', false),
  ('00000000-0000-4000-8000-000000000823', '00000000-0000-4000-8000-000000000812', 'Visible B', true),
  ('00000000-0000-4000-8000-000000000824', '00000000-0000-4000-8000-000000000813', 'Draft A', true);

INSERT INTO public.dishes (id, restaurant_id, category_id, name, price, is_active)
VALUES
  ('00000000-0000-4000-8000-000000000831', '00000000-0000-4000-8000-000000000811', '00000000-0000-4000-8000-000000000821', 'Active A', 10, true),
  ('00000000-0000-4000-8000-000000000832', '00000000-0000-4000-8000-000000000811', '00000000-0000-4000-8000-000000000822', 'Hidden category A', 10, true),
  ('00000000-0000-4000-8000-000000000833', '00000000-0000-4000-8000-000000000811', '00000000-0000-4000-8000-000000000821', 'Inactive A', 10, false),
  ('00000000-0000-4000-8000-000000000834', '00000000-0000-4000-8000-000000000812', '00000000-0000-4000-8000-000000000823', 'Active B', 10, true),
  ('00000000-0000-4000-8000-000000000835', '00000000-0000-4000-8000-000000000813', '00000000-0000-4000-8000-000000000824', 'Draft A', 10, true);

SELECT pg_catalog.set_config('request.jwt.claim.sub', '', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;

SELECT is(
  (SELECT name FROM public.restaurants WHERE id = '00000000-0000-4000-8000-000000000811'),
  'Task008 published A',
  'anonymous callers can read a published restaurant'
);
SELECT is(
  (SELECT count(*) FROM public.categories WHERE restaurant_id = '00000000-0000-4000-8000-000000000811'),
  1::bigint,
  'anonymous callers see only visible categories'
);
SELECT is(
  (SELECT count(*) FROM public.categories WHERE id = '00000000-0000-4000-8000-000000000822'),
  0::bigint,
  'anonymous callers cannot read a hidden category directly by id'
);
SELECT is(
  (SELECT count(*) FROM public.dishes WHERE id = '00000000-0000-4000-8000-000000000831'),
  1::bigint,
  'anonymous callers can read an active dish in a visible category'
);
SELECT is(
  (SELECT count(*) FROM public.dishes WHERE id = '00000000-0000-4000-8000-000000000832'),
  0::bigint,
  'anonymous callers cannot read a dish in a hidden category'
);
SELECT is(
  (SELECT count(*) FROM public.dishes WHERE id = '00000000-0000-4000-8000-000000000833'),
  0::bigint,
  'anonymous callers cannot read an inactive dish directly by id'
);
SELECT is(
  (SELECT count(*) FROM public.restaurants WHERE id = '00000000-0000-4000-8000-000000000813'),
  0::bigint,
  'anonymous callers cannot read a draft restaurant'
);

SELECT lives_ok(
  $$INSERT INTO public.reviews (restaurant_id, dish_id, rating)
    VALUES ('00000000-0000-4000-8000-000000000811', '00000000-0000-4000-8000-000000000831', 5)$$,
  'a public dish review remains independent of restaurant-level review settings'
);
SELECT throws_ok(
  $$INSERT INTO public.reviews (restaurant_id, dish_id, rating)
    VALUES ('00000000-0000-4000-8000-000000000811', NULL, 5)$$,
  '42501',
  'new row violates row-level security policy for table "reviews"',
  'restaurant-level reviews are blocked when allow_reviews is false'
);
SELECT throws_ok(
  $$INSERT INTO public.reviews (restaurant_id, dish_id, rating)
    VALUES ('00000000-0000-4000-8000-000000000811', '00000000-0000-4000-8000-000000000834', 5)$$,
  '42501',
  'new row violates row-level security policy for table "reviews"',
  'a review cannot associate a dish from another restaurant'
);
SELECT is(
  public.increment_dish_likes('00000000-0000-4000-8000-000000000831'),
  1,
  'the public likes RPC still accepts a public active dish'
);
SELECT is(
  public.increment_dish_likes('00000000-0000-4000-8000-000000000833'),
  0,
  'the public likes RPC cannot mutate an inactive dish'
);

SELECT pg_catalog.set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000801', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000801","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM public.restaurants WHERE id = '00000000-0000-4000-8000-000000000813'),
  1::bigint,
  'owner A can read their own draft restaurant'
);
SELECT is(
  (SELECT count(*) FROM public.categories WHERE id = '00000000-0000-4000-8000-000000000822'),
  1::bigint,
  'owner A can read their hidden category in management'
);
SELECT is(
  (SELECT count(*) FROM public.dishes WHERE id = '00000000-0000-4000-8000-000000000833'),
  1::bigint,
  'owner A can read their inactive dish in management'
);
SELECT is(
  (WITH changed AS (
    UPDATE public.categories SET name = 'Owner A updated'
    WHERE id = '00000000-0000-4000-8000-000000000821'
    RETURNING id
  ) SELECT count(*) FROM changed),
  1::bigint,
  'owner A can update their own category'
);
SELECT is(
  (WITH changed AS (
    UPDATE public.categories SET name = 'Owner A must not update B'
    WHERE id = '00000000-0000-4000-8000-000000000823'
    RETURNING id
  ) SELECT count(*) FROM changed),
  0::bigint,
  'owner A cannot update owner B category by id'
);
SELECT throws_ok(
  $$INSERT INTO public.dishes (restaurant_id, category_id, name, price)
    VALUES ('00000000-0000-4000-8000-000000000811', '00000000-0000-4000-8000-000000000823', 'Cross tenant category', 10)$$,
  '23503',
  'insert or update on table "dishes" violates foreign key constraint "dishes_category_restaurant_fkey"',
  'the database rejects a dish assigned to another restaurant category'
);

SELECT pg_catalog.set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000802', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000802","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM public.restaurants WHERE id = '00000000-0000-4000-8000-000000000813'),
  0::bigint,
  'owner B cannot read owner A draft restaurant'
);
SELECT is(
  (WITH changed AS (
    UPDATE public.categories SET name = 'Owner B must not update A'
    WHERE id = '00000000-0000-4000-8000-000000000821'
    RETURNING id
  ) SELECT count(*) FROM changed),
  0::bigint,
  'owner B cannot update owner A category by id'
);

SELECT pg_catalog.set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000803', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000803","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM public.restaurants WHERE id = '00000000-0000-4000-8000-000000000813'),
  1::bigint,
  'admin can read a draft restaurant'
);
SELECT is(
  (SELECT count(*) FROM public.categories WHERE id = '00000000-0000-4000-8000-000000000822'),
  1::bigint,
  'admin can read hidden categories'
);
SELECT is(
  (WITH changed AS (
    UPDATE public.categories SET name = 'Admin updated B'
    WHERE id = '00000000-0000-4000-8000-000000000823'
    RETURNING id
  ) SELECT count(*) FROM changed),
  1::bigint,
  'admin can manage another restaurant category'
);
SELECT ok(
  pg_catalog.has_table_privilege('authenticated', 'public.restaurants', 'SELECT'),
  'authenticated dashboard and admin reads retain table-level restaurant access'
);

SELECT * FROM finish();
ROLLBACK;
