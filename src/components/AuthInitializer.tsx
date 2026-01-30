import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { setTokenGetter } from '@/lib/api';

// Component that initializes the API token getter as early as possible
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      // Set the token getter for all API calls
      setTokenGetter(getToken);
    }
  }, [getToken, isLoaded]);

  return <>{children}</>;
}
