
CREATE TYPE public.plan_tier AS ENUM ('basic', 'pro', 'super');

CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan public.plan_tier NOT NULL DEFAULT 'basic',
  status TEXT NOT NULL DEFAULT 'active',
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to read a user's plan (SECURITY DEFINER for edge fns)
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id UUID)
RETURNS public.plan_tier
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.subscriptions
      WHERE user_id = _user_id
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1),
    'basic'::public.plan_tier
  );
$$;

-- Track daily premium chat usage for Pro tier limits
CREATE TABLE public.premium_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  model TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, day, model)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.premium_usage TO authenticated;
GRANT ALL ON public.premium_usage TO service_role;

ALTER TABLE public.premium_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.premium_usage
  FOR SELECT USING (auth.uid() = user_id);
