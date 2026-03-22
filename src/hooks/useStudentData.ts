import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch subjects for a branch+regulation (no auth required)
export function useStudentSubjects(branchId: string | undefined, regulationId: string | undefined, yearSem?: string | undefined) {
  return useQuery({
    queryKey: ['student-subjects', branchId, regulationId, yearSem],
    queryFn: async () => {
      if (!branchId || !regulationId) return [];
      let query = supabase
        .from('subjects')
        .select('*')
        .eq('branch_id', branchId)
        .eq('regulation_id', regulationId);
      if (yearSem) {
        query = query.eq('year_sem', yearSem);
      }
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!branchId && !!regulationId,
  });
}

// Fetch single subject with units and modules (no auth required)
export function useStudentSubject(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['student-subject', subjectId],
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

      const unitIds = units.map(u => u.id);
      if (unitIds.length === 0) return { ...subject, units: [] };

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
          modules: (modules || []).filter(m => m.unit_id === unit.id),
        })),
      };
    },
    enabled: !!subjectId,
  });
}

// Fetch module with resources (no auth required)
export function useStudentModule(moduleId: string | undefined) {
  return useQuery({
    queryKey: ['student-module', moduleId],
    queryFn: async () => {
      if (!moduleId) return null;
      const { data: module, error: moduleError } = await supabase
        .from('modules')
        .select('*, units!inner(*, subjects!inner(*))')
        .eq('id', moduleId)
        .single();
      if (moduleError) throw moduleError;

      const { data: resources, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .eq('module_id', moduleId)
        .order('created_at', { ascending: false });
      if (resourcesError) throw resourcesError;

      return { ...module, resources: resources || [] };
    },
    enabled: !!moduleId,
  });
}

// Fetch custom categories for a subject (no auth required)
export function useStudentCustomCategories(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['student-custom-categories', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      const { data, error } = await supabase
        .from('custom_categories')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!subjectId,
  });
}
