import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase/client';
import type { ProfilePreferences } from '../types/preferences';

type UserRole = 'student' | 'teacher' | 'parent';

interface User {
  id: string;
  email: string;
  name: string;
  grade: string;
  interests: string[];
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  preferences: ProfilePreferences;
  loading: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updateUserPreferences: (grade: string, interests: string[]) => Promise<void>;
  updateProfilePreferences: (partial: Partial<ProfilePreferences>) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapUserTypeToRole(userType: string | null): UserRole {
  if (userType === 'teacher' || userType === 'student' || userType === 'parent') {
    return userType;
  }
  return 'student';
}

function parsePreferences(prefs: unknown): ProfilePreferences {
  if (prefs && typeof prefs === 'object' && !Array.isArray(prefs)) {
    const p = prefs as Record<string, unknown>;
    return {
      grade: typeof p.grade === 'string' ? p.grade : undefined,
      interests: Array.isArray(p.interests) ? p.interests.filter((x): x is string => typeof x === 'string') : undefined,
      defaultGrade: typeof p.defaultGrade === 'string' ? p.defaultGrade : undefined,
      defaultSubject: typeof p.defaultSubject === 'string' ? p.defaultSubject : undefined,
      notifications: p.notifications && typeof p.notifications === 'object' && !Array.isArray(p.notifications)
        ? (p.notifications as Record<string, boolean>)
        : undefined,
    };
  }
  return {};
}

async function loadProfileFromSupabase(
  userId: string,
  email: string
): Promise<{ user: User; preferences: ProfilePreferences } | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, user_type, preferences')
    .eq('id', userId)
    .maybeSingle();

  if (profile) {
    const prefs = parsePreferences(profile.preferences);
    return {
      user: {
        id: profile.id,
        email,
        name: profile.name ?? email.split('@')[0],
        grade: prefs.grade ?? '',
        interests: prefs.interests ?? [],
        role: mapUserTypeToRole(profile.user_type),
      },
      preferences: prefs,
    };
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<ProfilePreferences>({});
  const [loading, setLoading] = useState(true);

  const applyProfileResult = (result: { user: User; preferences: ProfilePreferences } | null) => {
    if (result) {
      setUser(result.user);
      setPreferences(result.preferences);
    } else {
      setUser(null);
      setPreferences({});
    }
  };

  const createFallbackUser = (sessionUser: { id: string; email?: string; user_metadata?: { full_name?: string } }) => ({
    id: sessionUser.id,
    email: sessionUser.email ?? '',
    name: sessionUser.user_metadata?.full_name ?? sessionUser.email?.split('@')[0] ?? '',
    grade: '',
    interests: [],
    role: 'student' as UserRole,
  });

  useEffect(() => {
    const AUTH_TIMEOUT_MS = 8000;
    let initDone = false;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (initDone) return;

        if (session?.user) {
          const result = await loadProfileFromSupabase(session.user.id, session.user.email ?? '');
          if (initDone) return;

          if (result) {
            applyProfileResult(result);
          } else {
            setUser(createFallbackUser(session.user));
            setPreferences({});
          }
        } else {
          setUser(null);
          setPreferences({});
        }
      } catch (error) {
        console.error('[Auth] Error initializing auth:', error);
        setUser(null);
        setPreferences({});
      } finally {
        if (!initDone) {
          initDone = true;
          setLoading(false);
        }
      }
    };

    // 8s 超时保护，避免无限 loading
    const timeoutId = setTimeout(() => {
      if (!initDone) {
        initDone = true;
        console.warn('[Auth] 初始化超时(8s)，强制结束 loading');
        setLoading(false);
        setUser(null);
        setPreferences({});
      }
    }, AUTH_TIMEOUT_MS);

    initializeAuth();

    // 延后注册 onAuthStateChange，避免与 getSession 竞争导致死锁（supabase/auth-js#762）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setPreferences({});
      } else if (session?.user) {
        // 使用 setTimeout 延后执行，避免在 auth 回调中直接 await 引发死锁
        loadProfileFromSupabase(session.user.id, session.user.email ?? '')
          .then((result) => {
            if (result) applyProfileResult(result);
            else {
              setUser(createFallbackUser(session.user));
              setPreferences({});
            }
          })
          .catch((err) => console.error('[Auth] onAuthStateChange 加载 profile 失败:', err));
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, _role?: UserRole) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message || '登录失败');

    const result = await loadProfileFromSupabase(data.user.id, data.user.email ?? '');
    if (result) {
      applyProfileResult(result);
    } else {
      setUser(createFallbackUser(data.user));
      setPreferences({});
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, user_type: role },
      },
    });
    if (error) throw new Error(error.message || '注册失败');

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        name,
        user_type: role,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      if (profileError) {
        console.warn('Profile upsert failed (trigger may handle it):', profileError);
      }

      setUser({
        id: data.user.id,
        email: data.user.email ?? '',
        name,
        grade: '',
        interests: [],
        role,
      });
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUserPreferences = async (grade: string, interests: string[]) => {
    if (!user) return;
    await updateProfilePreferences({ grade, interests });
    setUser((u) => (u ? { ...u, grade, interests } : null));
  };

  const updateProfilePreferences = async (partial: Partial<ProfilePreferences>) => {
    if (!user) return;
    const merged: ProfilePreferences = {
      ...preferences,
      ...partial,
      notifications: { ...preferences.notifications, ...partial.notifications },
    };
    const { error } = await supabase
      .from('profiles')
      .update({
        preferences: merged,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (error) throw new Error(error.message || '保存失败');
    setPreferences(merged);
    if (partial.grade !== undefined || partial.interests !== undefined) {
      setUser((u) =>
        u
          ? {
              ...u,
              grade: merged.grade ?? u.grade,
              interests: merged.interests ?? u.interests,
            }
          : null
      );
    }
  };

  const changePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message || '修改密码失败');
  };

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
    });
    if (error) throw new Error(error.message || '发送重置邮件失败');
  };

  return (
    <AuthContext.Provider value={{
      user,
      preferences,
      loading,
      login,
      register,
      logout,
      resetPasswordForEmail,
      updateUserPreferences,
      updateProfilePreferences,
      changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
