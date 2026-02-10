import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { ThemeProvider } from './context/ThemeContext';
import { SavedResultsProvider } from './context/SavedResultsContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  console.log('App.js: Rendering');
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <SavedResultsProvider>
              <AppNavigator />
            </SavedResultsProvider>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}