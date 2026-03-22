
-- Add year_sem column to subjects table
ALTER TABLE public.subjects ADD COLUMN year_sem text;

-- Create students table for student login/preferences
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  branch_id uuid REFERENCES public.branches(id),
  regulation_id uuid REFERENCES public.regulations(id),
  year_sem text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Anyone can read students (for login lookup)
CREATE POLICY "Anyone can view students" ON public.students FOR SELECT TO public USING (true);

-- Anyone can insert (for student registration)
CREATE POLICY "Anyone can insert students" ON public.students FOR INSERT TO public WITH CHECK (true);

-- Anyone can update (for updating preferences)
CREATE POLICY "Anyone can update students" ON public.students FOR UPDATE TO public USING (true);
