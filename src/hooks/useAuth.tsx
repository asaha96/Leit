import { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User as DatabaseUser } from '@/types/database';
import { apiFetch, getAuthToken, setAuthToken, clearAuthToken } from '@/lib/api';

interface AuthContextType {
  user: DatabaseUser | null;
  dbUser: DatabaseUser | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<DatabaseUser | null>(null);
  const [dbUser, setDbUser] = useState<DatabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    apiFetch("/auth/me")
      .then((res) => {
        setUser(res.user);
        setDbUser(res.user);
      })
      .catch((err) => {
        console.error("Auth me error", err);
        clearAuthToken();
        setUser(null);
        setDbUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const res = await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      });
      setAuthToken(res.token);
      setUser(res.user);
      setDbUser(res.user);
      toast({
        title: "Account created!",
        description: "You are now signed in.",
      });
      return { error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: error?.message || "Unable to sign up",
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await apiFetch("/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(res.token);
      setUser(res.user);
      setDbUser(res.user);
      return { error: null };
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error?.message || "Unable to sign in",
      });
      return { error };
    }
  };

  const signOut = async () => {
    clearAuthToken();
    setUser(null);
    setDbUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      dbUser,
      loading,
      signUp,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};