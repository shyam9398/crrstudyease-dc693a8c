
-- Create branch_admins table for storing admin credentials
CREATE TABLE public.branch_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id_credential text NOT NULL,
  password_credential text NOT NULL,
  is_super_admin boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(branch_id),
  UNIQUE(user_id_credential)
);

-- Enable RLS - only service_role can access
ALTER TABLE public.branch_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on branch_admins"
ON public.branch_admins
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Seed predefined admin credentials
INSERT INTO public.branch_admins (branch_id, user_id_credential, password_credential, is_super_admin) VALUES
  ('92cfff9a-0ee4-4029-acd3-957420ffc38b', 'AIML1989', '1913121989', false),
  ('433b2598-7498-4751-898b-ff03ca2b7796', 'AIDS1989', '194191989', false),
  ('ff49ad89-2cb9-4059-a3de-643b1515bb1b', 'CIVIL1989', '39229121989', false),
  ('ac36b4ef-d3b0-43d9-9bee-a715723ee228', 'CSE1989', '31951989', true),
  ('bc64e0d0-0edb-4e92-8b88-0c9a1e7fda68', 'CSC1989', '31931989', false),
  ('cc1b405b-e5ee-467a-abcf-8b4d944d0ada', 'EEE1989', '5551989', false),
  ('7dda6f53-d031-424d-baa7-7d10eb4bef9b', 'ECE1989', '5351989', false),
  ('eaf8f439-d8ad-4434-bf3c-5ec1f561746a', 'FYE1989', '62551989', false),
  ('9651327d-b875-4338-b553-517852140ef2', 'IT1989', '19201989', false),
  ('5e193998-20c7-4418-9059-87994407d427', 'MECH1989', '135381989', false);
