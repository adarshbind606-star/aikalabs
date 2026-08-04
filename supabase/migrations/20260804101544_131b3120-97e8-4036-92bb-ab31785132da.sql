ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_mode_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_mode_check
  CHECK (mode = ANY (ARRAY['aika','unbound','comet','raven','frost']));

CREATE OR REPLACE FUNCTION public.consume_model_quota(_model text, _limit integer DEFAULT 100)
RETURNS TABLE(allowed boolean, used integer, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _count integer;
BEGIN
  IF _uid IS NULL THEN
    RETURN QUERY SELECT false, 0, 0;
    RETURN;
  END IF;

  INSERT INTO public.premium_usage (user_id, day, model, count)
  VALUES (_uid, _today, _model, 0)
  ON CONFLICT (user_id, day, model) DO NOTHING;

  SELECT pu.count INTO _count FROM public.premium_usage pu
    WHERE pu.user_id = _uid AND pu.day = _today AND pu.model = _model
    FOR UPDATE;

  IF _count >= _limit THEN
    RETURN QUERY SELECT false, _count, 0;
    RETURN;
  END IF;

  UPDATE public.premium_usage pu
    SET count = pu.count + 1, updated_at = now()
    WHERE pu.user_id = _uid AND pu.day = _today AND pu.model = _model
    RETURNING pu.count INTO _count;

  RETURN QUERY SELECT true, _count, GREATEST(_limit - _count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_model_usage(_model text, _limit integer DEFAULT 100)
RETURNS TABLE(used integer, remaining integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(c, 0), GREATEST(_limit - COALESCE(c, 0), 0)
  FROM (
    SELECT (SELECT pu.count FROM public.premium_usage pu
            WHERE pu.user_id = auth.uid()
              AND pu.day = (now() AT TIME ZONE 'UTC')::date
              AND pu.model = _model) AS c
  ) s;
$$;

GRANT EXECUTE ON FUNCTION public.consume_model_quota(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_model_usage(text, integer) TO authenticated, service_role;