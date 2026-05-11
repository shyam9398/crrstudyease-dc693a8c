
-- Colleges (tenants)
CREATE TABLE public.colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view colleges"
ON public.colleges FOR SELECT
USING (true);

CREATE POLICY "Anyone can create colleges"
ON public.colleges FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update colleges"
ON public.colleges FOR UPDATE
TO service_role USING (true);

CREATE POLICY "Service role can delete colleges"
ON public.colleges FOR DELETE
TO service_role USING (true);

-- Add college_id to tenant-scoped tables
ALTER TABLE public.branches ADD COLUMN college_id uuid;
ALTER TABLE public.branch_admins ADD COLUMN college_id uuid;
ALTER TABLE public.profiles ADD COLUMN college_id uuid;
ALTER TABLE public.subjects ADD COLUMN college_id uuid;
ALTER TABLE public.regulations ADD COLUMN college_id uuid;
ALTER TABLE public.students ADD COLUMN college_id uuid;

-- Create the Default College and backfill all existing rows
DO $$
DECLARE
  default_college_id uuid;
BEGIN
  INSERT INTO public.colleges (name)
  VALUES ('Sir C.R. Reddy College of Engineering')
  RETURNING id INTO default_college_id;

  UPDATE public.branches SET college_id = default_college_id WHERE college_id IS NULL;
  UPDATE public.branch_admins SET college_id = default_college_id WHERE college_id IS NULL;
  UPDATE public.profiles SET college_id = default_college_id WHERE college_id IS NULL;
  UPDATE public.subjects SET college_id = default_college_id WHERE college_id IS NULL;
  UPDATE public.regulations SET college_id = default_college_id WHERE college_id IS NULL;
  UPDATE public.students SET college_id = default_college_id WHERE college_id IS NULL;
END $$;

-- Indexes for filtering performance
CREATE INDEX idx_branches_college ON public.branches(college_id);
CREATE INDEX idx_branch_admins_college ON public.branch_admins(college_id);
CREATE INDEX idx_profiles_college ON public.profiles(college_id);
CREATE INDEX idx_subjects_college ON public.subjects(college_id);
CREATE INDEX idx_regulations_college ON public.regulations(college_id);
CREATE INDEX idx_students_college ON public.students(college_id);

-- Public storage bucket for college logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('college-logos', 'college-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view college logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'college-logos');

CREATE POLICY "Anyone can upload college logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'college-logos');
