
ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS affiliation text;

ALTER TABLE public.branch_admins
  ALTER COLUMN branch_id DROP NOT NULL;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS password_hash text;

-- Tighten branches: remove faculty insert, no public writes (service role only via edge fn)
DROP POLICY IF EXISTS "Faculty can insert branches" ON public.branches;
DROP POLICY IF EXISTS "Service role can delete branches" ON public.branches;

CREATE POLICY "Service role can insert branches"
  ON public.branches FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update branches"
  ON public.branches FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can delete branches"
  ON public.branches FOR DELETE TO service_role USING (true);

-- Tighten students: drop public writes
DROP POLICY IF EXISTS "Anyone can insert students" ON public.students;
DROP POLICY IF EXISTS "Anyone can update students" ON public.students;

CREATE POLICY "Service role can insert students"
  ON public.students FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update students"
  ON public.students FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can delete students"
  ON public.students FOR DELETE TO service_role USING (true);
