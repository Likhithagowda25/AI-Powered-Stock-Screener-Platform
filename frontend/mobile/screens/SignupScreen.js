import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const SignupScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { signup } = useAuth();

  const handleSignup = async () => {
    // Clear previous messages
    setError('');
    setSuccess('');

    // Validate empty fields
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Password match validation
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    // Password length validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    // Password strength validation
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain uppercase, lowercase, and numbers.');
      return;
    }

    setLoading(true);
    
    try {
      const result = await signup(email, password);
      
      if (result.success) {
        // Success - show message
        setSuccess('Signup successful! Please log in to continue.');
        setTimeout(() => {
          navigation.navigate('Login');
        }, 2000);
      } else {
        setError(result.message || 'Unable to create account. Please try again later.');
      }
    } catch (error) {
      // Hide technical errors from users
      setError('Unable to connect. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(theme);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formWrapper}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>
          </View>

          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: theme.errorBackground || '#fef2f2', borderColor: theme.error || '#ef4444' }]}>
              <Ionicons name="alert-circle" size={20} color={theme.error || '#ef4444'} />
              <Text style={[styles.errorText, { color: theme.error || '#ef4444' }]}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={[styles.successContainer, { backgroundColor: '#d1fae5', borderColor: '#10b981' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={[styles.successText, { color: '#059669' }]}>{success}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Password (min 8 characters)"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} disabled={loading}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={theme.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon} disabled={loading}>
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            {error && error.toLowerCase().includes('already exists') && (
              <TouchableOpacity
                style={styles.goToLoginButton}
                onPress={() => navigation.navigate('Login')}
                disabled={loading}
              >
                <Text style={styles.goToLoginText}>Go to Login</Text>
              </TouchableOpacity>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
                <Text style={styles.linkText}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    ...(Platform.OS === 'web' ? { alignItems: 'center' } : {}),
  },
  formWrapper: {
    width: '100%',
    maxWidth: 480,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 1,
    borderColor: theme.border,
  },
  icon: {
    marginRight: 12,
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 4,
  },
  input: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 17,
    height: '100%',
    outlineStyle: 'none',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  goToLoginButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  goToLoginText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  linkText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SignupScreen;
