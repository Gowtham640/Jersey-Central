"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from '@supabase/supabase-js';
import { supabase } from "./supabase-client";
import { Toaster } from "react-hot-toast";
import { getStoredSession, storeSession, clearStoredSession } from "./utils/session-utils";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export default function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session with enhanced error handling
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('Error getting initial session:', error);
          // Try to recover from stored session as fallback
          const storedSession = getStoredSession();
          if (storedSession) {
            setSession(storedSession);
            setUser(storedSession?.user ?? null);
          }
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Unexpected error getting session:', error);
        // Final fallback to stored session
        const storedSession = getStoredSession();
        if (storedSession) {
          setSession(storedSession);
          setUser(storedSession?.user ?? null);
        }
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes with enhanced error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        try {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Store session using utility function
          if (session) {
            storeSession(session);
          } else {
            clearStoredSession();
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      <Toaster position="top-center" />
      {children}
    </AuthContext.Provider>
  );
}
