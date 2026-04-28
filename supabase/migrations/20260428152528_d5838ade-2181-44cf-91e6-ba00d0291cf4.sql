-- Tighten profile visibility and remove legacy weak PIN hash storage
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users and admins can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.profiles DROP COLUMN IF EXISTS withdraw_pin_hash;

-- Ensure user_roles cannot be directly modified by normal clients
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can delete their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Deny direct role inserts" ON public.user_roles;
DROP POLICY IF EXISTS "Deny direct role updates" ON public.user_roles;
DROP POLICY IF EXISTS "Deny direct role deletes" ON public.user_roles;

CREATE POLICY "Deny direct role inserts"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Deny direct role updates"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny direct role deletes"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);

-- Harden role assignment RPC: only signed-in users can assign vendor/buyer to themselves.
CREATE OR REPLACE FUNCTION public.assign_role_on_signup(_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _role NOT IN ('vendor', 'buyer') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), _role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- If the legacy payment confirmation RPC exists, require privileged execution.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'process_payment_confirmation'
      AND pg_get_function_identity_arguments(p.oid) = '_order_id uuid, _confirmations integer'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.process_payment_confirmation(_order_id uuid, _confirmations integer)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public'
      AS $body$
      BEGIN
        IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
          RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
        END IF;

        IF _confirmations < 3 THEN
          UPDATE public.orders
          SET confirmations = _confirmations,
              payment_status = CASE WHEN _confirmations > 0 THEN 'confirming' ELSE payment_status END,
              updated_at = now()
          WHERE id = _order_id;

          RETURN jsonb_build_object('success', true, 'status', 'confirming');
        END IF;

        UPDATE public.orders
        SET confirmations = _confirmations,
            payment_status = 'confirmed',
            status = 'paid',
            updated_at = now()
        WHERE id = _order_id;

        RETURN jsonb_build_object('success', true, 'status', 'confirmed');
      END;
      $body$;
    $fn$;
  END IF;
END $$;

-- Remove broad public execution on SECURITY DEFINER functions.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Grant only the client-callable functions that are needed and internally constrained.
GRANT EXECUTE ON FUNCTION public.assign_role_on_signup(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_locked(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_delivery(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_escrow(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.panic_destroy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vendor_rating(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;

-- The old client-callable login attempt recorder enables targeted lockout abuse.
REVOKE EXECUTE ON FUNCTION public.record_login_attempt(text, boolean) FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'process_payment_confirmation'
      AND pg_get_function_identity_arguments(p.oid) = '_order_id uuid, _confirmations integer'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.process_payment_confirmation(uuid, integer) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.process_payment_confirmation(uuid, integer) TO service_role;
  END IF;
END $$;