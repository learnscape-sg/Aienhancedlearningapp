import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase/simpleClient';

interface User {
  id: string;
  email: string;
  name: string;
  grade: string;
  interests: string[];
  role: 'student' | 'teacher' | 'parent';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role?: 'student' | 'teacher') => Promise<void>;
  register: (email: string, password: string, name: string, role: 'student' | 'teacher') => Promise<void>;
  logout: () => Promise<void>;
  updateUserPreferences: (grade: string, interests: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const initializeAuth = async () => {
      try {
        // Pre-create demo accounts
        const demoStudent: User = {
          id: 'student_demo_com',
          email: 'student@demo.com',
          name: '演示学生',
          grade: 'grade7',
          interests: ['math', 'science', 'reading'],
          role: 'student'
        };
        
        const demoTeacher: User = {
          id: 'teacher_demo_com',
          email: 'teacher@demo.com',
          name: '张老师',
          grade: '',
          interests: [],
          role: 'teacher'
        };
        
        // Store demo accounts
        localStorage.setItem(`user_profile_${demoStudent.id}`, JSON.stringify(demoStudent));
        localStorage.setItem(`user_profile_${demoTeacher.id}`, JSON.stringify(demoTeacher));
        
        // Check if there's an existing user in localStorage
        const existingSessionStr = localStorage.getItem('supabase_session');
        if (existingSessionStr) {
          const existingSession = JSON.parse(existingSessionStr);
          const userId = existingSession.user?.id;
          if (userId) {
            const existingProfile = localStorage.getItem(`user_profile_${userId}`);
            if (existingProfile) {
              const profile = JSON.parse(existingProfile);
              setUser(profile);
              setLoading(false);
              return;
            }
          }
        }
        
        // Default to demo student user for immediate access
        setUser(demoStudent);
        
        // Create demo session
        const mockSession = {
          access_token: 'demo_token_' + Date.now(),
          user: { id: demoStudent.id, email: demoStudent.email },
        };
        localStorage.setItem('supabase_session', JSON.stringify(mockSession));
        
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      // Try to load from localStorage first
      const localProfile = localStorage.getItem(`user_profile_${userId}`);
      if (localProfile) {
        const profile = JSON.parse(localProfile);
        setUser(profile);
        return;
      }
      
      // Create a default profile if none exists in localStorage
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const defaultUser: User = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.email.split('@')[0],
          grade: '',
          interests: [],
          role: 'student'
        };
        
        // Save the default profile to localStorage
        localStorage.setItem(`user_profile_${userId}`, JSON.stringify(defaultUser));
        setUser(defaultUser);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Create a fallback default profile
      const defaultUser: User = {
        id: userId,
        email: 'demo@example.com',
        name: '演示用户',
        grade: '',
        interests: [],
        role: 'student'
      };
      setUser(defaultUser);
    }
  };

  const login = async (email: string, password: string, role?: 'student' | 'teacher') => {
    try {
      // Mock login - accept any email/password
      const userId = email.replace('@', '_').replace('.', '_');
      
      // Check if user profile exists
      let userProfile = localStorage.getItem(`user_profile_${userId}`);
      if (userProfile) {
        const profile = JSON.parse(userProfile);
        setUser(profile);
      } else {
        // Create new user profile
        const newUser: User = {
          id: userId,
          email,
          name: email.split('@')[0],
          grade: '',
          interests: [],
          role: role || 'student'
        };
        localStorage.setItem(`user_profile_${userId}`, JSON.stringify(newUser));
        setUser(newUser);
      }
      
      // Create mock session
      const mockSession = {
        access_token: 'mock_token_' + Date.now(),
        user: { id: userId, email },
      };
      localStorage.setItem('supabase_session', JSON.stringify(mockSession));
      
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || '登录失败');
    }
  };

  const register = async (email: string, password: string, name: string, role: 'student' | 'teacher') => {
    try {
      // Create mock user data and store in localStorage
      const mockUser: User = {
        id: email.replace('@', '_').replace('.', '_'),
        email,
        name,
        grade: '',
        interests: [],
        role: role
      };
      
      localStorage.setItem(`user_profile_${mockUser.id}`, JSON.stringify(mockUser));
      
      // Set user directly since this is a mock system
      setUser(mockUser);
      
      // Also create a mock session
      const mockSession = {
        access_token: 'mock_token_' + Date.now(),
        user: { id: mockUser.id, email: mockUser.email },
      };
      localStorage.setItem('supabase_session', JSON.stringify(mockSession));
      
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || '注册失败');
    }
  };

  const logout = async () => {
    try {
      // Clear localStorage session and user data
      localStorage.removeItem('supabase_session');
      setUser(null);
      
      // Also try Supabase signOut in case there's a real session
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if Supabase logout fails, clear local state
      setUser(null);
    }
  };

  const updateUserPreferences = async (grade: string, interests: string[]) => {
    try {
      if (!user) return;
      
      const updatedUser = { ...user, grade, interests };
      
      // Update localStorage
      localStorage.setItem(`user_profile_${user.id}`, JSON.stringify(updatedUser));
      
      // Update user state
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      updateUserPreferences 
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