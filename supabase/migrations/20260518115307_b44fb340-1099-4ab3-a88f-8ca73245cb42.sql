
ALTER TABLE public.admin_tokens
  ADD COLUMN IF NOT EXISTS college_id uuid,
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false,
  ALTER COLUMN branch_id DROP NOT NULL;
