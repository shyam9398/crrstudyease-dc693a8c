-- Drop legacy global unique constraint on branches.name
ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS branches_name_key;

-- Enforce uniqueness per college instead (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS branches_college_name_unique
  ON public.branches (college_id, lower(name));