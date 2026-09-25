BEGIN;
SELECT plan(2);

SELECT is(
  (
    SELECT constraint_row.confdeltype::text
    FROM pg_catalog.pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'public.dishes'::pg_catalog.regclass
      AND constraint_row.conname = 'dishes_category_id_fkey'
  ),
  'r',
  'the dish/category foreign key restricts category deletion'
);

INSERT INTO public.restaurants (id, slug, name)
VALUES ('00000000-0000-4000-8000-000000000781', 'task007-2-delete-test', 'Task007.2 delete test');
INSERT INTO public.categories (id, restaurant_id, name)
VALUES ('00000000-0000-4000-8000-000000000782', '00000000-0000-4000-8000-000000000781', 'Referenced category');
INSERT INTO public.dishes (id, restaurant_id, category_id, name, price)
VALUES ('00000000-0000-4000-8000-000000000783', '00000000-0000-4000-8000-000000000781', '00000000-0000-4000-8000-000000000782', 'Referenced dish', 10);

SELECT throws_ok(
  $$DELETE FROM public.categories WHERE id = '00000000-0000-4000-8000-000000000782'$$,
  '23503',
  'update or delete on table "categories" violates foreign key constraint "dishes_category_id_fkey" on table "dishes"',
  'a category with dishes cannot be deleted by bypassing the dashboard'
);

SELECT * FROM finish();
ROLLBACK;
