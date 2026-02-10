import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api/v1';

/**
 * User Signup
 */
export const signup = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/signup`, {
      email,
      password
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Signup failed' };
  }
};

/**
 * User Login - Saves token securely
 */
export const login = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    if (response.data.success) {
      // Store token and user info securely
      await AsyncStorage.setItem('token', response.data.data.token);
      await AsyncStorage.setItem('userId', response.data.data.userId);
      await AsyncStorage.setItem('email', response.data.data.email);
    }
    
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Login failed' };
  }
};

/**
 * Logout - Calls API to blacklist token and removes from storage
 */
export const logout = async () => {
  try {
    const token = await getToken();
    
    // If token exists, call logout endpoint to blacklist it
    if (token) {
      try {
        await axios.post(`${API_URL}/auth/logout`, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } catch (error) {
        // Continue with local logout even if API call fails
        console.warn('Logout API call failed, clearing local storage anyway', error);
      }
    }
    
    // Clear local storage
    await AsyncStorage.multiRemove(['token', 'userId', 'email']);
  } catch (error) {
    // Ensure local storage is cleared even on error
    await AsyncStorage.multiRemove(['token', 'userId', 'email']);
    throw error;
  }
};

/**
 * Get stored token
 */
export const getToken = async () => {
  return await AsyncStorage.getItem('token');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  const token = await getToken();
  return !!token;
};

/**
 * Get stored user info
 */
export const getCurrentUser = async () => {
  const userId = await AsyncStorage.getItem('userId');
  const email = await AsyncStorage.getItem('email');
  return { userId, email };
};
