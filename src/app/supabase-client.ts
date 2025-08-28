import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? {
        getItem: (key: string) => {
          try {
            // Try localStorage first
            const localStorageValue = window.localStorage.getItem(key);
            if (localStorageValue) return localStorageValue;
            
            // Fallback to sessionStorage
            const sessionStorageValue = window.sessionStorage.getItem(key);
            if (sessionStorageValue) return sessionStorageValue;
            
            // Final fallback to cookies
            const cookies = document.cookie.split(';');
            const cookie = cookies.find(c => c.trim().startsWith(`${key}=`));
            return cookie ? cookie.split('=')[1] : null;
          } catch (error) {
            // If any storage method fails, try cookies as last resort
            try {
              const cookies = document.cookie.split(';');
              const cookie = cookies.find(c => c.trim().startsWith(`${key}=`));
              return cookie ? cookie.split('=')[1] : null;
            } catch {
              return null;
            }
          }
        },
        setItem: (key: string, value: string) => {
          try {
            // Try localStorage first
            window.localStorage.setItem(key, value);
          } catch (error) {
            try {
              // Fallback to sessionStorage
              window.sessionStorage.setItem(key, value);
            } catch (error2) {
              // Final fallback to cookies
              try {
                document.cookie = `${key}=${value}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
              } catch (error3) {
                console.warn('Failed to persist session data:', error3);
              }
            }
          }
        },
        removeItem: (key: string) => {
          try {
            window.localStorage.removeItem(key);
          } catch (error) {
            try {
              window.sessionStorage.removeItem(key);
            } catch (error2) {
              try {
                document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
              } catch (error3) {
                console.warn('Failed to remove session data:', error3);
              }
            }
          }
        }
      } : undefined,
      storageKey: 'supabase-auth-token',
      // Additional mobile-specific settings
      flowType: 'pkce',
      debug: process.env.NODE_ENV === 'development',
    },
    global: {
      headers: {
        'X-Client-Info': 'jc3-nextjs',
      },
    },
  }
)