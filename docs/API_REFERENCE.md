# API Reference

This document provides comprehensive documentation for all services and APIs in the SpotOn Frontend application.

## Table of Contents

1. [Error Handler API](#error-handler-api)
2. [Performance Optimizer API](#performance-optimizer-api)
3. [Security Service API](#security-service-api)
4. [Monitoring Service API](#monitoring-service-api)
5. [Logging Service API](#logging-service-api)
6. [Accessibility Service API](#accessibility-service-api)
7. [Internationalization Service API](#internationalization-service-api)
8. [Cache Service API](#cache-service-api)
9. [React Hooks API](#react-hooks-api)
10. [Component APIs](#component-apis)

## Error Handler API

### ErrorHandlerService

**Location**: `src/services/errorHandler.ts`

#### Methods

##### `handleError(error: Error, context?: string): Promise<ErrorRecovery>`

Handles errors with automatic recovery strategies.

**Parameters:**
- `error`: The error to handle
- `context`: Optional context information

**Returns:** `Promise<ErrorRecovery>`

```typescript
const recovery = await errorHandler.handleError(error, 'API_CALL');
if (recovery.shouldRetry) {
  // Retry logic
}
```

##### `reportError(error: Error, context: string, metadata?: Record<string, any>): void`

Reports errors to monitoring systems.

**Parameters:**
- `error`: The error to report
- `context`: Error context
- `metadata`: Additional metadata

##### `getErrorStats(): ErrorStats`

Returns error statistics and metrics.

**Returns:** `ErrorStats`

```typescript
const stats = errorHandler.getErrorStats();
console.log('Error rate:', stats.errorRate);
```

## Performance Optimizer API

### PerformanceOptimizer

**Location**: `src/services/performanceOptimizer.ts`

#### Methods

##### `enableMonitoring(): void`

Enables performance monitoring.

```typescript
performanceOptimizer.enableMonitoring();
```

##### `disableMonitoring(): void`

Disables performance monitoring.

##### `getMetrics(): PerformanceMetrics`

Returns current performance metrics.

**Returns:** `PerformanceMetrics`

```typescript
const metrics = performanceOptimizer.getMetrics();
console.log('FPS:', metrics.fps);
```

##### `createVirtualList(items: T[], options: VirtualListOptions): VirtualList<T>`

Creates a virtual scrolling list for large datasets.

**Parameters:**
- `items`: Array of items to virtualize
- `options`: Virtual list configuration

**Returns:** `VirtualList<T>`

```typescript
const virtualList = performanceOptimizer.createVirtualList(items, {
  itemHeight: 50,
  containerHeight: 400,
  overscan: 5
});
```

##### `optimizeBundle(): BundleOptimization`

Analyzes and optimizes bundle size.

**Returns:** `BundleOptimization`

## Security Service API

### SecurityService

**Location**: `src/services/securityService.ts`

#### Methods

##### `sanitizeInput(input: string): string`

Sanitizes user input to prevent XSS attacks.

**Parameters:**
- `input`: The input string to sanitize

**Returns:** `string`

```typescript
const safeInput = securityService.sanitizeInput(userInput);
```

##### `validateCSRFToken(token: string): boolean`

Validates CSRF tokens.

**Parameters:**
- `token`: The CSRF token to validate

**Returns:** `boolean`

##### `generateCSRFToken(): string`

Generates a new CSRF token.

**Returns:** `string`

```typescript
const token = securityService.generateCSRFToken();
```

##### `checkRateLimit(identifier: string, action: string): boolean`

Checks rate limiting for actions.

**Parameters:**
- `identifier`: User or IP identifier
- `action`: The action being performed

**Returns:** `boolean`

##### `auditAction(action: string, metadata: Record<string, any>): void`

Logs security-relevant actions.

**Parameters:**
- `action`: The action being audited
- `metadata`: Additional context

## Monitoring Service API

### MonitoringService

**Location**: `src/services/monitoringService.ts`

#### Methods

##### `recordMetric(name: string, value: number, tags?: Record<string, string>): void`

Records a custom metric.

**Parameters:**
- `name`: Metric name
- `value`: Metric value
- `tags`: Optional tags

```typescript
monitoringService.recordMetric('user_actions', 1, {
  action: 'login',
  user_type: 'premium'
});
```

##### `startTimer(name: string): Timer`

Starts a performance timer.

**Parameters:**
- `name`: Timer name

**Returns:** `Timer`

```typescript
const timer = monitoringService.startTimer('api_call');
// ... perform operation
timer.stop();
```

##### `getHealthStatus(): HealthStatus`

Returns system health status.

**Returns:** `HealthStatus`

```typescript
const health = monitoringService.getHealthStatus();
console.log('System healthy:', health.healthy);
```

##### `createAlert(level: 'info' | 'warning' | 'error', message: string, metadata?: Record<string, any>): void`

Creates monitoring alerts.

**Parameters:**
- `level`: Alert severity level
- `message`: Alert message
- `metadata`: Additional context

## Logging Service API

### LoggingService

**Location**: `src/services/loggingService.ts`

#### Methods

##### `info(message: string, metadata?: Record<string, any>): void`

Logs informational messages.

**Parameters:**
- `message`: Log message
- `metadata`: Additional context

```typescript
loggingService.info('User logged in', {
  userId: 'user123',
  timestamp: Date.now()
});
```

##### `warn(message: string, metadata?: Record<string, any>): void`

Logs warning messages.

##### `error(message: string, error?: Error, metadata?: Record<string, any>): void`

Logs error messages.

**Parameters:**
- `message`: Error message
- `error`: Optional error object
- `metadata`: Additional context

##### `debug(message: string, metadata?: Record<string, any>): void`

Logs debug messages (only in development).

##### `setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void`

Sets the logging level.

**Parameters:**
- `level`: The minimum log level

## Accessibility Service API

### AccessibilityService

**Location**: `src/services/accessibilityService.ts`

#### Methods

##### `announce(message: string, priority?: 'polite' | 'assertive'): void`

Announces messages to screen readers.

**Parameters:**
- `message`: The message to announce
- `priority`: Announcement priority

```typescript
accessibilityService.announce('Form submitted successfully');
```

##### `toggleHighContrast(): void`

Toggles high contrast mode.

##### `increaseFontSize(): void`

Increases font size.

##### `decreaseFontSize(): void`

Decreases font size.

##### `focusElement(selector: string): void`

Focuses an element by selector.

**Parameters:**
- `selector`: CSS selector

##### `getAccessibilityFeatures(): AccessibilityFeatures[]`

Returns available accessibility features.

**Returns:** `AccessibilityFeatures[]`

##### `auditAccessibility(): Promise<AccessibilityAudit>`

Performs accessibility audit.

**Returns:** `Promise<AccessibilityAudit>`

## Internationalization Service API

### I18nService

**Location**: `src/services/i18nService.ts`

#### Methods

##### `t(key: string, options?: TranslationOptions): string`

Translates a key to the current language.

**Parameters:**
- `key`: Translation key
- `options`: Translation options

**Returns:** `string`

```typescript
const message = i18nService.t('welcome.message', {
  interpolation: { name: 'John' }
});
```

##### `changeLanguage(language: string): Promise<void>`

Changes the current language.

**Parameters:**
- `language`: Language code

**Returns:** `Promise<void>`

##### `formatDate(date: Date | number | string, options?: Intl.DateTimeFormatOptions): string`

Formats dates according to current locale.

**Parameters:**
- `date`: Date to format
- `options`: Formatting options

**Returns:** `string`

##### `formatNumber(value: number, options?: Intl.NumberFormatOptions): string`

Formats numbers according to current locale.

**Parameters:**
- `value`: Number to format
- `options`: Formatting options

**Returns:** `string`

##### `formatCurrency(value: number, currency?: string, options?: Intl.NumberFormatOptions): string`

Formats currency according to current locale.

**Parameters:**
- `value`: Currency value
- `currency`: Currency code
- `options`: Formatting options

**Returns:** `string`

## Cache Service API

### CacheService

**Location**: `src/services/cacheService.ts`

#### Methods

##### `set(key: string, value: any, ttl?: number): void`

Sets a cache entry.

**Parameters:**
- `key`: Cache key
- `value`: Value to cache
- `ttl`: Time to live in milliseconds

```typescript
cacheService.set('user:123', userData, 60000); // 1 minute TTL
```

##### `get<T>(key: string): T | null`

Gets a cache entry.

**Parameters:**
- `key`: Cache key

**Returns:** `T | null`

##### `delete(key: string): boolean`

Deletes a cache entry.

**Parameters:**
- `key`: Cache key

**Returns:** `boolean`

##### `clear(): void`

Clears all cache entries.

##### `getStats(): CacheStats`

Returns cache statistics.

**Returns:** `CacheStats`

## React Hooks API

### useI18n

**Location**: `src/hooks/useI18n.ts`

Returns internationalization utilities.

**Returns:** `UseI18nReturn`

```typescript
const { t, language, changeLanguage, formatDate } = useI18n();
```

### useTranslation

**Location**: `src/hooks/useI18n.ts`

Returns translation utilities for a specific namespace.

**Parameters:**
- `namespace`: Optional namespace

**Returns:** `UseTranslationReturn`

```typescript
const { t } = useTranslation('navigation');
```

### useLocale

**Location**: `src/hooks/useI18n.ts`

Returns locale-specific utilities.

**Returns:** `UseLocaleReturn`

```typescript
const { locale, direction, formatNumber } = useLocale();
```

### useFormatters

**Location**: `src/hooks/useI18n.ts`

Returns formatting utilities.

**Returns:** `UseFormattersReturn`

```typescript
const { formatDate, formatCurrency, formatFileSize } = useFormatters();
```

## Component APIs

### LanguageSwitcher

**Location**: `src/components/i18n/LanguageSwitcher.tsx`

#### Props

```typescript
interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'select' | 'buttons';
  showNativeNames?: boolean;
  showFlags?: boolean;
  compact?: boolean;
  className?: string;
  ariaLabel?: string;
}
```

#### Usage

```typescript
<LanguageSwitcher 
  variant="dropdown"
  showNativeNames={true}
  showFlags={true}
  compact={false}
/>
```

### TranslationProvider

**Location**: `src/components/i18n/TranslationProvider.tsx`

#### Props

```typescript
interface TranslationProviderProps {
  children: ReactNode;
  initialLanguage?: string;
  loadingComponent?: React.ComponentType;
  fallbackComponent?: React.ComponentType<{ error: Error }>;
}
```

#### Usage

```typescript
<TranslationProvider initialLanguage="en">
  <App />
</TranslationProvider>
```

### Trans

**Location**: `src/components/i18n/Trans.tsx`

#### Props

```typescript
interface TransProps {
  i18nKey: string;
  namespace?: string;
  count?: number;
  context?: string;
  values?: Record<string, any>;
  components?: Record<string, ReactNode>;
  defaults?: string;
  parent?: string | React.ComponentType<any>;
  className?: string;
  style?: React.CSSProperties;
}
```

#### Usage

```typescript
<Trans 
  i18nKey="welcome.message"
  values={{ name: 'John' }}
  components={{ 
    bold: <strong />,
    link: <a href="/profile" />
  }}
/>
```

## Type Definitions

### Common Types

```typescript
// Error handling
interface ErrorRecovery {
  shouldRetry: boolean;
  retryAfter?: number;
  fallbackAction?: () => void;
  userMessage?: string;
}

// Performance metrics
interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  loadTime: number;
  renderTime: number;
  scriptTime: number;
}

// Security audit
interface SecurityViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  timestamp: number;
}

// Accessibility features
interface AccessibilityFeatures {
  id: string;
  name: string;
  description: string;
  category: 'visual' | 'auditory' | 'motor' | 'cognitive';
  wcagLevel: 'A' | 'AA' | 'AAA';
  enabled: boolean;
}

// Translation options
interface TranslationOptions {
  count?: number;
  context?: string;
  defaultValue?: string;
  interpolation?: Record<string, any>;
  namespace?: string;
  lng?: string;
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
}
```

## Error Codes

### API Error Codes

```typescript
enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN'
}
```

### Security Error Codes

```typescript
enum SecurityErrorCode {
  XSS_DETECTED = 'XSS_DETECTED',
  CSRF_TOKEN_INVALID = 'CSRF_TOKEN_INVALID',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED_ACTION = 'UNAUTHORIZED_ACTION'
}
```

## Configuration

### Environment Variables

```typescript
interface EnvironmentConfig {
  // API Configuration
  REACT_APP_API_URL: string;
  REACT_APP_WS_URL: string;
  
  // Authentication
  REACT_APP_AUTH_DOMAIN: string;
  REACT_APP_CLIENT_ID: string;
  
  // Monitoring
  REACT_APP_MONITORING_ENDPOINT: string;
  REACT_APP_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  
  // Features
  REACT_APP_ENABLE_ANALYTICS: string;
  REACT_APP_ENABLE_WEBSOCKETS: string;
  REACT_APP_ENABLE_PWA: string;
}
```

### Service Configuration

```typescript
interface ServiceConfig {
  errorHandler: ErrorHandlerConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  logging: LoggingConfig;
  accessibility: AccessibilityConfig;
  i18n: I18nConfig;
  cache: CacheConfig;
}
```

## Best Practices

### Error Handling

```typescript
// Good: Proper error handling with context
try {
  const data = await apiCall();
  return data;
} catch (error) {
  const recovery = await errorHandler.handleError(error, 'API_CALL');
  if (recovery.shouldRetry) {
    return await apiCall();
  }
  throw error;
}
```

### Performance Optimization

```typescript
// Good: Use virtual scrolling for large lists
const VirtualizedList = ({ items }) => {
  const virtualList = useMemo(() => 
    performanceOptimizer.createVirtualList(items, {
      itemHeight: 50,
      containerHeight: 400
    }), [items]);
  
  return <div>{virtualList.render()}</div>;
};
```

### Security

```typescript
// Good: Always sanitize user input
const handleSubmit = (formData) => {
  const sanitizedData = Object.entries(formData).reduce((acc, [key, value]) => {
    acc[key] = securityService.sanitizeInput(value);
    return acc;
  }, {});
  
  // Process sanitized data
};
```

### Accessibility

```typescript
// Good: Announce important changes
const handleFormSubmit = async (data) => {
  try {
    await submitForm(data);
    accessibilityService.announce('Form submitted successfully');
  } catch (error) {
    accessibilityService.announce('Form submission failed', 'assertive');
  }
};
```

### Internationalization

```typescript
// Good: Use translation hooks
const MyComponent = () => {
  const { t, formatDate } = useI18n();
  
  return (
    <div>
      <h1>{t('page.title')}</h1>
      <p>{t('page.description', { name: 'John' })}</p>
      <time>{formatDate(new Date())}</time>
    </div>
  );
};
```

This API reference provides comprehensive documentation for all services and their usage patterns. For more detailed examples and advanced usage, refer to the service implementation files and their inline documentation.