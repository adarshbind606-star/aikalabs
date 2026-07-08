
REVOKE EXECUTE ON FUNCTION public.get_user_plan(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan(UUID) TO service_role;
