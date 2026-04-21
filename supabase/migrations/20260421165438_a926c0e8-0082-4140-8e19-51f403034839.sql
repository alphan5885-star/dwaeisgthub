CREATE POLICY "Deny all client access to rate_limits"
ON public.rate_limits FOR ALL TO authenticated, anon
USING (false) WITH CHECK (false);