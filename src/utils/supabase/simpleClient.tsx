// Simple client for authentication without complex dependencies
import { projectId, publicAnonKey } from './info';

interface AuthResponse {
  data?: {
    user?: any;
    session?: any;
  };
  error?: any;
}

interface User {
  id: string;
  email: string;
}

interface Session {
  access_token: string;
  user: User;
}

class SimpleSupabaseClient {
  private url: string;
  private key: string;

  constructor(url: string, key: string) {
    this.url = url;
    this.key = key;
  }

  async signInWithPassword(credentials: { email: string; password: string }) {
    // For demo purposes, create a mock login that works with any email/password
    const mockUser: User = {
      id: credentials.email.replace('@', '_').replace('.', '_'),
      email: credentials.email,
    };

    const mockSession: Session = {
      access_token: 'mock_token_' + Date.now(),
      user: mockUser,
    };

    // Store session in localStorage
    localStorage.setItem('supabase_session', JSON.stringify(mockSession));

    return {
      data: {
        user: mockUser,
        session: mockSession,
      },
      error: null,
    };
  }

  async signOut() {
    localStorage.removeItem('supabase_session');
    return { error: null };
  }

  async getSession() {
    try {
      const sessionData = localStorage.getItem('supabase_session');
      if (!sessionData) {
        return { data: { session: null } };
      }

      const session = JSON.parse(sessionData);
      return {
        data: { session },
        error: null,
      };
    } catch (error) {
      return { data: { session: null }, error };
    }
  }

  get auth() {
    return {
      signInWithPassword: this.signInWithPassword.bind(this),
      signOut: this.signOut.bind(this),
      getSession: this.getSession.bind(this),
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        // Simple mock implementation
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        };
      },
      getUser: async (token: string) => {
        try {
          const sessionData = localStorage.getItem('supabase_session');
          if (!sessionData) {
            return { data: { user: null }, error: 'No session' };
          }

          const session = JSON.parse(sessionData);
          return {
            data: { user: session.user },
            error: null,
          };
        } catch (error) {
          return { data: { user: null }, error };
        }
      },
    };
  }
}

export const supabase = new SimpleSupabaseClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);