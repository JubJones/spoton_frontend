// src/components/accessibility/AccessibilityProvider.tsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  focusVisible: boolean;
  screenReaderAnnouncements: boolean;
  keyboardNavigation: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: (key: keyof AccessibilitySettings, value: boolean) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  getFocusableElements: (container?: HTMLElement) => HTMLElement[];
  trapFocus: (container: HTMLElement) => () => void;
  skipToContent: () => void;
}

const defaultSettings: AccessibilitySettings = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  focusVisible: true,
  screenReaderAnnouncements: true,
  keyboardNavigation: true,
};

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Load from localStorage and respect system preferences
    const saved = localStorage.getItem('spotOnAccessibility');
    const savedSettings = saved ? JSON.parse(saved) : {};

    // Check system preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

    return {
      ...defaultSettings,
      ...savedSettings,
      reduceMotion: savedSettings.reduceMotion ?? prefersReducedMotion,
      highContrast: savedSettings.highContrast ?? prefersHighContrast,
    };
  });

  // Create live region for screen reader announcements
  const [liveRegion, setLiveRegion] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const region = document.createElement('div');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.style.position = 'absolute';
    region.style.left = '-10000px';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';

    document.body.appendChild(region);
    setLiveRegion(region);

    return () => {
      if (document.body.contains(region)) {
        document.body.removeChild(region);
      }
    };
  }, []);

  // Update settings and save to localStorage
  const updateSetting = useCallback((key: keyof AccessibilitySettings, value: boolean) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      localStorage.setItem('spotOnAccessibility', JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  // Screen reader announcements
  const announceToScreenReader = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      if (!settings.screenReaderAnnouncements || !liveRegion) return;

      // Clear previous announcement
      liveRegion.textContent = '';
      liveRegion.setAttribute('aria-live', priority);

      // Add new announcement after a brief delay to ensure it's picked up
      setTimeout(() => {
        liveRegion.textContent = message;
      }, 100);

      // Clear after announcement to avoid repetition
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 5000);
    },
    [settings.screenReaderAnnouncements, liveRegion]
  );

  // Get focusable elements in a container
  const getFocusableElements = useCallback(
    (container: HTMLElement = document.body): HTMLElement[] => {
      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
        '[role="button"]:not([disabled])',
        '[role="checkbox"]:not([disabled])',
        '[role="menuitem"]:not([disabled])',
        '[role="option"]:not([disabled])',
        '[contenteditable="true"]',
      ].join(', ');

      const elements = Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));

      return elements.filter((el) => {
        // Check if element is visible and not hidden
        const style = window.getComputedStyle(el);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          el.offsetWidth > 0 &&
          el.offsetHeight > 0
        );
      });
    },
    []
  );

  // Focus trap for modals and overlays
  const trapFocus = useCallback(
    (container: HTMLElement) => {
      const focusableElements = getFocusableElements(container);

      if (focusableElements.length === 0) return () => {};

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      container.addEventListener('keydown', handleKeyDown);
      firstElement.focus();

      return () => {
        container.removeEventListener('keydown', handleKeyDown);
      };
    },
    [getFocusableElements]
  );

  // Skip to main content
  const skipToContent = useCallback(() => {
    const mainContent = document.querySelector('main, [role="main"], #main-content');
    if (mainContent && mainContent instanceof HTMLElement) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      announceToScreenReader('Jumped to main content');
    }
  }, [announceToScreenReader]);

  // Apply accessibility classes to document
  useEffect(() => {
    const { classList } = document.documentElement;

    // Apply settings as CSS classes
    classList.toggle('reduce-motion', settings.reduceMotion);
    classList.toggle('high-contrast', settings.highContrast);
    classList.toggle('large-text', settings.largeText);
    classList.toggle('focus-visible', settings.focusVisible);

    // Update CSS custom properties
    document.documentElement.style.setProperty(
      '--focus-ring-color',
      settings.highContrast ? '#ffff00' : '#f97316'
    );

    document.documentElement.style.setProperty(
      '--focus-ring-width',
      settings.focusVisible ? '3px' : '2px'
    );
  }, [settings]);

  // Global keyboard shortcuts
  useEffect(() => {
    if (!settings.keyboardNavigation) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Skip to content (Alt + 1)
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        skipToContent();
      }

      // Toggle high contrast (Alt + Shift + H)
      if (e.altKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        updateSetting('highContrast', !settings.highContrast);
        announceToScreenReader(`High contrast ${settings.highContrast ? 'disabled' : 'enabled'}`);
      }

      // Toggle large text (Alt + Shift + T)
      if (e.altKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        updateSetting('largeText', !settings.largeText);
        announceToScreenReader(`Large text ${settings.largeText ? 'disabled' : 'enabled'}`);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [settings, updateSetting, announceToScreenReader, skipToContent]);

  const value: AccessibilityContextType = {
    settings,
    updateSetting,
    announceToScreenReader,
    getFocusableElements,
    trapFocus,
    skipToContent,
  };

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
};

// Hook to use accessibility context
export function useAccessibility(): AccessibilityContextType {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

// Skip link component
interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ href, children, className = '' }) => {
  return (
    <a
      href={href}
      className={`
        absolute top-0 left-0 transform -translate-y-full
        focus:translate-y-0 focus:z-50
        bg-orange-500 text-white px-4 py-2 rounded-br-lg
        transition-transform duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2
        ${className}
      `}
      onFocus={(e) => {
        // Ensure the skip link is visible when focused
        e.currentTarget.scrollIntoView({ block: 'center' });
      }}
    >
      {children}
    </a>
  );
};

// Screen reader only content
interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
}

export const ScreenReaderOnly: React.FC<ScreenReaderOnlyProps> = ({
  children,
  as: Component = 'span',
  className = '',
}) => {
  return (
    <Component
      className={`
        absolute left-[-10000px] w-[1px] h-[1px] overflow-hidden
        ${className}
      `}
    >
      {children}
    </Component>
  );
};
