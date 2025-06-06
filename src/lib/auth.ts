
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'HR' | 'HOD' | 'MANAGER' | 'DIRECTOR' | 'EMPLOYEE';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  employee_id: string;
  role: UserRole;
  department_id?: string;
  phone?: string;
  hire_date?: string;
  is_active: boolean;
}

export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${window.location.origin}/`,
    }
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
};

export const isAdmin = (role?: UserRole): boolean => {
  return role ? ['SUPERADMIN', 'ADMIN', 'HR'].includes(role) : false;
};

export const canManageEmployees = (role?: UserRole): boolean => {
  return role ? ['SUPERADMIN', 'ADMIN', 'HR', 'HOD', 'MANAGER'].includes(role) : false;
};
