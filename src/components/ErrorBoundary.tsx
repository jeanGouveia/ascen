import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { C_light } from '../styles/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Prevent infinite loop by checking if we're already in error state
    if (this.state.hasError) {
      return;
    }

    this.setState({
      error,
      errorInfo,
    });

    // Log error to console for debugging
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Send to Sentry if available
    try {
      if (typeof global !== 'undefined' && (global as any).Sentry) {
        (global as any).Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        });
      }
    } catch (e) {
      // Prevent ErrorBoundary from crashing due to Sentry failure
      // eslint-disable-next-line no-console
      console.error('Failed to send error to Sentry:', e);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleCloseApp = () => {
    // On mobile, we can't programmatically close the app
    // We'll show a message to the user
    if (Platform.OS === 'web') {
      window.close();
    }
  };

  handleSendReport = async () => {
    const { error, errorInfo } = this.state;
    const errorDetails = `
Error: ${error?.message}
Stack: ${error?.stack}

Component Stack:
${errorInfo?.componentStack}
    `.trim();

    const subject = encodeURIComponent('Ascen App Error Report');
    const body = encodeURIComponent(errorDetails);
    const mailtoUrl = `mailto:support@example.com?subject=${subject}&body=${body}`;

    try {
      await Linking.openURL(mailtoUrl);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to open email client:', e);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>⚠️</Text>
            </View>

            <Text style={styles.title}>Ops! Algo deu errado</Text>
            <Text style={styles.message}>
              O aplicativo encontrou um erro inesperado. Nossa equipe foi notificada e estamos trabalhando para resolver o problema.
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.primaryButton} onPress={this.handleRetry}>
                <Text style={styles.primaryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={this.handleSendReport}>
                <Text style={styles.secondaryButtonText}>Enviar diagnóstico</Text>
              </TouchableOpacity>

              {Platform.OS === 'web' && (
                <TouchableOpacity style={styles.tertiaryButton} onPress={this.handleCloseApp}>
                  <Text style={styles.tertiaryButtonText}>Fechar aplicativo</Text>
                </TouchableOpacity>
              )}
            </View>

            {__DEV__ && this.state.error && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Detalhes do erro (desenvolvimento):</Text>
                <Text style={styles.debugText}>{this.state.error.toString()}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.debugText}>{this.state.errorInfo.componentStack}</Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C_light.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: C_light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: C_light.textMid,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    maxWidth: 320,
  },
  primaryButton: {
    backgroundColor: C_light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: C_light.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C_light.border,
  },
  secondaryButtonText: {
    color: C_light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    color: C_light.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  debugContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: C_light.card,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C_light.text,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: C_light.textMid,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
