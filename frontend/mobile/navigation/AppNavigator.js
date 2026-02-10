import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import HomeScreen from '../screens/HomeScreen';
import ScreenerQueryScreen from '../screens/ScreenerQueryScreen';
import ResultsScreen from '../screens/ResultsScreen';
import CompanyDetailScreen from '../screens/CompanyDetailScreen';
import WatchlistScreen from '../screens/WatchlistScreen';
import PortfolioScreen from '../screens/PortfolioScreen';
import AlertsScreen from '../screens/AlertsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Watchlist') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Portfolio') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Alerts') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
        headerStyle: {
          backgroundColor: theme.surface,
        },
        headerTintColor: theme.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home', headerShown: false }} />
      <Tab.Screen name="Watchlist" component={WatchlistScreen} options={{ title: 'Watchlist' }} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} options={{ title: 'Portfolio' }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Alerts' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();
  const { isAuthenticated, loading } = useAuth();

  console.log('AppNavigator: loading=', loading, 'isAuthenticated=', isAuthenticated);

  if (loading) {
    console.log('AppNavigator: Showing loading screen');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 16, color: theme.textPrimary }}>Loading...</Text>
      </View>
    );
  }

  console.log('AppNavigator: Rendering navigation container');

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <Stack.Navigator 
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.surface,
            },
            headerTintColor: theme.textPrimary,
            headerTitleStyle: {
              fontWeight: '700',
            },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Signup" 
            component={SignupScreen} 
            options={{ headerShown: false }} 
          />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator 
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.surface,
            },
            headerTintColor: theme.textPrimary,
            headerTitleStyle: {
              fontWeight: '700',
            },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen 
            name="MainTabs" 
            component={MainTabs} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="ScreenerQuery" 
            component={ScreenerQueryScreen} 
            options={{ 
              title: 'Stock Screener',
              headerBackTitle: 'Home',
            }} 
          />
          <Stack.Screen 
            name="Results" 
            component={ResultsScreen} 
            options={{ 
              title: 'Results',
              headerBackTitle: 'Back',
            }} 
          />
          <Stack.Screen 
            name="CompanyDetail" 
            component={CompanyDetailScreen} 
            options={({ route }) => ({ 
              title: route.params?.company?.ticker || 'Company Details',
              headerBackTitle: 'Results',
            })} 
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}