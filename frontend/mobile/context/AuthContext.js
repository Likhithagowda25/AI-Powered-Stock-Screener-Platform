import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { login as authLogin, signup as authSignup, logout as authLogout, getCurrentUser } from '../services/api/authApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      console.log('AuthContext: Initializing, platform:', Platform.OS);
      
      try {
        // Quick check for token existence
        let token = null;
        try {
          token = await AsyncStorage.getItem('token');
        } catch (e) {
          console.log('AuthContext: Storage access error:', e);
        }
        
        if (!isMounted) return;
        
        if (token) {
          // Only show loading if we have a token to verify
          setLoading(true);
          
          try {
            const userData = await getCurrentUser();
            
            if (!isMounted) return;
            
            if (userData?.userId) {
              setUser(userData);
              setIsAuthenticated(true);
              console.log('AuthContext: User restored from token');
            } else {
              // Invalid session - clear it
              await AsyncStorage.multiRemove(['token', 'userId', 'email']).catch(() => {});
              console.log('AuthContext: Cleared invalid session');
            }
          } catch (e) {
            console.log('AuthContext: Token verification failed:', e);
            await AsyncStorage.multiRemove(['token', 'userId', 'email']).catch(() => {});
          }
        } else {
          console.log('AuthContext: No existing token');
        }
      } catch (error) {
        console.error('AuthContext: Init error:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
          console.log('AuthContext: Initialization complete');
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authLogin(email, password);
      
      if (response.success) {
        const userData = await getCurrentUser();
        
        if (userData?.userId) {
          setUser(userData);
          setIsAuthenticated(true);
          return { success: true };
        }
        
        return { success: false, message: 'Unable to retrieve account information' };
      }
      
      // Map backend errors to user-friendly messages
      const errorMessage = response.message || '';
      let friendlyMessage = 'Unable to log in. Please try again.';
      
      if (errorMessage.toLowerCase().includes('credentials') || errorMessage.toLowerCase().includes('invalid')) {
        friendlyMessage = 'Incorrect password';
      } else if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('does not exist')) {
        friendlyMessage = 'Account not found';
      }
      
      return { success: false, message: friendlyMessage };
    } catch (error) {
      // Network or connection errors
      return { success: false, message: 'Connection error' };
    }
  };

  const signup = async (email, password) => {
    try {
      const response = await authSignup(email, password);
      
      if (response.success) {
        // Don't auto-login after signup - redirect to login page
        return { success: true };
      }
      
      // Use error_code for reliable detection, fall back to message text
      const errorCode = response.error_code || '';
      const errorMessage = response.message || '';
      let friendlyMessage = 'Unable to create account. Please try again.';
      
      if (errorCode === 'USER_EXISTS' || errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('duplicate')) {
        friendlyMessage = 'An account with this email already exists. Please log in instead.';
      } else if (errorCode === 'INVALID_EMAIL' || errorMessage.toLowerCase().includes('invalid email')) {
        friendlyMessage = 'Invalid email address';
      } else if (errorCode === 'WEAK_PASSWORD' || errorMessage.toLowerCase().includes('password')) {
        friendlyMessage = 'Password does not meet requirements';
      }
      
      return { success: false, message: friendlyMessage, isExistingUser: errorCode === 'USER_EXISTS' || errorMessage.toLowerCase().includes('already exists') };
    } catch (error) {
      // Network or connection errors
      return { success: false, message: 'Connection error' };
    }
  };

  const logout = async () => {
    try {
      await authLogout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        initialized,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
