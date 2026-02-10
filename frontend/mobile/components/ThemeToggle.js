import React from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SPACING, RADIUS, SHADOWS } from '../constants/colors';

export default function ThemeToggle() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [scaleValue] = React.useState(new Animated.Value(1));

  const handlePress = () => {
    // Animation on press
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    toggleTheme();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.surface }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isDarkMode ? 'sunny' : 'moon'}
          size={24}
          color={theme.primary}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
});
