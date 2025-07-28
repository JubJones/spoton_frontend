import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { i18nService, I18nContext } from '../../services/i18nService';

interface TranslationProviderProps {
  children: ReactNode;
  initialLanguage?: string;
  loadingComponent?: React.ComponentType;
  fallbackComponent?: React.ComponentType<{ error: Error }>;
}

interface TranslationContextValue {
  context: I18nContext;
  isReady: boolean;
  error: Error | null;
  loadNamespace: (namespace: string) => Promise<void>;
  loadedNamespaces: string[];
}

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

export const useTranslationContext = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslationContext must be used within a TranslationProvider');
  }
  return context;
};

const LoadingComponent: React.FC = () => (
  <div className="translation-loading" aria-live="polite">
    <div className="loading-spinner" aria-hidden="true"></div>
    <span>Loading translations...</span>
  </div>
);

const ErrorComponent: React.FC<{ error: Error }> = ({ error }) => (
  <div className="translation-error" role="alert">
    <h2>Translation Error</h2>
    <p>Failed to load translations: {error.message}</p>
    <button onClick={() => window.location.reload()}>
      Retry
    </button>
  </div>
);

export const TranslationProvider: React.FC<TranslationProviderProps> = ({
  children,
  initialLanguage,
  loadingComponent: LoadingComponent = LoadingComponent,
  fallbackComponent: FallbackComponent = ErrorComponent
}) => {
  const [context, setContext] = useState<I18nContext>(i18nService.getContext());
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadedNamespaces, setLoadedNamespaces] = useState<string[]>([]);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Set initial language if provided
        if (initialLanguage) {
          await i18nService.changeLanguage(initialLanguage);
        }

        // Load default namespaces
        await loadNamespace('common');
        await loadNamespace('errors');
        await loadNamespace('accessibility');
        await loadNamespace('navigation');

        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize translations'));
      }
    };

    initialize();
  }, [initialLanguage]);

  useEffect(() => {
    const unsubscribe = i18nService.subscribe((newContext) => {
      setContext(newContext);
    });

    return unsubscribe;
  }, []);

  const loadNamespace = async (namespace: string) => {
    try {
      await i18nService.loadTranslations(context.language, namespace);
      setLoadedNamespaces(prev => [...new Set([...prev, namespace])]);
    } catch (err) {
      console.error(`Failed to load namespace ${namespace}:`, err);
      // Don't throw error for namespace loading failures
    }
  };

  const contextValue: TranslationContextValue = {
    context,
    isReady,
    error,
    loadNamespace,
    loadedNamespaces
  };

  if (error) {
    return <FallbackComponent error={error} />;
  }

  if (!isReady) {
    return <LoadingComponent />;
  }

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
};

export default TranslationProvider;