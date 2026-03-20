CREATE POLICY "Service role can delete branches"
ON public.branches
FOR DELETE
TO service_role
USING (true);