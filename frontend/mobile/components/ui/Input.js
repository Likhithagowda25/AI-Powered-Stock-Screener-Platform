import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY, RADIUS } from '../../constants/colors';

/**
 * Input - Styled input component
 * @param {string} label - Input label
 * @param {string} value - Input value
 * @param {function} onChangeText - Change handler
 * @param {string} placeholder - Placeholder text
 * @param {string} error - Error message
 * @param {string} helperText - Helper text
 * @param {boolean} multiline - Enable multiline
 * @param {number} numberOfLines - Number of lines for multiline
 * @param {boolean} secureTextEntry - Password input
 * @param {string} icon - Left icon name
 * @param {string} rightIcon - Right icon name
 * @param {function} onRightIconPress - Right icon press handler
 */
export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  multiline = false,
  numberOfLines = 1,
  secureTextEntry = false,
  icon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  ...props
}) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  
  const getBorderColor = () => {
    if (error) return theme.error;
    if (isFocused) return theme.primary;
    return theme.border;
  };
  
  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
      )}
      
      <View style={[
        styles.inputContainer,
        { 
          backgroundColor: theme.surface,
          borderColor: getBorderColor(),
        },
        isFocused && [styles.focused, { backgroundColor: theme.surfaceTint }],
        multiline && { minHeight: numberOfLines * 24 + SPACING.md * 2, alignItems: 'flex-start' },
      ]}>
        {icon && (
          <Ionicons 
            name={icon} 
            size={20} 
            color={isFocused ? theme.primary : theme.textTertiary} 
            style={[styles.icon, multiline && { marginTop: SPACING.sm }]}
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            { color: theme.textPrimary },
            multiline && styles.multilineInput,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          multiline={multiline}
          numberOfLines={numberOfLines}
          secureTextEntry={secureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      
      {(error || helperText) && (
        <Text style={[
          styles.helperText,
          { color: error ? theme.error : theme.textTertiary }
        ]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  focused: {
    borderWidth: 2,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    paddingVertical: SPACING.sm + 2,
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: SPACING.sm + 2,
  },
  rightIcon: {
    padding: SPACING.xs,
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
  },
});
