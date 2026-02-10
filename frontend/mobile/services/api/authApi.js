import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

export const signup = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (response.ok && data.success && data.data?.token) {
      await AsyncStorage.setItem('token', data.data.token);
      await AsyncStorage.setItem('userId', data.data.userId || data.data.user_id || '');
      await AsyncStorage.setItem('email', data.data.email || email);
      return data;
    }
    
    return { success: false, message: data.message || 'Signup failed', error_code: data.error_code || null };
  } catch (error) {
    console.error('Signup error:', error);
    throw new Error(error.message || 'Network error. Please check your connection.');
  }
};

export const login = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (response.ok && data.success && data.data?.token) {
      await AsyncStorage.setItem('token', data.data.token);
      await AsyncStorage.setItem('userId', data.data.userId || data.data.user_id || '');
      await AsyncStorage.setItem('email', data.data.email || email);
      return data;
    }
    
    return { success: false, message: data.message || 'Login failed' };
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(error.message || 'Network error. Please check your connection.');
  }
};

export const logout = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }
    
    await AsyncStorage.multiRemove(['token', 'userId', 'email']);
  } catch (error) {
    await AsyncStorage.multiRemove(['token', 'userId', 'email']);
    throw error;
  }
};

export const getToken = async () => {
  return await AsyncStorage.getItem('token');
};

export const getCurrentUser = async () => {
  const userId = await AsyncStorage.getItem('userId');
  const email = await AsyncStorage.getItem('email');
  return { userId, email };
};
