import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    // eslint-disable-next-line no-console
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    // Sample rate for performance monitoring (0 to 1)
    tracesSampleRate: __DEV__ ? 0 : 0.1,
    // Enable automatic error tracking
    enableAutoSessionTracking: true,
    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter(breadcrumb => {
          const message = breadcrumb.message?.toLowerCase() || '';
          const data = JSON.stringify(breadcrumb.data || {}).toLowerCase();
          
          // Filter out breadcrumbs containing sensitive info
          const sensitiveKeywords = [
            'password',
            'token',
            'secret',
            'credit',
            'card',
            'cpf',
            'email',
            'phone',
            'address',
          ];
          
          const hasSensitive = sensitiveKeywords.some(keyword => 
            message.includes(keyword) || data.includes(keyword)
          );
          
          return !hasSensitive;
        });
      }

      // Remove sensitive data from request data
      if (event.request?.data && typeof event.request.data === 'object') {
        const requestData = event.request.data as Record<string, unknown>;
        const sensitiveKeys = ['password', 'token', 'secret', 'creditCard', 'cpf', 'email', 'phone'];
        Object.keys(requestData).forEach(key => {
          if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
            delete requestData[key];
          }
        });
      }

      return event;
    },
    // Attach context about the app
    initialScope: {
      tags: {
        appVersion: Constants.expoConfig?.version || 'unknown',
        platform: Platform.OS,
        osVersion: Platform.Version as string,
      },
      user: {
        id: 'anonymous',
      },
    },
  });

  // Set up global error handlers
  setupGlobalHandlers();
}

function setupGlobalHandlers() {
  // Capture unhandled promise rejections
  // @ts-ignore - ErrorUtils is React Native specific
  const defaultPromiseRejectionHandler = global.ErrorUtils?.getGlobalHandler?.();
  
  // @ts-ignore - ErrorUtils is React Native specific
  if (global.ErrorUtils) {
    // @ts-ignore - ErrorUtils is React Native specific
    global.ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      Sentry.captureException(error, {
        level: isFatal ? 'fatal' : 'error',
        tags: {
          isFatal: String(isFatal),
        },
      });
      
      // Call the default handler
      if (defaultPromiseRejectionHandler) {
        defaultPromiseRejectionHandler(error, isFatal);
      }
    });
  }
}

export function setUserContext(userId: string | null, familyId: string | null) {
  if (!SENTRY_DSN) return;

  Sentry.setUser(
    userId
      ? {
          id: userId,
          // Only include non-sensitive identifiers
          ...(familyId && { familyId }),
        }
      : null
  );
}

export function logError(error: Error, context?: Record<string, any>) {
  if (!SENTRY_DSN) {
    // eslint-disable-next-line no-console
    console.error('Error:', error, context);
    return;
  }

  // Filter sensitive data from context
  const filteredContext = filterSensitiveData(context);

  Sentry.captureException(error, {
    extra: filteredContext,
  });
}

function filterSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = [
    'email', 'name', 'fullName', 'email_lower',
    'password', 'token', 'secret', 'creditCard', 'cpf', 'phone',
    'amount', 'target', 'current', 'balance',
    'goal', 'transaction', 'transactions',
    'goalId', 'goal_id', 'categoryId', 'category_id',
    'recurringRuleId', 'recurring_rule_id',
    'description', 'category', 'categoryIcon', 'categoryColor',
  ];

  if (Array.isArray(data)) {
    return data.map(item => filterSensitiveData(item));
  }

  const filtered: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const keyLower = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sk => keyLower.includes(sk));
      
      if (isSensitive) {
        filtered[key] = '[REDACTED]';
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        filtered[key] = filterSensitiveData(data[key]);
      } else {
        filtered[key] = data[key];
      }
    }
  }

  return filtered;
}

export function logMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
  if (!SENTRY_DSN) {
    // eslint-disable-next-line no-console
    console.log(`[${level.toUpperCase()}]`, message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}
