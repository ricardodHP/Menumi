-- Restaurant review submission is independent from public rating visibility.
ALTER TABLE public.restaurants
  ADD COLUMN allow_reviews boolean NOT NULL DEFAULT true;

-- ISO weekday numbering: Monday = 1 ... Sunday = 7.
CREATE TABLE public.restaurant_business_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  is_closed boolean NOT NULL DEFAULT false,
  CONSTRAINT restaurant_business_days_restaurant_day_key UNIQUE (restaurant_id, day_of_week)
);

CREATE TABLE public.restaurant_business_hour_intervals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_day_id uuid NOT NULL REFERENCES public.restaurant_business_days(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  open_time time without time zone NOT NULL,
  close_time time without time zone NOT NULL,
  CONSTRAINT restaurant_business_hour_intervals_positive_duration
    CHECK (open_time <> close_time),
  CONSTRAINT restaurant_business_hour_intervals_day_position_key
    UNIQUE (business_day_id, position)
);

ALTER TABLE public.restaurant_business_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_business_hour_intervals ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.restaurant_business_days TO anon, authenticated;
GRANT SELECT ON public.restaurant_business_hour_intervals TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.restaurant_business_days, public.restaurant_business_hour_intervals
  FROM anon, authenticated;

CREATE POLICY restaurant_business_days_select_visible_restaurant
ON public.restaurant_business_days
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.restaurants AS restaurant
    WHERE restaurant.id = restaurant_business_days.restaurant_id
      AND (
        restaurant.status = 'published'::public.restaurant_status
        OR restaurant.owner_id = (SELECT auth.uid())
        OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      )
  )
);

CREATE POLICY restaurant_business_hour_intervals_select_visible_restaurant
ON public.restaurant_business_hour_intervals
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.restaurant_business_days AS business_day
    JOIN public.restaurants AS restaurant
      ON restaurant.id = business_day.restaurant_id
    WHERE business_day.id = restaurant_business_hour_intervals.business_day_id
      AND (
        restaurant.status = 'published'::public.restaurant_status
        OR restaurant.owner_id = (SELECT auth.uid())
        OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      )
  )
);

-- The internal writer is in a dedicated non-exposed schema. The exposed wrapper
-- is the only API entry point and is restricted to authenticated callers.
CREATE SCHEMA task007_private;
REVOKE ALL ON SCHEMA task007_private FROM PUBLIC, anon, authenticated;

CREATE FUNCTION task007_private.replace_restaurant_business_hours(
  p_restaurant_id uuid,
  p_week jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_locked_restaurant_id uuid;
  v_day_count bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT restaurant.id
  INTO v_locked_restaurant_id
  FROM public.restaurants AS restaurant
  WHERE restaurant.id = p_restaurant_id
    AND (
      restaurant.owner_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  FOR UPDATE;

  IF v_locked_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'not authorized to manage restaurant business hours'
      USING ERRCODE = '42501';
  END IF;

  IF p_week IS NULL OR pg_catalog.jsonb_typeof(p_week -> 'days') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'weekly schedule must contain exactly seven days'
      USING ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.count(*)
  INTO v_day_count
  FROM pg_catalog.jsonb_to_recordset(p_week -> 'days') AS input_day(
    day_of_week smallint,
    is_closed boolean,
    intervals jsonb
  );

  IF v_day_count <> 7
    OR EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_to_recordset(p_week -> 'days') AS input_day(
        day_of_week smallint,
        is_closed boolean,
        intervals jsonb
      )
      WHERE input_day.day_of_week IS NULL
        OR input_day.day_of_week NOT BETWEEN 1 AND 7
    )
    OR (
      SELECT pg_catalog.count(DISTINCT input_day.day_of_week)
      FROM pg_catalog.jsonb_to_recordset(p_week -> 'days') AS input_day(
        day_of_week smallint,
        is_closed boolean,
        intervals jsonb
      )
    ) <> 7
  THEN
    RAISE EXCEPTION 'weekly schedule must contain exactly seven days'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_to_recordset(p_week -> 'days') AS input_day(
      day_of_week smallint,
      is_closed boolean,
      intervals jsonb
    )
    WHERE input_day.is_closed IS NULL
      OR pg_catalog.jsonb_typeof(input_day.intervals) IS DISTINCT FROM 'array'
  ) THEN
    RAISE EXCEPTION 'each day must include a closed state and an intervals array'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_to_recordset(p_week -> 'days') AS input_day(
      day_of_week smallint,
      is_closed boolean,
      intervals jsonb
    )
    WHERE (input_day.is_closed AND pg_catalog.jsonb_array_length(input_day.intervals) <> 0)
      OR (NOT input_day.is_closed AND pg_catalog.jsonb_array_length(input_day.intervals) = 0)
  ) THEN
    RAISE EXCEPTION 'closed days must have no intervals and open days must have at least one'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_to_recordset(p_week -> 'days') AS input_day(
      day_of_week smallint,
      is_closed boolean,
      intervals jsonb
    )
    CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(input_day.intervals) AS interval_json(value)
    WHERE pg_catalog.jsonb_typeof(interval_json.value) IS DISTINCT FROM 'object'
  ) THEN
    RAISE EXCEPTION 'each interval must be an object with open_time and close_time'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_to_recordset(p_week -> 'days') AS input_day(
      day_of_week smallint,
      is_closed boolean,
      intervals jsonb
    )
    CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(input_day.intervals) AS interval_json(value)
    CROSS JOIN LATERAL pg_catalog.jsonb_to_record(interval_json.value) AS interval_value(
      open_time text,
      close_time text
    )
    WHERE interval_value.open_time IS NULL
      OR interval_value.close_time IS NULL
      OR interval_value.open_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      OR interval_value.close_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ) THEN
    RAISE EXCEPTION 'interval times must use HH:MM from 00:00 through 23:59'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_to_recordset(p_week -> 'days') AS input_day(
      day_of_week smallint,
      is_closed boolean,
      intervals jsonb
    )
    CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(input_day.intervals) AS interval_json(value)
    CROSS JOIN LATERAL pg_catalog.jsonb_to_record(interval_json.value) AS interval_value(
      open_time text,
      close_time text
    )
    WHERE interval_value.open_time::time = interval_value.close_time::time
  ) THEN
    RAISE EXCEPTION 'business hour intervals cannot have zero or 24-hour duration'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    WITH input_days AS (
      SELECT input_day.day_of_week, input_day.intervals
      FROM pg_catalog.jsonb_to_recordset(p_week -> 'days') AS input_day(
        day_of_week smallint,
        is_closed boolean,
        intervals jsonb
      )
    ),
    ranges AS (
      SELECT
        input_day.day_of_week,
        interval_json.ordinality::integer AS interval_position,
        (input_day.day_of_week - 1) * 1440
          + pg_catalog.date_part('hour', interval_value.open_time::time)::integer * 60
          + pg_catalog.date_part('minute', interval_value.open_time::time)::integer AS range_start,
        (input_day.day_of_week - 1) * 1440
          + pg_catalog.date_part('hour', interval_value.close_time::time)::integer * 60
          + pg_catalog.date_part('minute', interval_value.close_time::time)::integer
          + CASE
              WHEN interval_value.close_time::time < interval_value.open_time::time THEN 1440
              ELSE 0
            END AS range_end
      FROM input_days AS input_day
      CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(input_day.intervals)
        WITH ORDINALITY AS interval_json(value, ordinality)
      CROSS JOIN LATERAL pg_catalog.jsonb_to_record(interval_json.value) AS interval_value(
        open_time text,
        close_time text
      )
    )
    SELECT 1
    FROM ranges AS left_range
    JOIN ranges AS right_range
      ON left_range.day_of_week < right_range.day_of_week
      OR (
        left_range.day_of_week = right_range.day_of_week
        AND left_range.interval_position < right_range.interval_position
      )
    CROSS JOIN (VALUES (-10080), (0), (10080)) AS week_offset(minutes)
    WHERE left_range.range_start < right_range.range_end + week_offset.minutes
      AND right_range.range_start + week_offset.minutes < left_range.range_end
  ) THEN
    RAISE EXCEPTION 'business hours contain overlapping intervals'
      USING ERRCODE = '23514';
  END IF;

  DELETE FROM public.restaurant_business_days AS business_day
  WHERE business_day.restaurant_id = p_restaurant_id;

  WITH input_days AS (
    SELECT input_day.day_of_week, input_day.is_closed, input_day.intervals
    FROM pg_catalog.jsonb_to_recordset(p_week -> 'days') AS input_day(
      day_of_week smallint,
      is_closed boolean,
      intervals jsonb
    )
  ),
  inserted_days AS (
    INSERT INTO public.restaurant_business_days (restaurant_id, day_of_week, is_closed)
    SELECT p_restaurant_id, input_day.day_of_week, input_day.is_closed
    FROM input_days AS input_day
    RETURNING id, day_of_week
  )
  INSERT INTO public.restaurant_business_hour_intervals (
    business_day_id,
    position,
    open_time,
    close_time
  )
  SELECT
    inserted_day.id,
    (interval_json.ordinality - 1)::integer,
    interval_value.open_time::time,
    interval_value.close_time::time
  FROM inserted_days AS inserted_day
  JOIN input_days AS input_day USING (day_of_week)
  CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(input_day.intervals)
    WITH ORDINALITY AS interval_json(value, ordinality)
  CROSS JOIN LATERAL pg_catalog.jsonb_to_record(interval_json.value) AS interval_value(
    open_time text,
    close_time text
  );
END;
$function$;

CREATE FUNCTION public.save_restaurant_business_hours(
  p_restaurant_id uuid,
  p_week jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required'
      USING ERRCODE = '42501';
  END IF;

  PERFORM task007_private.replace_restaurant_business_hours(p_restaurant_id, p_week);
END;
$function$;

-- PostgreSQL grants EXECUTE to PUBLIC for new functions by default. Close both
-- surfaces explicitly, then open only the public authenticated RPC wrapper.
REVOKE ALL ON FUNCTION task007_private.replace_restaurant_business_hours(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_restaurant_business_hours(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_restaurant_business_hours(uuid, jsonb)
  TO authenticated;

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
      AND (reviews.dish_id IS NOT NULL OR restaurant.allow_reviews)
  )
);
