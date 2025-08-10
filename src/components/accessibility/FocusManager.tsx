// src/components/accessibility/FocusManager.tsx
import React, { useRef, useEffect, useCallback } from 'react';
import { useAccessibility } from './AccessibilityProvider';

interface FocusManagerProps {
  children: React.ReactNode;
  autoFocus?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
  className?: string;
}

export const FocusManager: React.FC<FocusManagerProps> = ({
  children,
  autoFocus = false,
  restoreFocus = false,
  trapFocus = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { trapFocus: trapFocusUtil, getFocusableElements } = useAccessibility();

  // Store previous focus when component mounts
  useEffect(() => {
    if (restoreFocus || trapFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [restoreFocus, trapFocus]);

  // Auto focus first focusable element
  useEffect(() => {
    if (autoFocus && containerRef.current) {
      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }, [autoFocus, getFocusableElements]);

  // Set up focus trap
  useEffect(() => {
    if (trapFocus && containerRef.current) {
      const cleanup = trapFocusUtil(containerRef.current);
      return cleanup;
    }
  }, [trapFocus, trapFocusUtil]);

  // Restore focus when component unmounts
  useEffect(() => {
    return () => {
      if (restoreFocus && previousFocusRef.current) {
        try {
          previousFocusRef.current.focus();
        } catch (error) {
          console.warn('Could not restore focus:', error);
        }
      }
    };
  }, [restoreFocus]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

// Hook for managing focus within a component
export function useFocusManagement() {
  const { getFocusableElements, announceToScreenReader } = useAccessibility();

  const focusFirst = useCallback(
    (container: HTMLElement) => {
      const focusableElements = getFocusableElements(container);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
        return true;
      }
      return false;
    },
    [getFocusableElements]
  );

  const focusLast = useCallback(
    (container: HTMLElement) => {
      const focusableElements = getFocusableElements(container);
      if (focusableElements.length > 0) {
        focusableElements[focusableElements.length - 1].focus();
        return true;
      }
      return false;
    },
    [getFocusableElements]
  );

  const focusNext = useCallback(
    (currentElement?: HTMLElement) => {
      const current = currentElement || document.activeElement;
      if (!current || !(current instanceof HTMLElement)) return false;

      const container = current.closest('[data-focus-scope]') || document.body;
      const focusableElements = getFocusableElements(container as HTMLElement);
      const currentIndex = focusableElements.indexOf(current);

      if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
        focusableElements[currentIndex + 1].focus();
        return true;
      }

      return false;
    },
    [getFocusableElements]
  );

  const focusPrevious = useCallback(
    (currentElement?: HTMLElement) => {
      const current = currentElement || document.activeElement;
      if (!current || !(current instanceof HTMLElement)) return false;

      const container = current.closest('[data-focus-scope]') || document.body;
      const focusableElements = getFocusableElements(container as HTMLElement);
      const currentIndex = focusableElements.indexOf(current);

      if (currentIndex > 0) {
        focusableElements[currentIndex - 1].focus();
        return true;
      }

      return false;
    },
    [getFocusableElements]
  );

  const announceFocus = useCallback(
    (element: HTMLElement) => {
      const label =
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.textContent ||
        element.getAttribute('placeholder') ||
        'Interactive element';

      const role = element.getAttribute('role') || element.tagName.toLowerCase();
      announceToScreenReader(`Focused on ${role}: ${label}`);
    },
    [announceToScreenReader]
  );

  return {
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    announceFocus,
  };
}

// Roving tabindex manager for complex widgets
interface RovingTabindexProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical' | 'both';
  wrap?: boolean;
  className?: string;
}

export const RovingTabindex: React.FC<RovingTabindexProps> = ({
  children,
  orientation = 'both',
  wrap = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { getFocusableElements } = useAccessibility();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!containerRef.current) return;

      const focusableElements = getFocusableElements(containerRef.current);
      const currentIndex = focusableElements.findIndex((el) => el === document.activeElement);

      if (currentIndex === -1) return;

      let targetIndex = currentIndex;
      let handled = false;

      switch (e.key) {
        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'both') {
            targetIndex = currentIndex + 1;
            if (targetIndex >= focusableElements.length && wrap) {
              targetIndex = 0;
            }
            handled = true;
          }
          break;

        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'both') {
            targetIndex = currentIndex - 1;
            if (targetIndex < 0 && wrap) {
              targetIndex = focusableElements.length - 1;
            }
            handled = true;
          }
          break;

        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'both') {
            targetIndex = currentIndex + 1;
            if (targetIndex >= focusableElements.length && wrap) {
              targetIndex = 0;
            }
            handled = true;
          }
          break;

        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'both') {
            targetIndex = currentIndex - 1;
            if (targetIndex < 0 && wrap) {
              targetIndex = focusableElements.length - 1;
            }
            handled = true;
          }
          break;

        case 'Home':
          targetIndex = 0;
          handled = true;
          break;

        case 'End':
          targetIndex = focusableElements.length - 1;
          handled = true;
          break;
      }

      if (handled && targetIndex >= 0 && targetIndex < focusableElements.length) {
        e.preventDefault();

        // Update tabindex values
        focusableElements.forEach((el, index) => {
          el.tabIndex = index === targetIndex ? 0 : -1;
        });

        // Focus the target element
        focusableElements[targetIndex].focus();
      }
    },
    [orientation, wrap, getFocusableElements]
  );

  // Initialize tabindex values
  useEffect(() => {
    if (containerRef.current) {
      const focusableElements = getFocusableElements(containerRef.current);
      focusableElements.forEach((el, index) => {
        el.tabIndex = index === 0 ? 0 : -1;
      });
    }
  }, [children, getFocusableElements]);

  return (
    <div ref={containerRef} className={className} onKeyDown={handleKeyDown} data-focus-scope>
      {children}
    </div>
  );
};
