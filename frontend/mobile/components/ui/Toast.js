import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Toast types and their configurations
const TOAST_TYPES = {
  success: {
    icon: 'checkmark-circle',
    backgroundColor: '#10B981',
    iconColor: '#fff',
  },
  error: {
    icon: 'alert-circle',
    backgroundColor: '#EF4444',
    iconColor: '#fff',
  },
  warning: {
    icon: 'warning',
    backgroundColor: '#F59E0B',
    iconColor: '#fff',
  },
  info: {
    icon: 'information-circle',
    backgroundColor: '#3B82F6',
    iconColor: '#fff',
  },
};

// Toast Context
const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Individual Toast component
const ToastItem = ({ id, message, type = 'info', duration = 3000, onDismiss }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));
  const config = TOAST_TYPES[type] || TOAST_TYPES.info;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(id);
    });
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        { 
          backgroundColor: config.backgroundColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Ionicons name={config.icon} size={22} color={config.iconColor} />
      <Text style={styles.toastText}>{message}</Text>
      <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
        <Ionicons name="close" size={18} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Toast Provider component
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const hideToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Convenience methods
  const success = useCallback((message, duration) => showToast(message, 'success', duration), [showToast]);
  const error = useCallback((message, duration) => showToast(message, 'error', duration), [showToast]);
  const warning = useCallback((message, duration) => showToast(message, 'warning', duration), [showToast]);
  const info = useCallback((message, duration) => showToast(message, 'info', duration), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, success, error, warning, info }}>
      {children}
      {/* Toast Container */}
      <View style={[styles.container, { top: insets.top + 10 }]} pointerEvents="box-none">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onDismiss={hideToast}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    ...(Platform.OS === 'web' ? { position: 'fixed' } : {}),
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default ToastProvider;
