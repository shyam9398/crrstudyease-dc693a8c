import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Subject {
  id: string;
  name: string;
  code: string;
  branch_id: string;
  regulation_id: string;
  year_sem: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  name: string;
  subject_id: string;
  pdf_unlocked: boolean;
  pdf_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface Module {
  id: string;
  name: string;
  unit_id: string;
  topics: string[];
  completed: boolean;
  sort_order: number;
  created_at: string;
}

export interface Resource {
  id: string;
  type: 'youtube' | 'notes' | 'formula' | 'important-questions' | 'pyq';
  title: string;
  url: string | null;
  content: string | null;
  module_id: string;
  created_by: string;
  created_at: string;
}

// Fetch subjects for user's branch and optionally filter by regulation
// If showAll is true (faculty view), fetch all subjects in the branch regardless of creator
export function useSubjects(regulationId?: string) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['subjects', profile?.branch_id, regulationId],
    queryFn: async () => {
      if (!profile?.branch_id) return [];
      
      let query = supabase
        .from('subjects')
        .select('*')
        .eq('branch_id', profile.branch_id);
      
      if (regulationId) {
        query = query.eq('regulation_id', regulationId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Subject[];
    },
    enabled: !!profile?.branch_id,
  });
}

// Fetch all subjects across all faculty in same branch (for faculty dashboard)
export function useAllBranchSubjects(regulationId?: string) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['all-subjects', profile?.branch_id, regulationId],
    queryFn: async () => {
      if (!profile?.branch_id) return [];
      
      let query = supabase
        .from('subjects')
        .select('*')
        .eq('branch_id', profile.branch_id);
      
      if (regulationId) {
        query = query.eq('regulation_id', regulationId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Subject[];
    },
    enabled: !!profile?.branch_id,
  });
}

// Fetch creator names for subjects
export function useSubjectCreators(creatorIds: string[]) {
  return useQuery({
    queryKey: ['subject-creators', creatorIds],
    queryFn: async () => {
      if (creatorIds.length === 0) return {};
      const uniqueIds = [...new Set(creatorIds)];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', uniqueIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.id] = p.name; });
      return map;
    },
    enabled: creatorIds.length > 0,
  });
}

// Fetch single subject with units and modules
export function useSubject(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['subject', subjectId],
    queryFn: async () => {
      if (!subjectId) return null;
      
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();
      
      if (subjectError) throw subjectError;
      
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('subject_id', subjectId)
        .order('sort_order');
      
      if (unitsError) throw unitsError;
      
      // Fetch modules for all units
      const unitIds = units.map(u => u.id);
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .in('unit_id', unitIds)
        .order('sort_order');
      
      if (modulesError) throw modulesError;
      
      return {
        ...subject,
        units: units.map(unit => ({
          ...unit,
          modules: modules.filter(m => m.unit_id === unit.id),
        })),
      } as Subject & { units: (Unit & { modules: Module[] })[] };
    },
    enabled: !!subjectId,
  });
}

// Create subject
export function useCreateSubject() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ name, code, regulationId, yearSem }: { name: string; code: string; regulationId: string; yearSem: string }) => {
      if (!user || !profile?.branch_id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          name,
          code,
          branch_id: profile.branch_id,
          regulation_id: regulationId,
          year_sem: yearSem,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create subject: ' + error.message);
    },
  });
}

// Update subject
export function useUpdateSubject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name, code }: { id: string; name: string; code: string }) => {
      const { error } = await supabase
        .from('subjects')
        .update({ name, code, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['subject'] });
      toast.success('Subject updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update subject: ' + error.message);
    },
  });
}

// Delete subject
export function useDeleteSubject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete subject: ' + error.message);
    },
  });
}

// Unit mutations
export function useCreateUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, subjectId }: { name: string; subjectId: string }) => {
      const { data, error } = await supabase
        .from('units')
        .insert({ name, subject_id: subjectId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subject', variables.subjectId] });
      toast.success('Unit created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create unit: ' + error.message);
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('units')
        .update({ name })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject'] });
      toast.success('Unit updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update unit: ' + error.message);
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject'] });
      toast.success('Unit deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete unit: ' + error.message);
    },
  });
}

// Module mutations
export function useCreateModule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, unitId }: { name: string; unitId: string }) => {
      const { data, error } = await supabase
        .from('modules')
        .insert({ name, unit_id: unitId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject'] });
      toast.success('Module created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create module: ' + error.message);
    },
  });
}

export function useUpdateModule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, name, topics }: { id: string; name?: string; topics?: string[] }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (topics !== undefined) updates.topics = topics;
      
      const { error } = await supabase
        .from('modules')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject'] });
      queryClient.invalidateQueries({ queryKey: ['module'] });
      toast.success('Module updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update module: ' + error.message);
    },
  });
}

export function useDeleteModule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject'] });
      toast.success('Module deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete module: ' + error.message);
    },
  });
}
