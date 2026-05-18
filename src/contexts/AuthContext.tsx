import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export type UserRole = 'faculty' | 'student';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  branch_id: string | null;
  regulation_id: string | null;
  college_id: string | null;
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: UserRole, branchId: string, regulationId?: string) => Promise<{ error: Error | null; userId?: string }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isFaculty: boolean;
  isStudent: boolean;
  updateProfile: (branchId: string, regulationId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileData) {
      setProfile(profileData);
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (roleData) {
      setRole(roleData.role as UserRole);
    }
  };

  useEffect(() => {
    // Check for existing session first
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Then set up listener for future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Use setTimeout to avoid Supabase deadlock with async callbacks
        setTimeout(async () => {
          await fetchProfile(session.user.id);
          setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    branchId: string,
    regulationId?: string
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) return { error };
      if (!data.user) return { error: new Error('Signup failed') };

      // Add user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role });

      if (roleError) return { error: roleError };

      // Update profile with branch and regulation
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          branch_id: branchId,
          regulation_id: regulationId || null,
        })
        .eq('id', data.user.id);

      if (profileError) return { error: profileError };

      return { error: null, userId: data.user.id };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
    setSession(null);
  };

  const updateProfile = async (branchId: string, regulationId?: string) => {
    if (!user) return;
    
    await supabase
      .from('profiles')
      .update({
        branch_id: branchId,
        regulation_id: regulationId || null,
      })
      .eq('id', user.id);
    
    await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        isAuthenticated: !!user && !!profile?.branch_id,
        isFaculty: role === 'faculty',
        isStudent: role === 'student',
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
