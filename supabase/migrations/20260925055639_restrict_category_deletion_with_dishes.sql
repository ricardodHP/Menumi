-- Keep categories with dishes from being deleted and silently uncategorizing them.
ALTER TABLE public.dishes
  DROP CONSTRAINT dishes_category_id_fkey;

ALTER TABLE public.dishes
  ADD CONSTRAINT dishes_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES public.categories(id)
  ON DELETE RESTRICT;
