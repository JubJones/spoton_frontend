import { useState, useEffect, useCallback } from 'react';
import { i18nService, I18nContext, TranslationOptions } from '../services/i18nService';

export interface UseI18nReturn {
  t: (key: string, options?: TranslationOptions) => string;
  language: string;
  context: I18nContext;
  changeLanguage: (language: string) => Promise<void>;
  supportedLanguages: string[];
  isLanguageSupported: (language: string) => boolean;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
  formatRelativeTime: (date: Date | number | string, options?: Intl.RelativeTimeFormatOptions) => string;
  sortStrings: (strings: string[], options?: Intl.CollatorOptions) => string[];
  isRtl: boolean;
  direction: 'ltr' | 'rtl';
}

export const useI18n = (): UseI18nReturn => {
  const [language, setLanguage] = useState(i18nService.getCurrentLanguage());
  const [context, setContext] = useState(i18nService.getContext());

  useEffect(() => {
    const unsubscribe = i18nService.subscribe((newContext) => {
      setLanguage(newContext.language);
      setContext(newContext);
    });

    return unsubscribe;
  }, []);

  const t = useCallback((key: string, options?: TranslationOptions) => {
    return i18nService.t(key, options);
  }, []);

  const changeLanguage = useCallback(async (lang: string) => {
    await i18nService.changeLanguage(lang);
  }, []);

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return i18nService.formatNumber(value, options);
  }, []);

  const formatDate = useCallback((date: Date | number | string, options?: Intl.DateTimeFormatOptions) => {
    return i18nService.formatDate(date, options);
  }, []);

  const formatTime = useCallback((date: Date | number | string, options?: Intl.DateTimeFormatOptions) => {
    return i18nService.formatTime(date, options);
  }, []);

  const formatCurrency = useCallback((value: number, currency?: string, options?: Intl.NumberFormatOptions) => {
    return i18nService.formatCurrency(value, currency, options);
  }, []);

  const formatRelativeTime = useCallback((date: Date | number | string, options?: Intl.RelativeTimeFormatOptions) => {
    return i18nService.formatRelativeTime(date, options);
  }, []);

  const sortStrings = useCallback((strings: string[], options?: Intl.CollatorOptions) => {
    return i18nService.sortStrings(strings, options);
  }, []);

  return {
    t,
    language,
    context,
    changeLanguage,
    supportedLanguages: i18nService.getSupportedLanguages(),
    isLanguageSupported: i18nService.isLanguageSupported.bind(i18nService),
    formatNumber,
    formatDate,
    formatTime,
    formatCurrency,
    formatRelativeTime,
    sortStrings,
    isRtl: context.direction === 'rtl',
    direction: context.direction
  };
};

export interface UseTranslationReturn {
  t: (key: string, options?: TranslationOptions) => string;
  i18n: {
    language: string;
    changeLanguage: (language: string) => Promise<void>;
    languages: string[];
  };
}

export const useTranslation = (namespace?: string): UseTranslationReturn => {
  const { t: originalT, language, changeLanguage, supportedLanguages } = useI18n();

  const t = useCallback((key: string, options?: TranslationOptions) => {
    return originalT(key, { ...options, namespace: namespace || options?.namespace });
  }, [originalT, namespace]);

  return {
    t,
    i18n: {
      language,
      changeLanguage,
      languages: supportedLanguages
    }
  };
};

export interface UseLocaleReturn {
  locale: string;
  direction: 'ltr' | 'rtl';
  isRtl: boolean;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
  formatRelativeTime: (date: Date | number | string, options?: Intl.RelativeTimeFormatOptions) => string;
  sortStrings: (strings: string[], options?: Intl.CollatorOptions) => string[];
  context: I18nContext;
}

export const useLocale = (): UseLocaleReturn => {
  const { 
    language, 
    context, 
    formatNumber, 
    formatDate, 
    formatTime, 
    formatCurrency, 
    formatRelativeTime,
    sortStrings,
    isRtl,
    direction
  } = useI18n();

  return {
    locale: language,
    direction,
    isRtl,
    formatNumber,
    formatDate,
    formatTime,
    formatCurrency,
    formatRelativeTime,
    sortStrings,
    context
  };
};

export interface UseRtlReturn {
  isRtl: boolean;
  direction: 'ltr' | 'rtl';
  rtlProps: {
    dir: 'ltr' | 'rtl';
    'data-direction': 'ltr' | 'rtl';
  };
}

export const useRtl = (): UseRtlReturn => {
  const { isRtl, direction } = useI18n();

  return {
    isRtl,
    direction,
    rtlProps: {
      dir: direction,
      'data-direction': direction
    }
  };
};

export interface UseLanguageSwitcherReturn {
  currentLanguage: string;
  availableLanguages: { code: string; name: string; nativeName: string }[];
  changeLanguage: (language: string) => Promise<void>;
  isLanguageSupported: (language: string) => boolean;
}

export const useLanguageSwitcher = (): UseLanguageSwitcherReturn => {
  const { language, changeLanguage, supportedLanguages, isLanguageSupported } = useI18n();

  const languageNames: Record<string, { name: string; nativeName: string }> = {
    en: { name: 'English', nativeName: 'English' },
    es: { name: 'Spanish', nativeName: 'Español' },
    fr: { name: 'French', nativeName: 'Français' },
    de: { name: 'German', nativeName: 'Deutsch' },
    ja: { name: 'Japanese', nativeName: '日本語' },
    zh: { name: 'Chinese', nativeName: '中文' },
    ar: { name: 'Arabic', nativeName: 'العربية' },
    ru: { name: 'Russian', nativeName: 'Русский' },
    pt: { name: 'Portuguese', nativeName: 'Português' },
    it: { name: 'Italian', nativeName: 'Italiano' }
  };

  const availableLanguages = supportedLanguages.map(code => ({
    code,
    name: languageNames[code]?.name || code,
    nativeName: languageNames[code]?.nativeName || code
  }));

  return {
    currentLanguage: language,
    availableLanguages,
    changeLanguage,
    isLanguageSupported
  };
};

export interface UseFormattersReturn {
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
  formatRelativeTime: (date: Date | number | string, options?: Intl.RelativeTimeFormatOptions) => string;
  formatPercentage: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatFileSize: (bytes: number) => string;
  formatDuration: (seconds: number) => string;
  sortStrings: (strings: string[], options?: Intl.CollatorOptions) => string[];
}

export const useFormatters = (): UseFormattersReturn => {
  const { 
    formatNumber, 
    formatDate, 
    formatTime, 
    formatCurrency, 
    formatRelativeTime,
    sortStrings,
    language
  } = useI18n();

  const formatPercentage = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return formatNumber(value, { style: 'percent', ...options });
  }, [formatNumber]);

  const formatFileSize = useCallback((bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${formatNumber(size, { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
  }, [formatNumber]);

  const formatDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }, []);

  return {
    formatNumber,
    formatDate,
    formatTime,
    formatCurrency,
    formatRelativeTime,
    formatPercentage,
    formatFileSize,
    formatDuration,
    sortStrings
  };
};