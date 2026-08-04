REVOKE EXECUTE ON FUNCTION public.consume_model_quota(text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_model_usage(text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.consume_model_quota(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_model_usage(text, integer) TO authenticated, service_role;