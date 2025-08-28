// Utility functions for session management and mobile compatibility
import { Session } from '@supabase/supabase-js';

export const getStoredSession = (): Session | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Try localStorage first
    const localStorageSession = localStorage.getItem('supabase-auth-token');
    if (localStorageSession) {
      return JSON.parse(localStorageSession);
    }
    
    // Fallback to sessionStorage
    const sessionStorageSession = sessionStorage.getItem('supabase-auth-token');
    if (sessionStorageSession) {
      return JSON.parse(sessionStorageSession);
    }
    
    // Fallback to legacy storage key
    const legacySession = localStorage.getItem('supabaseSession') || 
                         sessionStorage.getItem('supabaseSession');
    if (legacySession) {
      return JSON.parse(legacySession);
    }
    
    return null;
  } catch {
    console.warn('Error retrieving stored session');
    return null;
  }
};

export const storeSession = (session: Session): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // Store in localStorage
    localStorage.setItem('supabase-auth-token', JSON.stringify(session));
  } catch {
    try {
      // Fallback to sessionStorage
      sessionStorage.setItem('supabase-auth-token', JSON.stringify(session));
    } catch {
      console.warn('Failed to store session in storage');
    }
  }
};

export const clearStoredSession = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('supabase-auth-token');
    sessionStorage.removeItem('supabase-auth-token');
    localStorage.removeItem('supabaseSession');
    sessionStorage.removeItem('supabaseSession');
  } catch {
    console.warn('Failed to clear session from storage');
  }
};

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const getStorageFallback = (): 'localStorage' | 'sessionStorage' | 'cookies' => {
  if (typeof window === 'undefined') return 'cookies';
  
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return 'localStorage';
  } catch {
    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      return 'sessionStorage';
    } catch {
      return 'cookies';
    }
  }
};
