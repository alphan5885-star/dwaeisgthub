CREATE TABLE public.user_pgp_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  key_id TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_pgp_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PGP keys publicly viewable"
ON public.user_pgp_keys FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own PGP key"
ON public.user_pgp_keys FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own PGP key"
ON public.user_pgp_keys FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own PGP key"
ON public.user_pgp_keys FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_user_pgp_keys_user_id ON public.user_pgp_keys(user_id);
CREATE INDEX idx_user_pgp_keys_fingerprint ON public.user_pgp_keys(fingerprint);