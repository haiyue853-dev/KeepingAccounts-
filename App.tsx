import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AlertProvider } from './src/components/AlertProvider';
import { COLORS } from './src/utils/constants';
import { getDatabase, resetDatabase } from './src/db/database';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView contentContainerStyle={styles.errorContainer}>
          <Text style={styles.errorTitle}>应用出现错误</Text>
          <Text style={styles.errorMessage}>{this.state.error?.message}</Text>
          <Text style={styles.errorStack}>{this.state.error?.stack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const initApp = async () => {
    try {
      setLoading(true);
      setInitError(null);
      await getDatabase();
      setReady(true);
    } catch (e: any) {
      console.error('Database init failed:', e);
      setInitError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  const handleRetry = async () => {
    await resetDatabase();
    await initApp();
  };

  if (loading) {
    return <View style={styles.loadingContainer} />;
  }

  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>初始化失败</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
          <Text style={styles.retryBtnText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AlertProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <AppNavigator />
          </NavigationContainer>
        </AlertProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorStack: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'left',
    fontFamily: 'monospace',
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
});
