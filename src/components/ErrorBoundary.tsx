import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { YStack, Card, Button } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { logError, getCrashReport, logInfo } from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  crashReport: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      crashReport: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error with full context
    logError('App crashed - Error Boundary caught error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo,
      platform: Platform.OS,
      platformVersion: Platform.Version,
      timestamp: new Date().toISOString(),
    });

    // Generate comprehensive crash report
    const crashReport = getCrashReport();

    // Store crash report locally for debugging
    this.storeCrashReport(crashReport, error);

    this.setState({
      error,
      errorInfo,
      crashReport,
    });

    // Log additional crash context
    logInfo('Crash report generated', {
      errorName: error.name,
      errorMessage: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  private async storeCrashReport(crashReport: string, error: Error) {
    try {
      const crashData = {
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        crashReport,
        platform: Platform.OS,
        platformVersion: Platform.Version,
      };

      await AsyncStorage.setItem(`crash_report_${Date.now()}`, JSON.stringify(crashData, null, 2));

      logInfo('Crash report stored locally');
    } catch (storageError) {
      logError('Failed to store crash report', storageError as Error);
    }
  }

  private handleRestart = () => {
    logInfo('User initiated app restart from error boundary');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      crashReport: null,
    });
  };

  private handleViewCrashReport = () => {
    if (this.state.crashReport) {
      Alert.alert('Crash Report', 'This report contains technical details about the crash.', [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Copy to Clipboard',
          onPress: () => {
            // In a real app, you'd use Clipboard API
            logInfo('Crash report copied to clipboard', {
              reportLength: this.state.crashReport?.length,
            });
          },
        },
      ]);
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={{ flex: 1, backgroundColor: '#000', padding: 20 }}>
          <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
            <Feather name="alert-triangle" size={64} color="#FF6B6B" />

            <Card padding="$4" backgroundColor="$backgroundStrong" borderRadius="$4">
              <YStack gap="$3" alignItems="center">
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#FF6B6B',
                    textAlign: 'center',
                  }}
                >
                  Oops! Something went wrong
                </Text>

                <Text style={{ fontSize: 16, color: '#999', textAlign: 'center' }}>
                  The app encountered an unexpected error and needs to restart.
                </Text>

                {this.state.error && (
                  <Card padding="$3" backgroundColor="$red2" borderRadius="$3" width="100%">
                    <Text style={{ fontSize: 14, color: '#FF6B6B', fontFamily: 'monospace' }}>
                      {this.state.error.name}: {this.state.error.message}
                    </Text>
                  </Card>
                )}

                <YStack gap="$2" width="100%" marginTop="$3">
                  <Button
                    onPress={this.handleRestart}
                    backgroundColor="$blue10"
                    color="white"
                    size="$4"
                  >
                    <Feather name="refresh-cw" size={20} color="white" />
                    <Text
                      style={{ color: 'white', marginLeft: 8, fontSize: 16, fontWeight: 'bold' }}
                    >
                      Restart App
                    </Text>
                  </Button>

                  <Button onPress={this.handleViewCrashReport} variant="secondary" size="$3">
                    <Feather name="file-text" size={16} color="#999" />
                    <Text style={{ color: '#999', marginLeft: 8 }}>View Crash Report</Text>
                  </Button>
                </YStack>

                {__DEV__ && this.state.error?.stack && (
                  <ScrollView
                    style={{
                      maxHeight: 200,
                      width: '100%',
                      backgroundColor: '#111',
                      borderRadius: 8,
                      padding: 12,
                      marginTop: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#ccc',
                        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                      }}
                    >
                      {this.state.error.stack}
                    </Text>
                  </ScrollView>
                )}
              </YStack>
            </Card>

            <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', marginTop: 20 }}>
              If this problem persists, please contact support.
              {'\n'}Platform: {Platform.OS} {Platform.Version}
            </Text>
          </YStack>
        </View>
      );
    }

    return this.props.children;
  }
}

// Helper function to get stored crash reports for debugging
export const getStoredCrashReports = async (): Promise<any[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const crashKeys = keys.filter((key) => key.startsWith('crash_report_'));

    const crashReports = await Promise.all(
      crashKeys.map(async (key) => {
        const report = await AsyncStorage.getItem(key);
        return report ? JSON.parse(report) : null;
      }),
    );

    return crashReports.filter(Boolean);
  } catch (error) {
    logError('Failed to retrieve crash reports', error as Error);
    return [];
  }
};

// Helper function to clear old crash reports
export const clearOldCrashReports = async (olderThanDays: number = 7): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const crashKeys = keys.filter((key) => key.startsWith('crash_report_'));
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    for (const key of crashKeys) {
      const timestamp = parseInt(key.replace('crash_report_', ''));
      if (timestamp < cutoffTime) {
        await AsyncStorage.removeItem(key);
      }
    }

    logInfo(`Cleared crash reports older than ${olderThanDays} days`);
  } catch (error) {
    logError('Failed to clear old crash reports', error as Error);
  }
};
