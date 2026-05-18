import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Branch {
  id: string;
  name: string;
  created_at: string;
}

export interface Regulation {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Branch[];
    },
  });
}

export function useAdminBranches() {
  return useQuery({
    queryKey: ['admin-branches'],
    queryFn: async () => {
      const { data: admins, error: adminsError } = await supabase
        .from('branch_admins')
        .select('branch_id');
      
      if (adminsError) throw adminsError;
      
      const activeBranchIds = (admins || []).map(a => a.branch_id);
      if (activeBranchIds.length === 0) return [] as Branch[];
      
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .in('id', activeBranchIds)
        .order('name');
      
      if (error) throw error;
      return data as Branch[];
    },
  });
}

export function useRegulations() {
  return useQuery({
    queryKey: ['regulations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Regulation[];
    },
  });
}

export function useCreateRegulation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Not authenticated');
      if (!name?.trim()) throw new Error('Regulation name is required');

      const { data, error } = await supabase
        .from('regulations')
        .insert({
          name: name.trim(),
          created_by: user.id,
          college_id: user.profile?.college_id ?? null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulations'] });
      toast.success('Regulation created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create regulation: ' + error.message);
    },
  });
}

export function useUpdateRegulation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('regulations')
        .update({ name })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulations'] });
      toast.success('Regulation updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update regulation: ' + error.message);
    },
  });
}

export function useDeleteRegulation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('regulations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulations'] });
      toast.success('Regulation deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete regulation: ' + error.message);
    },
  });
}
