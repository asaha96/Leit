import { useEffect } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import type { User as DatabaseUser } from '@/types/database';
import { setTokenGetter } from '@/lib/api';

interface AuthContextType {
  user: DatabaseUser | null;
  dbUser: DatabaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

export const useAuth = (): AuthContextType => {
  const { user, isLoaded } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();

  // Set the token getter for API calls
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  // Convert Clerk user to DatabaseUser format
  const dbUser: DatabaseUser | null = user ? {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress,
    external_sub: user.id,
    display_name: user.fullName || user.firstName || undefined,
    created_at: user.createdAt?.toISOString() || new Date().toISOString(),
    updated_at: user.updatedAt?.toISOString() || new Date().toISOString(),
  } : null;

  const signOut = async () => {
    await clerkSignOut();
  };

  return {
    user: dbUser,
    dbUser,
    loading: !isLoaded,
    signOut,
    getToken,
  };
};

// AuthProvider is no longer needed with Clerk - ClerkProvider handles it
// Keep this export for backwards compatibility but it just passes through children
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
